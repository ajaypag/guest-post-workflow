'use client';

import { useState } from 'react';
import { Database, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function DataForSeoCountMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');

  const runMigration = async () => {
    setStatus('running');
    setMessage('Running migration...');
    setDetails('');

    try {
      const response = await fetch('/api/admin/add-dataforseo-count-column', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Migration completed successfully');
        setDetails('The dataforseo_results_count column has been added to the bulk_analysis_domains table.');
      } else {
        setStatus('error');
        setMessage('Migration failed');
        setDetails(data.details || data.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage('Migration failed');
      setDetails(error.message || 'Network error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6" />
              DataForSEO Results Count Migration
            </h1>
            <p className="text-gray-600 mt-2">
              This migration adds a column to store DataForSEO results count directly in the bulk_analysis_domains table,
              allowing the count to be displayed immediately without expanding rows.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What this migration does:</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Adds <code className="bg-blue-100 px-1 rounded">dataforseo_results_count</code> column to bulk_analysis_domains table</li>
              <li>• Updates existing domains with their current DataForSEO results count</li>
              <li>• Enables immediate display of rankings count in the bulk analysis table</li>
            </ul>
          </div>

          {status === 'idle' && (
            <button
              onClick={runMigration}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Database className="w-5 h-5" />
              Run Migration
            </button>
          )}

          {status === 'running' && (
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{message}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-green-600">
                <CheckCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">{message}</p>
                  {details && <p className="text-sm text-gray-600 mt-1">{details}</p>}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Next Steps:</h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• The column has been added and existing data updated</li>
                  <li>• New DataForSEO analyses will automatically update this count</li>
                  <li>• Users will now see rankings count immediately in the bulk analysis table</li>
                </ul>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-red-600">
                <XCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">{message}</p>
                  {details && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Error details:</p>
                      <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-x-auto">{details}</pre>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={runMigration}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry Migration
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Important Notes:</p>
                  <ul className="space-y-1">
                    <li>• This migration is safe to run multiple times</li>
                    <li>• It will not affect existing data beyond adding the count</li>
                    <li>• If the column already exists, it will skip creation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}