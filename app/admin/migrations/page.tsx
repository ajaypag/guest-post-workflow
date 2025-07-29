'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  PlayCircle, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Loader2,
  Info,
  ChevronRight,
  Clock,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface Migration {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  appliedAt?: string;
  error?: string;
}

interface TableInfo {
  name: string;
  rowCount: number;
  columns: string[];
}

export default function MigrationsPage() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  // Define all migrations
  const allMigrations = [
    {
      id: '0013_add_airtable_sync_tables',
      name: 'Airtable Sync Tables',
      description: 'Creates websites, contacts, qualifications, and sync tracking tables'
    },
    {
      id: '0015_fix_traffic_column_type',
      name: 'Fix Traffic Column Type',
      description: 'Changes total_traffic from INTEGER to DECIMAL to handle Airtable decimal values'
    },
    {
      id: '0016_add_project_websites_table',
      name: 'Project & Workflow Website Associations',
      description: 'Creates tables to track website usage in projects and workflows'
    }
  ];

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/migrations/status');
      if (response.ok) {
        const data = await response.json();
        setMigrations(data.migrations || []);
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (migrationId?: string) => {
    setRunning(true);
    setMigrationResult(null);
    
    try {
      const response = await fetch('/api/admin/migrations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          migrationId: migrationId || selectedMigration 
        })
      });
      
      const result = await response.json();
      setMigrationResult(result);
      
      if (result.success) {
        await checkMigrationStatus();
      }
    } catch (error: any) {
      setMigrationResult({
        success: false,
        error: error.message
      });
    } finally {
      setRunning(false);
    }
  };

  const runAllPendingMigrations = async () => {
    const pendingMigrations = migrations.filter(m => m.status === 'pending');
    for (const migration of pendingMigrations) {
      await runMigration(migration.id);
    }
  };

  const getMigrationStatus = (migrationId: string) => {
    const migration = migrations.find(m => m.id === migrationId);
    return migration?.status || 'pending';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Migrations</h1>
        <p className="text-gray-600">Manage database schema changes and migrations</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={runAllPendingMigrations}
          disabled={running || loading}
          className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <PlayCircle className="w-8 h-8 text-green-600" />
            <div className="text-left">
              <div className="font-semibold text-green-900">Run All Migrations</div>
              <div className="text-sm text-green-700">Execute all pending migrations</div>
            </div>
          </div>
        </button>

        <button
          onClick={checkMigrationStatus}
          disabled={loading}
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold text-blue-900">Refresh Status</div>
              <div className="text-sm text-blue-700">Check current migration state</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-gray-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">Advanced Options</div>
              <div className="text-sm text-gray-700">View tables and raw SQL</div>
            </div>
          </div>
        </button>
      </div>

      {/* Migration Result Alert */}
      {migrationResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          migrationResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {migrationResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`font-medium ${
              migrationResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {migrationResult.message || (migrationResult.success ? 'Migration completed successfully' : 'Migration failed')}
            </span>
          </div>
          {migrationResult.error && (
            <pre className="mt-2 text-sm text-red-700 overflow-x-auto">
              {migrationResult.error}
            </pre>
          )}
        </div>
      )}

      {/* Migrations List */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Available Migrations</h2>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading migrations...</p>
            </div>
          ) : (
            allMigrations.map((migration) => {
              const status = getMigrationStatus(migration.id);
              const migrationData = migrations.find(m => m.id === migration.id);
              
              return (
                <div key={migration.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          status === 'completed' ? 'bg-green-100' :
                          status === 'failed' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{migration.name}</h3>
                          <p className="text-sm text-gray-600">{migration.description}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">ID: {migration.id}</span>
                            {migrationData?.appliedAt && (
                              <span className="text-xs text-gray-500">
                                Applied: {new Date(migrationData.appliedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'pending' && (
                        <button
                          onClick={() => runMigration(migration.id)}
                          disabled={running}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {running ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Run Migration'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {migrationData?.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                      {migrationData.error}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <>
          {/* Database Tables */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Database Tables</h2>
            </div>
            <div className="p-6">
              {tables.length === 0 ? (
                <p className="text-gray-500">No Airtable sync tables found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tables.map((table) => (
                    <div key={table.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{table.name}</h3>
                        <span className="text-sm text-gray-500">{table.rowCount} rows</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="font-medium mb-1">Columns:</div>
                        <div className="text-xs space-y-1">
                          {table.columns.slice(0, 5).map((col) => (
                            <div key={col} className="text-gray-500">• {col}</div>
                          ))}
                          {table.columns.length > 5 && (
                            <div className="text-gray-400">... and {table.columns.length - 5} more</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
            </div>
            <p className="text-red-700 mb-4">
              These actions are destructive and cannot be undone. Use with caution.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all migrations? This will require running them again.')) {
                    // Reset migrations
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reset Migrations
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to drop all Airtable sync tables? This will delete all synced data.')) {
                    // Drop tables
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Drop Sync Tables
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}