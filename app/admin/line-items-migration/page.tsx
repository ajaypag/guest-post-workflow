'use client';

import { useState, useEffect } from 'react';
import { 
  AlertCircle, CheckCircle, XCircle, Database, 
  RefreshCw, PlayCircle, AlertTriangle, ArrowLeft,
  Info, Shield, Clock, Zap, FileText, Activity
} from 'lucide-react';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';

interface MigrationStatus {
  migration: string;
  version: string;
  description: string;
  status: 'not_run' | 'completed' | 'failed' | 'running';
  appliedAt?: string;
  error?: string;
  tableExists: boolean;
  columnCheck: {
    hasOrderId: boolean;
    hasChangeType: boolean;
    hasPreviousValue: boolean;
    hasNewValue: boolean;
    hasBatchId: boolean;
    hasMetadata: boolean;
  };
  rowCount: number;
  lastChange?: string;
}

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export default function LineItemsMigrationPage() {
  const [loading, setLoading] = useState(true);
  const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, MigrationResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const migrationList = [
    {
      version: '0057a',
      file: '0057a_add_order_id_column.sql',
      description: 'Step 1: Add order_id column',
      details: 'Adds order_id column and populates it from order_line_items'
    },
    {
      version: '0057b',
      file: '0057b_add_change_type_column.sql',
      description: 'Step 2: Add change_type column',
      details: 'Adds change_type column and migrates data from field_name'
    },
    {
      version: '0057c',
      file: '0057c_add_previous_value_column.sql',
      description: 'Step 3: Add previous_value column',
      details: 'Adds previous_value JSONB column and migrates from old_value'
    },
    {
      version: '0057d',
      file: '0057d_add_metadata_columns.sql',
      description: 'Step 4: Add metadata columns',
      details: 'Adds batch_id and metadata JSONB columns'
    },
    {
      version: '0057e',
      file: '0057e_drop_old_columns.sql',
      description: 'Step 5: Drop old columns',
      details: 'Removes field_name and old_value columns after migration'
    },
    {
      version: '0057f',
      file: '0057f_add_indexes_and_constraints.sql',
      description: 'Step 6: Add indexes and constraints',
      details: 'Creates indexes and foreign key constraints for performance'
    },
    {
      version: '0058', 
      file: '0058_update_line_item_changes_schema.sql',
      description: 'Enhanced schema with backup and migration',
      details: 'Complete table recreation with proper JSONB format and data migration'
    },
    {
      version: '0059',
      file: '0059_fix_line_item_changes_columns.sql', 
      description: 'Add missing columns to line_item_changes table',
      details: 'Final production-ready schema with all required columns and indexes'
    }
  ];

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/line-items-migration');
      
      if (!response.ok) {
        throw new Error('Failed to check migration status');
      }
      
      const data = await response.json();
      setMigrations(data.migrations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (version: string) => {
    try {
      setRunning(version);
      setError(null);
      setResults(prev => ({ ...prev, [version]: { success: false, message: 'Running...' } }));

      const response = await fetch('/api/admin/line-items-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, action: 'run' })
      });

      const result = await response.json();
      
      setResults(prev => ({ ...prev, [version]: result }));
      
      if (result.success) {
        // Refresh status after successful migration
        await checkMigrationStatus();
      }
    } catch (err) {
      const errorResult = {
        success: false,
        message: 'Migration failed',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
      setResults(prev => ({ ...prev, [version]: errorResult }));
    } finally {
      setRunning(null);
    }
  };

  const runDryRun = async (version: string) => {
    try {
      setRunning(version);
      setError(null);

      const response = await fetch('/api/admin/line-items-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, action: 'dry-run' })
      });

      const result = await response.json();
      setResults(prev => ({ ...prev, [version]: result }));
    } catch (err) {
      const errorResult = {
        success: false,
        message: 'Dry run failed',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
      setResults(prev => ({ ...prev, [version]: errorResult }));
    } finally {
      setRunning(null);
    }
  };

  const getStatusIcon = (migration: MigrationStatus) => {
    if (migration.status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (migration.status === 'failed') return <XCircle className="h-5 w-5 text-red-500" />;
    if (migration.status === 'running') return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusColor = (migration: MigrationStatus) => {
    if (migration.status === 'completed') return 'border-green-200 bg-green-50';
    if (migration.status === 'failed') return 'border-red-200 bg-red-50';
    if (migration.status === 'running') return 'border-blue-200 bg-blue-50';
    return 'border-yellow-200 bg-yellow-50';
  };

  const canRunMigration = (version: string, migration?: MigrationStatus) => {
    if (running) return false;
    if (migration?.status === 'completed') return false;
    
    // Check prerequisites
    if (version === '0058') {
      const migration0057 = migrations.find(m => m.version === '0057');
      return migration0057?.status === 'completed';
    }
    if (version === '0059') {
      const migration0058 = migrations.find(m => m.version === '0058');
      return migration0058?.status === 'completed';
    }
    
    return true;
  };

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/admin" className="text-blue-600 hover:text-blue-800">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-600" />
                Line Items Migration
              </h1>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Critical Production Migrations</h3>
                  <p className="text-blue-800 mt-1">
                    These migrations are required for the Order Groups → Line Items system unification. 
                    Run them in order (0057 → 0058 → 0059) for production deployment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Migration Status</h2>
              <button
                onClick={checkMigrationStatus}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900">Error:</span>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Migration Cards */}
          <div className="space-y-6">
            {migrationList.map((migrationInfo, index) => {
              const migration = migrations.find(m => m.version === migrationInfo.version);
              const result = results[migrationInfo.version];
              const isRunning = running === migrationInfo.version;
              const canRun = canRunMigration(migrationInfo.version, migration);

              return (
                <div key={migrationInfo.version} className={`bg-white rounded-lg shadow border-2 ${getStatusColor(migration || { status: 'not_run' } as MigrationStatus)}`}>
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(migration || { status: 'not_run' } as MigrationStatus)}
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            Migration {migrationInfo.version}
                          </h3>
                          <p className="text-gray-600">{migrationInfo.description}</p>
                          <p className="text-sm text-gray-500 mt-1">{migrationInfo.details}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium rounded-full">
                          Step {index + 1} of 3
                        </span>
                      </div>
                    </div>

                    {/* Status Details */}
                    {migration && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                          <p className="text-sm">
                            <span className="capitalize">{migration.status.replace('_', ' ')}</span>
                            {migration.appliedAt && (
                              <span className="block text-gray-500">
                                Applied: {new Date(migration.appliedAt).toLocaleString()}
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Table Status</h4>
                          <p className="text-sm">
                            Table exists: {migration.tableExists ? '✅' : '❌'}
                            <span className="block text-gray-500">
                              Rows: {migration.rowCount.toLocaleString()}
                            </span>
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Columns</h4>
                          <div className="text-xs space-y-1">
                            <div>order_id: {migration.columnCheck?.hasOrderId ? '✅' : '❌'}</div>
                            <div>change_type: {migration.columnCheck?.hasChangeType ? '✅' : '❌'}</div>
                            <div>previous_value: {migration.columnCheck?.hasPreviousValue ? '✅' : '❌'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => runDryRun(migrationInfo.version)}
                        disabled={isRunning || !canRun}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                      >
                        <FileText className="h-4 w-4" />
                        Dry Run
                      </button>
                      
                      <button
                        onClick={() => runMigration(migrationInfo.version)}
                        disabled={isRunning || !canRun || migration?.status === 'completed'}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {isRunning ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                        {migration?.status === 'completed' ? 'Completed' : 'Run Migration'}
                      </button>

                      <button
                        onClick={() => setShowDetails(prev => ({ ...prev, [migrationInfo.version]: !prev[migrationInfo.version] }))}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        <Activity className="h-4 w-4" />
                        {showDetails[migrationInfo.version] ? 'Hide' : 'Show'} Details
                      </button>
                    </div>

                    {/* Prerequisites Warning */}
                    {!canRun && migration?.status !== 'completed' && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-800 text-sm">
                            {migrationInfo.version === '0058' && 'Migration 0057 must be completed first'}
                            {migrationInfo.version === '0059' && 'Migration 0058 must be completed first'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {result && (
                      <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-start gap-3">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                              {result.message}
                            </p>
                            {result.error && (
                              <p className="text-red-800 text-sm mt-1">{result.error}</p>
                            )}
                            {result.details && (
                              <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detailed View */}
                    {showDetails[migrationInfo.version] && migration && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Migration Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="font-medium mb-2">File Information</h5>
                            <p>File: {migrationInfo.file}</p>
                            <p>Version: {migration.version}</p>
                            <p>Status: {migration.status}</p>
                          </div>
                          <div>
                            <h5 className="font-medium mb-2">Database State</h5>
                            <p>Table exists: {migration.tableExists ? 'Yes' : 'No'}</p>
                            <p>Row count: {migration.rowCount}</p>
                            {migration.lastChange && (
                              <p>Last change: {new Date(migration.lastChange).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Column Status</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            <div className={migration.columnCheck?.hasOrderId ? 'text-green-600' : 'text-red-600'}>
                              order_id: {migration.columnCheck?.hasOrderId ? '✅' : '❌'}
                            </div>
                            <div className={migration.columnCheck?.hasChangeType ? 'text-green-600' : 'text-red-600'}>
                              change_type: {migration.columnCheck?.hasChangeType ? '✅' : '❌'}
                            </div>
                            <div className={migration.columnCheck?.hasPreviousValue ? 'text-green-600' : 'text-red-600'}>
                              previous_value: {migration.columnCheck?.hasPreviousValue ? '✅' : '❌'}
                            </div>
                            <div className={migration.columnCheck?.hasNewValue ? 'text-green-600' : 'text-red-600'}>
                              new_value: {migration.columnCheck?.hasNewValue ? '✅' : '❌'}
                            </div>
                            <div className={migration.columnCheck?.hasBatchId ? 'text-green-600' : 'text-red-600'}>
                              batch_id: {migration.columnCheck?.hasBatchId ? '✅' : '❌'}
                            </div>
                            <div className={migration.columnCheck?.hasMetadata ? 'text-green-600' : 'text-red-600'}>
                              metadata: {migration.columnCheck?.hasMetadata ? '✅' : '❌'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Status */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Migration Progress</h3>
            <div className="space-y-2">
              {migrationList.map((migrationInfo, index) => {
                const migration = migrations.find(m => m.version === migrationInfo.version);
                const isCompleted = migration?.status === 'completed';
                
                return (
                  <div key={migrationInfo.version} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={isCompleted ? 'text-green-800' : 'text-gray-600'}>
                      Migration {migrationInfo.version}: {migrationInfo.description}
                    </span>
                    {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                );
              })}
            </div>
            
            {migrations.length > 0 && migrations.every(m => m.status === 'completed') && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    All line items migrations completed successfully! 🎉
                  </span>
                </div>
                <p className="text-green-800 text-sm mt-1">
                  Your system is ready for production deployment with the unified line items system.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}