'use client';

import { useState } from 'react';

export default function BulkAnalysisMigrationPage() {
  const [status, setStatus] = useState<{
    exists?: boolean;
    domainCount?: number;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTableStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/migrate-bulk-analysis');
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
      } else {
        setError(data.details || data.error || 'Failed to check table status');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTable = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/migrate-bulk-analysis', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Table created successfully!');
        // Refresh status
        await checkTableStatus();
      } else {
        setError(data.details || data.error || 'Failed to create table');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeTable = async () => {
    if (!confirm('⚠️ Are you sure? This will delete all bulk analysis data!')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/migrate-bulk-analysis?confirm=true', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Table removed successfully!');
        setStatus(null);
      } else {
        setError(data.details || data.error || 'Failed to remove table');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Bulk Analysis Migration</h1>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Table Status</h2>
          
          <button
            onClick={checkTableStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Table Status'}
          </button>
          
          {status && (
            <div className={`mt-4 p-4 rounded-lg border ${
              status.exists ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <h3 className="font-medium">
                {status.exists ? '✅ Table Exists' : '❌ Table Missing'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{status.message}</p>
              {status.exists && status.domainCount !== undefined && (
                <p className="text-sm text-gray-600">
                  📊 Current domains: {status.domainCount}
                </p>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-800">❌ Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          
          <div className="space-y-3">
            <div>
              <button
                onClick={createTable}
                disabled={loading || status?.exists}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Table'}
              </button>
              <p className="text-sm text-gray-500 mt-1">
                Creates the bulk_analysis_domains table with proper schema and indexes
              </p>
            </div>

            <div>
              <button
                onClick={removeTable}
                disabled={loading || !status?.exists}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Removing...' : 'Remove Table'}
              </button>
              <p className="text-sm text-gray-500 mt-1">
                ⚠️ Permanently deletes the table and all data
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">What This Fixes</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Problem:</strong> The checkboxes (✓) and X buttons in the bulk analysis page don't work because the database table is missing.
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Solution:</strong> This migration creates the <code>bulk_analysis_domains</code> table that stores:
            </p>
            <ul className="text-sm text-gray-700 mt-2 ml-4 space-y-1">
              <li>• Domain names and their qualification status (pending/qualified/disqualified)</li>
              <li>• Associated target pages and keyword counts</li>
              <li>• Who approved/rejected each domain and when</li>
              <li>• Notes for decision tracking</li>
            </ul>
            <p className="text-sm text-gray-700 mt-2">
              <strong>After migration:</strong> The ✓ and X buttons will work to mark domains as approved/rejected, and you'll see "Create Workflow" buttons for approved domains.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}