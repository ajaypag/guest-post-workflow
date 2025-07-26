'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, X, Play, Info } from 'lucide-react';

export default function RunDataForSeoMigrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [migrationResults, setMigrationResults] = useState<string[]>([]);

  const runMigration = async () => {
    setIsLoading(true);
    setMessage('');
    setMigrationResults([]);
    
    try {
      const response = await fetch('/api/admin/run-dataforseo-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ DataForSEO migrations applied successfully!');
        setMessageType('success');
        setMigrationResults(data.results || []);
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              DataForSEO Migration
            </h1>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">This migration will:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Create the <code className="bg-blue-100 px-1 py-0.5 rounded">keyword_analysis_results</code> table for storing DataForSEO results</li>
                  <li>Create the <code className="bg-blue-100 px-1 py-0.5 rounded">keyword_analysis_batches</code> table for batch tracking</li>
                  <li>Add DataForSEO status columns to <code className="bg-blue-100 px-1 py-0.5 rounded">bulk_analysis_domains</code></li>
                  <li>Add batch analysis support columns (<code className="bg-blue-100 px-1 py-0.5 rounded">analysis_batch_id</code>, <code className="bg-blue-100 px-1 py-0.5 rounded">is_incremental</code>)</li>
                  <li>Create necessary indexes for performance</li>
                </ul>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              messageType === 'success' ? 'bg-green-50 border border-green-200' :
              messageType === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : messageType === 'error' ? (
                <X className="w-5 h-5 text-red-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  messageType === 'success' ? 'text-green-800' :
                  messageType === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {message}
                </p>
                {migrationResults.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {migrationResults.map((result, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {result}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={runMigration}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isLoading ? 'Running Migration...' : 'Run Migration'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Important Notes:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• This migration is safe to run multiple times (idempotent)</li>
              <li>• Existing data will not be affected</li>
              <li>• The migration checks for existing tables/columns before applying changes</li>
              <li>• Run this after deploying to Coolify to enable DataForSEO features</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}