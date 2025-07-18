'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, Play, RefreshCw } from 'lucide-react';

interface SchemaStatus {
  success: boolean;
  analysis?: {
    totalColumns: number;
    streamingColumnsPresent: string[];
    streamingColumnsMissing: string[];
    schemaInSync: boolean;
  };
  allColumns?: Array<{name: string; type: string; nullable: boolean}>;
  error?: string;
}

export default function FixStreamingSchemaPage() {
  const [status, setStatus] = useState<SchemaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const checkSchema = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sync-drizzle-schema');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        error: 'Failed to check schema: ' + (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  const syncSchema = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-drizzle-schema', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Schema sync successful!');
        await checkSchema(); // Refresh status
      } else {
        alert('❌ Schema sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Network error: ' + (error as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    checkSchema();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Database className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Fix Streaming Schema</h1>
            </div>
            <button
              onClick={checkSchema}
              disabled={loading}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Schema Sync Issue</h3>
                <p className="text-sm text-red-700 mt-1">
                  The streaming services are showing "Failed query" errors. This usually means 
                  the Drizzle ORM schema needs to be synchronized with the actual database.
                </p>
              </div>
            </div>
          </div>

          {status && (
            <div className="space-y-6">
              {/* Schema Analysis */}
              {status.analysis && (
                <div className="border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Schema Analysis</span>
                  </h2>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-sm text-gray-600">Total Columns</div>
                      <div className="text-2xl font-bold">{status.analysis.totalColumns}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-sm text-gray-600">Schema Status</div>
                      <div className={`text-lg font-bold ${
                        status.analysis.schemaInSync ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {status.analysis.schemaInSync ? 'In Sync' : 'Out of Sync'}
                      </div>
                    </div>
                  </div>

                  {/* Streaming Columns Status */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Streaming Columns Status:</h3>
                    
                    {status.analysis.streamingColumnsPresent.length > 0 && (
                      <div>
                        <h4 className="text-green-600 font-medium">✅ Present:</h4>
                        <div className="grid grid-cols-2 gap-2 ml-4">
                          {status.analysis.streamingColumnsPresent.map(col => (
                            <div key={col} className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm">{col}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {status.analysis.streamingColumnsMissing.length > 0 && (
                      <div>
                        <h4 className="text-red-600 font-medium">❌ Missing:</h4>
                        <div className="grid grid-cols-2 gap-2 ml-4">
                          {status.analysis.streamingColumnsMissing.map(col => (
                            <div key={col} className="flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm">{col}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Fix Actions</h2>
                
                {status.analysis?.schemaInSync ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">Schema is in sync!</span>
                    </div>
                    <p className="text-green-700 text-sm mt-2">
                      The database schema matches the Drizzle ORM definition. 
                      If you're still seeing errors, try restarting the application.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <p className="text-yellow-800">
                        The schema appears to be out of sync. Click below to attempt synchronization.
                      </p>
                    </div>
                    
                    <button
                      onClick={syncSchema}
                      disabled={syncing || loading}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>{syncing ? 'Syncing Schema...' : 'Sync Drizzle Schema'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {status.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">Error Details</h3>
                  <pre className="text-red-700 text-sm whitespace-pre-wrap">{status.error}</pre>
                </div>
              )}

              {/* All Columns (Debug) */}
              {status.allColumns && (
                <details className="border rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                    Show All Database Columns ({status.allColumns.length})
                  </summary>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {status.allColumns.map(col => (
                      <div key={col.name} className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{col.name}</div>
                        <div className="text-gray-600 text-xs">{col.type}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Next Steps */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Next Steps After Fix</h3>
            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
              <li>Check that streaming services show as "Available" in diagnostics</li>
              <li>Test outline generation on a workflow</li>
              <li>Monitor real-time streaming performance</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}