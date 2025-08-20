'use client';

import { useState, useEffect } from 'react';

interface Migration {
  id: string;
  file: string;
  name: string;
  description: string;
  critical: boolean;
  status: 'completed' | 'pending' | 'error';
}

export default function MigrationsPage() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningMigration, setRunningMigration] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadMigrations = async () => {
    try {
      const response = await fetch('/api/admin/migrations');
      const data = await response.json();
      
      if (response.ok) {
        setMigrations(data.migrations);
      } else {
        console.error('Failed to load migrations:', data.error);
      }
    } catch (error) {
      console.error('Error loading migrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (migrationId: string) => {
    setRunningMigration(migrationId);
    
    try {
      const response = await fetch('/api/admin/migrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ migrationId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ ${data.message}`);
        await loadMigrations(); // Refresh status
      } else {
        alert(`❌ Migration failed: ${data.error}${data.details ? '\n\nDetails: ' + data.details : ''}`);
      }
    } catch (error) {
      alert(`❌ Error running migration: ${error}`);
    } finally {
      setRunningMigration(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  useEffect(() => {
    loadMigrations();
  }, []);

  const completedCount = migrations.filter(m => m.status === 'completed').length;
  const criticalPending = migrations.filter(m => m.critical && m.status !== 'completed').length;

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Database Migrations</h1>
            <p className="text-gray-600">
              Manage production database migrations. Run these in order for deployment.
            </p>
          </div>
          
          <div className="text-right">
            <button
              onClick={loadMigrations}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-2"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Status'}
            </button>
            <div className="text-sm text-gray-500">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-sm text-gray-600">Completed Migrations</div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{migrations.length - completedCount}</div>
            <div className="text-sm text-gray-600">Pending Migrations</div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <div className={`text-2xl font-bold ${criticalPending > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {criticalPending}
            </div>
            <div className="text-sm text-gray-600">Critical Pending</div>
          </div>
        </div>

        {criticalPending > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-2">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-800">Critical Migrations Pending</h3>
                <p className="text-red-700 text-sm">
                  {criticalPending} critical migration{criticalPending !== 1 ? 's' : ''} must be run before the application will work properly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Migrations Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Migration Files</h2>
            <p className="text-sm text-gray-600 mt-1">
              Run these migrations in order. Critical migrations must be completed.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Migration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {migrations.map((migration, index) => (
                  <tr key={migration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {migration.name}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {migration.file}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(migration.status)}`}>
                        {getStatusIcon(migration.status)} {migration.status.toUpperCase()}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      {migration.critical ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-800 bg-red-100">
                          🚨 CRITICAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                          Optional
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {migration.description}
                    </td>
                    
                    <td className="px-6 py-4">
                      {migration.status === 'completed' ? (
                        <span className="text-green-600 text-sm font-medium">
                          ✅ Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => runMigration(migration.id)}
                          disabled={runningMigration === migration.id}
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            migration.critical
                              ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
                          } disabled:cursor-not-allowed`}
                        >
                          {runningMigration === migration.id ? (
                            <>
                              <span className="inline-block animate-spin mr-2">⏳</span>
                              Running...
                            </>
                          ) : (
                            `Run Migration`
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-3">🔧 Migration Instructions</h3>
          <div className="text-blue-700 text-sm space-y-2">
            <p><strong>1. Run in Order:</strong> Execute migrations in the order shown above</p>
            <p><strong>2. Critical First:</strong> All CRITICAL migrations must complete before deployment</p>
            <p><strong>3. Backup First:</strong> Always backup your database before running migrations in production</p>
            <p><strong>4. Monitor Logs:</strong> Watch server logs for any migration errors or warnings</p>
            <p><strong>5. Verify:</strong> Use "Refresh Status" to confirm migrations completed successfully</p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            For deployment issues, check the database logs and ensure all environment variables are set correctly.
          </p>
        </div>
      </div>
    </div>
  );
}