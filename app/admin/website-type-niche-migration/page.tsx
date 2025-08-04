'use client';

import { useState } from 'react';
import { ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle, Database, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export default function WebsiteTypeNicheMigrationPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<MigrationStep[]>([
    {
      id: 'check-columns',
      name: 'Check Existing Columns',
      description: 'Verify current website table schema',
      status: 'pending'
    },
    {
      id: 'add-columns',
      name: 'Add New Columns',
      description: 'Add website_type and niche columns to websites table',
      status: 'pending'
    },
    {
      id: 'create-indexes',
      name: 'Create Indexes',
      description: 'Create GIN indexes for efficient array filtering',
      status: 'pending'
    },
    {
      id: 'verify-migration',
      name: 'Verify Migration',
      description: 'Confirm columns were added successfully',
      status: 'pending'
    }
  ]);

  const updateStep = (stepId: string, updates: Partial<MigrationStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const runMigration = async () => {
    setIsRunning(true);
    
    try {
      // Step 1: Check existing columns
      updateStep('check-columns', { status: 'running' });
      
      const checkResponse = await fetch('/api/admin/website-type-niche-migration/check', {
        method: 'POST'
      });
      const checkResult = await checkResponse.json();
      
      if (!checkResponse.ok) {
        updateStep('check-columns', { 
          status: 'failed', 
          error: checkResult.error || 'Failed to check columns' 
        });
        return;
      }
      
      updateStep('check-columns', { 
        status: 'completed', 
        result: `Found ${checkResult.existingColumns.length} existing columns. Website Type: ${checkResult.hasWebsiteType ? 'exists' : 'missing'}, Niche: ${checkResult.hasNiche ? 'exists' : 'missing'}` 
      });

      // Step 2: Add columns
      updateStep('add-columns', { status: 'running' });
      
      const addResponse = await fetch('/api/admin/website-type-niche-migration/migrate', {
        method: 'POST'
      });
      const addResult = await addResponse.json();
      
      if (!addResponse.ok) {
        updateStep('add-columns', { 
          status: 'failed', 
          error: addResult.error || 'Failed to add columns' 
        });
        return;
      }
      
      updateStep('add-columns', { 
        status: 'completed', 
        result: addResult.message 
      });

      // Step 3: Create indexes
      updateStep('create-indexes', { status: 'running' });
      
      const indexResponse = await fetch('/api/admin/website-type-niche-migration/indexes', {
        method: 'POST'
      });
      const indexResult = await indexResponse.json();
      
      if (!indexResponse.ok) {
        updateStep('create-indexes', { 
          status: 'failed', 
          error: indexResult.error || 'Failed to create indexes' 
        });
        return;
      }
      
      updateStep('create-indexes', { 
        status: 'completed', 
        result: indexResult.message 
      });

      // Step 4: Verify migration
      updateStep('verify-migration', { status: 'running' });
      
      const verifyResponse = await fetch('/api/admin/website-type-niche-migration/verify', {
        method: 'POST'
      });
      const verifyResult = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        updateStep('verify-migration', { 
          status: 'failed', 
          error: verifyResult.error || 'Failed to verify migration' 
        });
        return;
      }
      
      updateStep('verify-migration', { 
        status: 'completed', 
        result: verifyResult.message 
      });

    } catch (error: any) {
      console.error('Migration error:', error);
      // Update the currently running step as failed
      const runningStep = steps.find(s => s.status === 'running');
      if (runningStep) {
        updateStep(runningStep.id, { 
          status: 'failed', 
          error: error.message || 'Unknown error' 
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: MigrationStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const allCompleted = steps.every(step => step.status === 'completed');
  const hasFailed = steps.some(step => step.status === 'failed');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Website Type & Niche Migration</h1>
          </div>
          
          <p className="text-gray-600">
            Add website_type and niche columns to the websites table for enhanced categorization
          </p>
        </div>

        {/* Migration Overview */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Migration Overview</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">New Columns</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <code className="bg-gray-100 px-1 rounded">website_type TEXT[]</code> - SaaS, Blog, News, eCommerce, etc.</li>
                <li>• <code className="bg-gray-100 px-1 rounded">niche TEXT[]</code> - Multiple niches per website</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Performance Optimizations</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• GIN indexes for efficient array filtering</li>
                <li>• Safe column addition with IF NOT EXISTS</li>
                <li>• Zero downtime migration</li>
              </ul>
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {allCompleted ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : hasFailed ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : isRunning ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                
                <span className="font-medium">
                  {allCompleted 
                    ? 'Migration Completed Successfully' 
                    : hasFailed 
                    ? 'Migration Failed'
                    : isRunning 
                    ? 'Migration In Progress...' 
                    : 'Ready to Run Migration'
                  }
                </span>
              </div>
              
              <button
                onClick={runMigration}
                disabled={isRunning || allCompleted}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  allCompleted
                    ? 'bg-green-100 text-green-700 cursor-not-allowed'
                    : isRunning
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {allCompleted ? 'Completed' : isRunning ? 'Running...' : 'Run Migration'}
              </button>
            </div>
          </div>
        </div>

        {/* Migration Steps */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Migration Steps</h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  {getStepIcon(step.status)}
                  {index < steps.length - 1 && (
                    <div className="w-px h-8 bg-gray-200 mt-2" />
                  )}
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{step.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      step.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : step.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : step.status === 'running'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {step.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                  
                  {step.result && (
                    <div className="text-sm bg-green-50 text-green-700 p-2 rounded border border-green-200">
                      {step.result}
                    </div>
                  )}
                  
                  {step.error && (
                    <div className="text-sm bg-red-50 text-red-700 p-2 rounded border border-red-200">
                      Error: {step.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Post-Migration Instructions */}
        {allCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">Migration Complete!</h2>
            <div className="text-green-700 space-y-2">
              <p>The website_type and niche columns have been successfully added to the websites table.</p>
              <p className="font-medium">Next steps:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Run an Airtable sync to populate the new columns with data</li>
                <li>Update the websites page to display Website Type and Niche information</li>
                <li>Add filtering options for the new fields in the website directory</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}