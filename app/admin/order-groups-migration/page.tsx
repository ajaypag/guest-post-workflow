'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { CheckCircle, AlertCircle, Database, Play } from 'lucide-react';

export default function OrderGroupsMigrationPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const migrationSteps = [
    {
      name: 'Check existing schema',
      description: 'Verify current order_groups table structure',
      endpoint: '/api/admin/check-order-groups-schema'
    },
    {
      name: 'Add bulk_analysis_project_id column',
      description: 'Add column to link order groups to bulk analysis projects',
      endpoint: '/api/admin/migrate-order-groups-bulk-analysis'
    },
    {
      name: 'Create index',
      description: 'Add index for better query performance',
      endpoint: '/api/admin/create-order-groups-index'
    },
    {
      name: 'Verify migration',
      description: 'Confirm all changes were applied successfully',
      endpoint: '/api/admin/verify-order-groups-migration'
    }
  ];

  const runMigration = async () => {
    setLoading(true);
    setResults([]);
    
    for (let i = 0; i < migrationSteps.length; i++) {
      setCurrentStep(i);
      const step = migrationSteps[i];
      
      try {
        const response = await fetch(step.endpoint);
        const data = await response.json();
        
        setResults(prev => [...prev, {
          step: step.name,
          success: response.ok,
          data,
          status: response.status
        }]);
        
        if (!response.ok && response.status !== 409) {
          // Stop on error unless it's a "already exists" error
          break;
        }
      } catch (error: any) {
        setResults(prev => [...prev, {
          step: step.name,
          success: false,
          error: error.message
        }]);
        break;
      }
    }
    
    setLoading(false);
    setCurrentStep(0);
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Order Groups Migration
              </h1>
              <p className="text-gray-600">
                Add bulk_analysis_project_id column to order_groups table for Phase 2 integration
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Database className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Migration Details:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Adds bulk_analysis_project_id column (UUID, nullable)</li>
                    <li>Creates foreign key reference to bulk_analysis_projects table</li>
                    <li>Adds index for performance optimization</li>
                    <li>Safe to run multiple times (idempotent)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Migration Steps */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Migration Steps</h2>
              <div className="space-y-2">
                {migrationSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      currentStep === index && loading
                        ? 'border-blue-300 bg-blue-50'
                        : results.find(r => r.step === step.name)?.success
                        ? 'border-green-300 bg-green-50'
                        : results.find(r => r.step === step.name)?.success === false
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{step.name}</h3>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      {results.find(r => r.step === step.name)?.success && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {results.find(r => r.step === step.name)?.success === false && (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={runMigration}
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Running Migration...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Migration
                </>
              )}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Results</h2>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.success
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{result.step}</h3>
                          <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                            {JSON.stringify(result.data || result.error, null, 2)}
                          </pre>
                        </div>
                        <div className="ml-3">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}