'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Database, ArrowRight } from 'lucide-react';

export default function MultipleOfferingsMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');

  const runMigration = async () => {
    setMigrationStatus('running');
    setMessage('Running multiple offerings migration...');
    setDetails('');

    try {
      const response = await fetch('/api/admin/multiple-offerings-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok) {
        setMigrationStatus('success');
        setMessage('Migration completed successfully!');
        setDetails(result.message || 'Database constraint updated to allow multiple offerings per website.');
      } else {
        setMigrationStatus('error');
        setMessage('Migration failed');
        setDetails(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      setMigrationStatus('error');
      setMessage('Migration failed');
      setDetails(error instanceof Error ? error.message : 'Network error');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Multiple Offerings Migration</h1>
          <p className="text-gray-600">
            Run the database migration to enable multiple offerings per website for publishers.
          </p>
        </div>

        {/* Migration Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <Database className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Migration Overview</h3>
              <p className="text-blue-800 mb-4">
                This migration updates the database constraint to allow publishers to create multiple offerings for the same website.
              </p>
              
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  <span>Removes old constraint: <code className="bg-blue-100 px-2 py-1 rounded">UNIQUE(publisher_id, website_id)</code></span>
                </div>
                <div className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  <span>Adds new constraint: <code className="bg-blue-100 px-2 py-1 rounded">UNIQUE(publisher_id, website_id, offering_id)</code></span>
                </div>
                <div className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  <span>Enables multiple offerings per publisher-website combination</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Migration Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration Status</h3>
          
          <div className="flex items-center space-x-4 mb-4">
            {migrationStatus === 'idle' && (
              <>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="text-gray-600">Ready to run migration</span>
              </>
            )}
            {migrationStatus === 'running' && (
              <>
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-700">Migration in progress...</span>
              </>
            )}
            {migrationStatus === 'success' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700">Migration completed successfully</span>
              </>
            )}
            {migrationStatus === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">Migration failed</span>
              </>
            )}
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-4 ${
              migrationStatus === 'success' ? 'bg-green-50 border border-green-200' :
              migrationStatus === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`font-medium ${
                migrationStatus === 'success' ? 'text-green-800' :
                migrationStatus === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {message}
              </p>
              {details && (
                <p className={`text-sm mt-2 ${
                  migrationStatus === 'success' ? 'text-green-700' :
                  migrationStatus === 'error' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {details}
                </p>
              )}
            </div>
          )}

          <button
            onClick={runMigration}
            disabled={migrationStatus === 'running' || migrationStatus === 'success'}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              migrationStatus === 'success'
                ? 'bg-green-600 text-white cursor-not-allowed opacity-75'
                : migrationStatus === 'running'
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {migrationStatus === 'running' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                Running Migration...
              </>
            ) : migrationStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 inline-block mr-2" />
                Migration Complete
              </>
            ) : (
              'Run Migration'
            )}
          </button>
        </div>

        {/* Safety Information */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Notes</h3>
              <ul className="text-yellow-800 space-y-1 text-sm">
                <li>• This migration is safe to run on production data</li>
                <li>• No existing data will be lost or modified</li>
                <li>• The migration only changes database constraints</li>
                <li>• Rollback script available: <code className="bg-yellow-100 px-2 py-1 rounded">0054_rollback.sql</code></li>
                <li>• Run during low-traffic periods for best performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}