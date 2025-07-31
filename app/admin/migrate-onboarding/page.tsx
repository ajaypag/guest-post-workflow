'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { 
  Database,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Users
} from 'lucide-react';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: string;
  affectedRows?: number;
}

export default function MigrateOnboardingPage() {
  return (
    <AuthWrapper>
      <Header />
      <MigrateOnboardingContent />
    </AuthWrapper>
  );
}

function MigrateOnboardingContent() {
  const [migrationStatus, setMigrationStatus] = useState<'ready' | 'running' | 'completed' | 'error'>('ready');
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    setMigrationStatus('running');
    setResults([]);

    try {
      const response = await fetch('/api/admin/migrate-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        setMigrationStatus('completed');
      } else {
        setResults([{
          success: false,
          message: data.error || 'Migration failed',
          details: data.details
        }]);
        setMigrationStatus('error');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setResults([{
        success: false,
        message: 'Failed to run migration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }]);
      setMigrationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentState = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/migrate-onboarding?check=true');
      const data = await response.json();
      
      setResults([{
        success: true,
        message: 'Current database state checked',
        details: JSON.stringify(data, null, 2)
      }]);
    } catch (error) {
      setResults([{
        success: false,
        message: 'Failed to check database state',
        details: error instanceof Error ? error.message : 'Unknown error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Database className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Account Onboarding Migration</h1>
          </div>
          <p className="text-gray-600">
            Add onboarding tracking fields to the accounts table to support the new user onboarding flow.
          </p>
        </div>

        {/* Migration Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-600" />
            Migration Details
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Changes to be applied:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Add <code className="bg-gray-100 px-2 py-1 rounded">onboarding_completed</code> BOOLEAN column (default: FALSE)</li>
                <li>Add <code className="bg-gray-100 px-2 py-1 rounded">onboarding_steps</code> JSONB column (default: '{}')</li>
                <li>Add <code className="bg-gray-100 px-2 py-1 rounded">onboarding_completed_at</code> TIMESTAMP column</li>
                <li>Create index on <code className="bg-gray-100 px-2 py-1 rounded">onboarding_completed</code> for query performance</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Migration Safety</h4>
                  <p className="text-blue-800 text-sm mt-1">
                    This migration only adds new columns with default values. It won't affect existing data or cause downtime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={checkCurrentState}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Check Current State
            </button>

            <button
              onClick={runMigration}
              disabled={loading || migrationStatus === 'completed'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {migrationStatus === 'completed' ? 'Migration Completed' : 'Run Migration'}
            </button>
          </div>
        </div>

        {/* Status */}
        {migrationStatus !== 'ready' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              {migrationStatus === 'running' && <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-600" />}
              {migrationStatus === 'completed' && <CheckCircle className="h-5 w-5 mr-2 text-green-600" />}
              {migrationStatus === 'error' && <XCircle className="h-5 w-5 mr-2 text-red-600" />}
              Migration Status
            </h2>
            
            <div className={`p-4 rounded-lg ${
              migrationStatus === 'running' ? 'bg-blue-50 border border-blue-200' :
              migrationStatus === 'completed' ? 'bg-green-50 border border-green-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${
                migrationStatus === 'running' ? 'text-blue-900' :
                migrationStatus === 'completed' ? 'text-green-900' :
                'text-red-900'
              }`}>
                {migrationStatus === 'running' && 'Migration in progress...'}
                {migrationStatus === 'completed' && 'Migration completed successfully!'}
                {migrationStatus === 'error' && 'Migration failed'}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        result.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {result.message}
                      </p>
                      {result.affectedRows !== undefined && (
                        <p className={`text-sm mt-1 ${
                          result.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          Affected rows: {result.affectedRows}
                        </p>
                      )}
                      {result.details && (
                        <pre className={`text-sm mt-2 p-2 rounded border ${
                          result.success ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'
                        } overflow-x-auto`}>
                          {result.details}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post-Migration Instructions */}
        {migrationStatus === 'completed' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Next Steps
            </h3>
            <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
              <li>New accounts will automatically have onboarding tracking enabled</li>
              <li>Existing accounts will see the onboarding checklist on their dashboard</li>
              <li>The onboarding flow guides users through 6 key setup steps</li>
              <li>Visit <a href="/account/dashboard" className="underline">Account Dashboard</a> to test the onboarding experience</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}