'use client';

import { useState } from 'react';
import { Database, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function AirtableMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const runMigration = async () => {
    setMigrationStatus('running');
    setOutput('');
    setError('');

    try {
      const response = await fetch('/api/admin/run-airtable-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMigrationStatus('success');
        setOutput(data.output || 'Migration completed successfully');
      } else {
        setMigrationStatus('error');
        setError(data.error || 'Migration failed');
      }
    } catch (err: any) {
      setMigrationStatus('error');
      setError(err.message || 'Network error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Airtable Migration</h1>
              <p className="text-gray-600">Add Airtable metadata columns to bulk_analysis_domains</p>
            </div>
          </div>

          {/* Migration Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">Migration: 0012_add_airtable_metadata.sql</h3>
                <p className="text-blue-800 text-sm mb-2">
                  This migration adds the following columns to the bulk_analysis_domains table:
                </p>
                <ul className="text-blue-800 text-sm space-y-1 ml-4">
                  <li>• <code>airtable_record_id</code> - VARCHAR(255) - Airtable record ID</li>
                  <li>• <code>airtable_metadata</code> - JSONB - Full Airtable record data</li>
                  <li>• <code>airtable_last_synced</code> - TIMESTAMP - Last sync timestamp</li>
                </ul>
                <p className="text-blue-800 text-sm mt-2">
                  These columns enable storing Airtable data (DR, traffic, categories, contacts) alongside domains.
                </p>
              </div>
            </div>
          </div>

          {/* Run Migration Button */}
          <div className="mb-6">
            <button
              onClick={runMigration}
              disabled={migrationStatus === 'running'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {migrationStatus === 'running' ? 'Running Migration...' : 'Run Airtable Migration'}
            </button>
          </div>

          {/* Status Display */}
          {migrationStatus !== 'idle' && (
            <div className="space-y-4">
              {/* Success */}
              {migrationStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-medium text-green-900">Migration Successful</h3>
                      <p className="text-green-800 text-sm">Airtable metadata columns have been added to the database.</p>
                      <p className="text-green-800 text-sm mt-1">You can now import domains from Airtable with preserved metadata.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {migrationStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <h3 className="font-medium text-red-900">Migration Failed</h3>
                      <p className="text-red-800 text-sm">An error occurred during migration. Check the output below.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Output */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Output:</h3>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                  {output || error || 'No output'}
                </pre>
              </div>
            </div>
          )}

          {/* Migration SQL Preview */}
          <div className="mt-8">
            <h3 className="font-medium text-gray-900 mb-3">Migration SQL:</h3>
            <pre className="text-sm text-gray-800 bg-gray-50 p-4 rounded border font-mono overflow-x-auto">
{`-- 0012_add_airtable_metadata.sql
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS airtable_record_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS airtable_metadata JSONB,
ADD COLUMN IF NOT EXISTS airtable_last_synced TIMESTAMP;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_airtable_record_id 
ON bulk_analysis_domains(airtable_record_id);`}
            </pre>
          </div>

          {/* Navigation */}
          <div className="mt-8 pt-4 border-t">
            <a
              href="/admin"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}