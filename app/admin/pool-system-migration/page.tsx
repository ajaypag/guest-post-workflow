'use client';

import { useState } from 'react';
import AdminWrapper from '@/components/AdminWrapper';
import Header from '@/components/Header';
import { CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

export default function PoolSystemMigrationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await fetch('/api/admin/pool-system-migration', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus({ error: 'Failed to check migration status' });
    } finally {
      setCheckingStatus(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      const response = await fetch('/api/admin/pool-system-migration', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data);
      // Refresh status after migration
      await checkStatus();
    } catch (error: any) {
      console.error('Migration error:', error);
      setResult({
        success: false,
        error: error.message || 'Migration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check status on mount
  useState(() => {
    checkStatus();
  });

  return (
    <AdminWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Pool System Migration
              </h1>
            </div>

            <div className="prose max-w-none mb-8">
              <p className="text-gray-600">
                This migration adds the primary/alternative pool system to domain selections.
                It will:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 mt-4">
                <li>Add <code>selection_pool</code> and <code>pool_rank</code> columns</li>
                <li>Mark domains as 'primary' up to the required link count</li>
                <li>Mark excess domains as 'alternative'</li>
                <li>Assign proper rankings within each pool</li>
              </ul>
            </div>

            {/* Status Check */}
            {status && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Current Status</h3>
                {status.error ? (
                  <div className="text-red-600">{status.error}</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {status.migrated ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                      <span>{status.message}</span>
                    </div>
                    {status.summary && status.summary.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Pool Distribution:</h4>
                        <div className="space-y-1">
                          {status.summary.map((item: any, index: number) => (
                            <div key={index} className="text-sm text-gray-600">
                              {item.selection_pool || 'No pool'}: {item.count} domains 
                              ({item.group_count} groups)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={runMigration}
                disabled={loading || checkingStatus}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5" />
                    Run Migration
                  </>
                )}
              </button>

              <button
                onClick={checkStatus}
                disabled={loading || checkingStatus}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Status'
                )}
              </button>
            </div>

            {result && (
              <div className={`mt-8 p-4 rounded-lg ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.success ? 'Migration Successful' : 'Migration Failed'}
                    </h3>
                    
                    {result.error ? (
                      <p className="text-red-700">{result.error}</p>
                    ) : (
                      <div className="space-y-2 text-green-700">
                        <p>{result.message}</p>
                        <p>Migrated {result.migratedCount} submissions</p>
                        
                        {result.summary && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <h4 className="font-medium mb-1">Results:</h4>
                            <div className="space-y-1 text-sm">
                              {result.summary.map((item: any, index: number) => (
                                <div key={index}>
                                  {item.selection_pool}: {item.count} domains
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.errors && result.errors.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-yellow-200">
                            <h4 className="font-medium text-yellow-900 mb-1">Warnings:</h4>
                            <div className="space-y-1 text-sm text-yellow-700">
                              {result.errors.map((error: string, index: number) => (
                                <div key={index}>{error}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminWrapper>
  );
}