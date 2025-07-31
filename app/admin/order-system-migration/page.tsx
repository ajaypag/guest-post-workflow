'use client';

import { useState } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle, Loader2, Play, Terminal, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function OrderSystemMigrationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const checkCurrentState = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/order-system-migration');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check current state');
      }
      
      setDiagnostics(data);
      setShowDiagnostics(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check current state');
    } finally {
      setIsChecking(false);
    }
  };
  
  const runMigration = async () => {
    if (!confirm('This will create new tables for the order-centric system. Continue?')) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/order-system-migration', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            ← Back to Admin
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center mb-6">
            <Database className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold">Order System Migration</h1>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 mb-2">Migration Overview</h2>
              <p className="text-blue-800 mb-3">
                This migration implements the new order-centric architecture to support:
              </p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Multi-client orders through order groups</li>
                <li>Full site transparency with order_site_selections</li>
                <li>Share tokens for sales process (already exists)</li>
                <li>Order state tracking for workflow management</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Changes to be Applied:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <span className="text-gray-500 mr-2">1.</span>
                  <div>
                    <p className="font-medium">Update orders table</p>
                    <p className="text-gray-600">Add state, requires_client_review, review_completed_at columns</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 mr-2">2.</span>
                  <div>
                    <p className="font-medium">Create order_groups table</p>
                    <p className="text-gray-600">Support multi-client orders with separate analysis projects</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 mr-2">3.</span>
                  <div>
                    <p className="font-medium">Create order_site_selections table</p>
                    <p className="text-gray-600">Track site review and selections with full transparency</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 mr-2">4.</span>
                  <div>
                    <p className="font-medium">Update order_items table</p>
                    <p className="text-gray-600">Add linkage to order groups and site selections</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 mr-2">5.</span>
                  <div>
                    <p className="font-medium">Update clients table</p>
                    <p className="text-gray-600">Add default_requirements for automated site filtering</p>
                  </div>
                </div>
              </div>
            </div>

            {!result && !error && (
              <div className="space-y-3">
                <button
                  onClick={checkCurrentState}
                  disabled={isChecking || isRunning}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Checking Current State...
                    </>
                  ) : (
                    <>
                      <Database className="h-5 w-5 mr-2" />
                      Check Current Database State
                    </>
                  )}
                </button>
                
                <button
                  onClick={runMigration}
                  disabled={isRunning || isChecking}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Running Migration...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Run Order System Migration
                    </>
                  )}
                </button>
              </div>
            )}

            {result && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900">Migration Successful!</h3>
                      <p className="text-green-800 mt-1">{result.message}</p>
                      {result.summary && (
                        <div className="mt-3 text-sm text-green-700">
                          {result.summary.tables_created?.length > 0 && (
                            <p>Tables created: {result.summary.tables_created.join(', ')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Migration Logs */}
                {result.migrationLog && result.migrationLog.length > 0 && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center">
                        <Terminal className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="font-semibold text-gray-100">Migration Logs</h3>
                        <span className="ml-2 text-sm text-gray-400">({result.migrationLog.length} entries)</span>
                      </div>
                      {showLogs ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {showLogs && (
                      <div className="p-4 pt-0">
                        <pre className="text-xs text-gray-300 overflow-x-auto">
                          {result.migrationLog.join('\n')}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Current State Diagnostics */}
            {diagnostics && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-blue-400 mr-2" />
                    <h3 className="font-semibold text-gray-100">Current Database State</h3>
                  </div>
                  {showDiagnostics ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {showDiagnostics && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Readiness Check */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Migration Readiness:</h4>
                      <div className="space-y-1">
                        {Object.entries(diagnostics.readyToMigrate || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                            <span className={value ? 'text-green-400' : 'text-yellow-400'}>
                              {value ? '✓ Yes' : '✗ No'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Tables */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Tables:</h4>
                      <pre className="text-xs text-gray-400 overflow-x-auto bg-black/50 p-3 rounded">
                        {JSON.stringify(diagnostics.diagnostics?.tables || {}, null, 2)}
                      </pre>
                    </div>
                    
                    {/* Columns */}
                    {Object.keys(diagnostics.diagnostics?.columns || {}).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Table Columns:</h4>
                        <div className="space-y-2">
                          {Object.entries(diagnostics.diagnostics?.columns || {}).map(([table, columns]) => (
                            <div key={table}>
                              <h5 className="text-xs font-medium text-gray-400 mb-1">{table}:</h5>
                              <pre className="text-xs text-gray-500 overflow-x-auto bg-black/50 p-2 rounded">
                                {(columns as string[]).join('\n')}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900">Migration Failed</h3>
                      <p className="text-red-800 mt-1">{error}</p>
                      <p className="text-red-700 text-sm mt-2">
                        Check the debug information below for more details.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Debug Information */}
                {result && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center">
                        <Terminal className="h-5 w-5 text-red-400 mr-2" />
                        <h3 className="font-semibold text-gray-100">Debug Information</h3>
                      </div>
                      {showDebugInfo ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {showDebugInfo && (
                      <div className="p-4 pt-0 space-y-4">
                        {/* Migration Logs */}
                        {result.migrationLog && result.migrationLog.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Migration Logs:</h4>
                            <pre className="text-xs text-gray-400 overflow-x-auto bg-black/50 p-3 rounded">
                              {result.migrationLog.join('\n')}
                            </pre>
                          </div>
                        )}

                        {/* Errors */}
                        {result.errors && result.errors.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-red-400 mb-2">Errors:</h4>
                            <pre className="text-xs text-red-300 overflow-x-auto bg-black/50 p-3 rounded">
                              {result.errors.join('\n')}
                            </pre>
                          </div>
                        )}

                        {/* Current State */}
                        {result.currentState && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Current Database State:</h4>
                            <pre className="text-xs text-gray-400 overflow-x-auto bg-black/50 p-3 rounded">
                              {JSON.stringify(result.currentState, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Stack Trace */}
                        {result.stack && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Stack Trace:</h4>
                            <pre className="text-xs text-gray-400 overflow-x-auto bg-black/50 p-3 rounded">
                              {result.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900">Important Notes</h3>
                  <ul className="list-disc list-inside text-yellow-800 text-sm mt-2 space-y-1">
                    <li>This migration is safe to run multiple times (idempotent)</li>
                    <li>No existing data will be lost</li>
                    <li>Only test orders exist in the database (no production data)</li>
                    <li>After migration, update UI components to use new schema</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>
            Next steps after migration:{' '}
            <Link href="/docs/architecture/ORDER_SYSTEM_REPLACEMENT_PLAN.md" className="text-blue-600 hover:text-blue-800">
              View implementation plan
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}