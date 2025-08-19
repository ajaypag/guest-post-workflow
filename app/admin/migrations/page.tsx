'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

interface Migration {
  filename: string;
  name: string;
  applied: boolean;
  appliedAt?: string;
  hash?: string;
  content?: string;
  error?: string;
}

interface MigrationStatus {
  databaseVersion: string;
  totalMigrations: number;
  appliedMigrations: number;
  pendingMigrations: number;
  lastMigration?: string;
  lastMigrationDate?: string;
}

export default function MigrationsAdminPage() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMigrations();
  }, []);

  const fetchMigrations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/migrations');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch migrations');
      }
      
      setMigrations(data.migrations);
      setStatus(data.status);
    } catch (error) {
      console.error('Failed to fetch migrations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch migrations');
    } finally {
      setLoading(false);
    }
  };

  const executeMigration = async (filename: string) => {
    if (!confirm(`Are you sure you want to apply migration: ${filename}?\n\nThis action cannot be undone automatically.`)) {
      return;
    }

    try {
      setExecuting(filename);
      setError(null);
      setSuccess(null);
      setExecutionLog([`Starting migration: ${filename}...`]);
      
      const response = await fetch('/api/admin/migrations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute migration');
      }
      
      setExecutionLog(prev => [...prev, ...data.log, '✅ Migration completed successfully']);
      setSuccess(`Successfully applied migration: ${filename}`);
      
      // Refresh migrations list
      await fetchMigrations();
    } catch (error) {
      console.error('Failed to execute migration:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute migration');
      setExecutionLog(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setExecuting(null);
    }
  };

  const executeAllPending = async () => {
    const pendingMigrations = migrations.filter(m => !m.applied);
    
    if (pendingMigrations.length === 0) {
      setError('No pending migrations to apply');
      return;
    }

    if (!confirm(`Are you sure you want to apply ${pendingMigrations.length} pending migrations?\n\nThis will apply:\n${pendingMigrations.map(m => m.filename).join('\n')}`)) {
      return;
    }

    try {
      setExecuting('all');
      setError(null);
      setSuccess(null);
      setExecutionLog([`Starting batch migration of ${pendingMigrations.length} files...`]);
      
      const response = await fetch('/api/admin/migrations/execute-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute migrations');
      }
      
      setExecutionLog(data.log);
      setSuccess(`Successfully applied ${data.applied} migrations`);
      
      // Refresh migrations list
      await fetchMigrations();
    } catch (error) {
      console.error('Failed to execute migrations:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute migrations');
      setExecutionLog(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setExecuting(null);
    }
  };

  const checkDatabaseHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/migrations/health');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Database health check failed');
      }
      
      setSuccess(`Database is healthy. Version: ${data.version}, Tables: ${data.tableCount}, Size: ${data.size}`);
    } catch (error) {
      console.error('Database health check failed:', error);
      setError(error instanceof Error ? error.message : 'Database health check failed');
    } finally {
      setLoading(false);
    }
  };

  const viewMigrationContent = async (migration: Migration) => {
    try {
      const response = await fetch(`/api/admin/migrations/content?filename=${migration.filename}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch migration content');
      }
      
      setSelectedMigration({ ...migration, content: data.content });
    } catch (error) {
      console.error('Failed to fetch migration content:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch migration content');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading migrations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Migrations</h1>
        <p className="text-gray-600">Manage database schema migrations and updates</p>
      </div>

      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
          <strong>Success:</strong> {success}
        </Alert>
      )}

      {/* Status Overview */}
      {status && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Migration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Database Version</p>
              <p className="text-2xl font-bold">{status.databaseVersion}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-gray-600">Applied Migrations</p>
              <p className="text-2xl font-bold text-green-600">{status.appliedMigrations}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <p className="text-sm text-gray-600">Pending Migrations</p>
              <p className="text-2xl font-bold text-yellow-600">{status.pendingMigrations}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Migrations</p>
              <p className="text-2xl font-bold text-blue-600">{status.totalMigrations}</p>
            </div>
          </div>
          {status.lastMigration && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Last applied: <strong>{status.lastMigration}</strong> on {status.lastMigrationDate}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="mb-8 flex flex-wrap gap-4">
        <Button 
          onClick={() => fetchMigrations()}
          disabled={executing !== null}
          className="bg-blue-600 hover:bg-blue-700"
        >
          🔄 Refresh Status
        </Button>
        <Button 
          onClick={executeAllPending}
          disabled={executing !== null || migrations.filter(m => !m.applied).length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          ▶️ Apply All Pending ({migrations.filter(m => !m.applied).length})
        </Button>
        <Button 
          onClick={checkDatabaseHealth}
          disabled={executing !== null}
          className="bg-purple-600 hover:bg-purple-700"
        >
          🏥 Check Database Health
        </Button>
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <Card className="mb-8 p-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Execution Log</h3>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
            {executionLog.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        </Card>
      )}

      {/* Migrations List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Available Migrations</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Migration File</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Applied At</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {migrations.map((migration) => (
                <tr key={migration.filename} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {migration.applied ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Applied
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">{migration.filename}</td>
                  <td className="py-3 px-4">{migration.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {migration.appliedAt || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewMigrationContent(migration)}
                      >
                        👁️ View
                      </Button>
                      {!migration.applied && (
                        <Button
                          size="sm"
                          onClick={() => executeMigration(migration.filename)}
                          disabled={executing !== null}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {executing === migration.filename ? '⏳ Applying...' : '▶️ Apply'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Migration Content Modal */}
      {selectedMigration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{selectedMigration.filename}</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedMigration(null)}
                >
                  ✕ Close
                </Button>
              </div>
              <div className="bg-gray-100 p-4 rounded overflow-y-auto max-h-[60vh]">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {selectedMigration.content || 'Loading...'}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}