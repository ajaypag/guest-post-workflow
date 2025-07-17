'use client';

import { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw, Play, RotateCcw } from 'lucide-react';

interface MigrationStatus {
  timestamp: string;
  schemaStatus: {
    hasStreamingFields: boolean;
    hasUniqueConstraint: boolean;
    currentColumns: any[];
    currentIndexes: any[];
  };
  analysis: {
    issues: string[];
    recommendations: string[];
    migrationNeeded: boolean;
  };
  testResults: {
    uniqueConstraintTest: any;
    columnAccessTest: any;
  };
}

interface MigrationResult {
  timestamp: string;
  steps: any[];
  success: boolean;
  rollbackInstructions?: string[];
}

export default function StreamingMigrationPage() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-load status on page load
  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/migrate-streaming-schema', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to check migration status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('This will modify the database schema. Continue with streaming migration?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setMigrationResult(null);

    try {
      const response = await fetch('/api/admin/migrate-streaming-schema', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setMigrationResult(data);
      
      // Refresh status after migration
      await checkMigrationStatus();
      
      if (data.success) {
        alert('Streaming schema migration completed successfully!');
      } else {
        alert('Migration completed with issues. Check the results below.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rollbackMigration = async () => {
    if (!confirm('This will remove all streaming schema changes. Continue with rollback?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/migrate-streaming-schema', {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Rollback failed');
      }

      setMigrationResult(data);
      
      // Refresh status after rollback
      await checkMigrationStatus();
      
      alert('Schema rollback completed!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Streaming Migration Management</h1>
            <button
              onClick={checkMigrationStatus}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Status
            </button>
          </div>

          {/* Migration Phase Indicator */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Database className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-800">Phase 2: Database Schema Migration</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Preparing database for streaming support with race condition prevention.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status && (
            <div className="space-y-6">
              {/* Current Schema Status */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Current Schema Status
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {status.schemaStatus.hasStreamingFields ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>Streaming Support Fields</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.schemaStatus.hasUniqueConstraint ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>Race Condition Prevention</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-4">
                  <h4 className="font-semibold mb-2">Current Columns ({status.schemaStatus.currentColumns.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {status.schemaStatus.currentColumns.map((col: any) => (
                      <div key={col.column_name} className="text-gray-600">
                        {col.column_name} ({col.data_type})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Analysis & Issues */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Migration Analysis</h2>
                
                {status.analysis.issues.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-red-600 mb-2">Issues Found:</h3>
                    <ul className="space-y-1">
                      {status.analysis.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                          <span className="text-sm text-red-700">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {status.analysis.recommendations.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-blue-600 mb-2">Recommendations:</h3>
                    <ul className="space-y-1">
                      {status.analysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span className="text-sm text-blue-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={`px-3 py-2 rounded text-sm font-medium ${
                  status.analysis.migrationNeeded 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {status.analysis.migrationNeeded 
                    ? 'Migration Required' 
                    : 'Schema Ready for Streaming'}
                </div>
              </div>

              {/* Test Results */}
              {status.testResults.uniqueConstraintTest && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Pre-Migration Tests</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {status.testResults.uniqueConstraintTest.canAddConstraint ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">Unique Constraint Compatibility</span>
                    </div>
                    
                    {status.testResults.uniqueConstraintTest.conflicts?.length > 0 && (
                      <div className="ml-7 bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-800 font-medium mb-2">
                          Found {status.testResults.uniqueConstraintTest.conflicts.length} workflow(s) with multiple active sessions:
                        </p>
                        <div className="text-xs text-red-700 space-y-1">
                          {status.testResults.uniqueConstraintTest.conflicts.map((conflict: any, idx: number) => (
                            <div key={idx}>
                              Workflow {conflict.workflow_id}: {conflict.active_count} active sessions
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-red-800 mt-2">
                          Migration will automatically clean these up before adding the constraint.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Migration Actions</h2>
                
                <div className="flex gap-4">
                  <button
                    onClick={runMigration}
                    disabled={loading || !status.analysis.migrationNeeded}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-5 h-5" />
                    Run Migration
                  </button>
                  
                  <button
                    onClick={rollbackMigration}
                    disabled={loading || status.analysis.migrationNeeded}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Rollback Changes
                  </button>
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Migration:</strong> Adds streaming support fields and unique constraint</p>
                  <p><strong>Rollback:</strong> Removes all streaming-related schema changes</p>
                </div>
              </div>

              {/* Migration Results */}
              {migrationResult && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Migration Results</h2>
                  
                  <div className={`mb-4 px-3 py-2 rounded text-sm font-medium ${
                    migrationResult.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {migrationResult.success ? 'Migration Successful' : 'Migration Failed'}
                  </div>

                  <div className="space-y-2">
                    {migrationResult.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {step.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">Step {step.step}:</span>
                        <span>{step.details || step.action}</span>
                        {step.error && (
                          <span className="text-red-600">({step.error})</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {migrationResult.rollbackInstructions && (
                    <details className="mt-4">
                      <summary className="cursor-pointer font-medium text-gray-700">
                        Rollback Instructions (if needed)
                      </summary>
                      <div className="mt-2 bg-gray-50 p-3 rounded text-sm font-mono">
                        {migrationResult.rollbackInstructions.map((instruction, idx) => (
                          <div key={idx}>{instruction}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}