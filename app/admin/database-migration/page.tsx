'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Database, PlayCircle, CheckCircle, 
  XCircle, Loader2, AlertTriangle, Info, Shield
} from 'lucide-react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export default function DatabaseMigrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, MigrationResult>>({});
  const [currentMigration, setCurrentMigration] = useState<string | null>(null);

  const migrations = [
    {
      id: 'create_line_items_tables',
      name: 'Create Line Items Tables',
      description: 'Creates order_line_items, line_item_changes, and line_item_templates tables for the new line items system',
      dangerous: false,
      endpoint: '/api/admin/database-migrations/create-line-items-tables'
    },
    {
      id: 'create_benchmark_table',
      name: 'Create Order Benchmarks Table',
      description: 'Creates order_benchmarks table for tracking pricing history and selections',
      dangerous: false,
      endpoint: '/api/admin/database-migrations/create-benchmark-table'
    },
    {
      id: 'add_inclusion_status_columns',
      name: 'Add Inclusion Status Columns',
      description: 'Adds inclusionStatus, inclusionOrder, and exclusionReason columns to order_site_submissions',
      dangerous: false,
      endpoint: '/api/admin/database-migrations/add-inclusion-columns'
    },
    {
      id: 'migrate_pool_to_status',
      name: 'Migrate Pool System to Status System',
      description: 'Converts old pool system (primary/alternative) to new inclusion status system',
      dangerous: false,
      endpoint: '/api/admin/pool-to-status-migration'
    },
    {
      id: 'run_all_migrations',
      name: 'Run All Migrations',
      description: 'Runs all database migrations in the correct order',
      dangerous: false,
      endpoint: '/api/admin/database-migrations/run-all'
    }
  ];

  const runMigration = async (migration: typeof migrations[0]) => {
    setLoading(true);
    setCurrentMigration(migration.id);

    try {
      const response = await fetch(migration.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execute: true })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(prev => ({
          ...prev,
          [migration.id]: {
            success: true,
            message: data.message || 'Migration completed successfully',
            details: data
          }
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [migration.id]: {
            success: false,
            message: data.error || 'Migration failed',
            error: data.error
          }
        }));
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [migration.id]: {
          success: false,
          message: 'Failed to run migration',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setLoading(false);
      setCurrentMigration(null);
    }
  };

  const getMigrationStatus = (migrationId: string) => {
    const result = results[migrationId];
    if (!result) return null;
    
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <AuthWrapper requireAdmin>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Database Migrations</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Run database migrations to set up the line items system
                  </p>
                </div>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Link>
            </div>

            {/* Important Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Before You Begin</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    These migrations will create new database tables for the line items system. 
                    They are safe to run multiple times - existing tables won't be affected.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Recommended:</strong> Click "Run All Migrations" to set up everything at once.
                  </p>
                </div>
              </div>
            </div>

            {/* Migration List */}
            <div className="space-y-4">
              {migrations.map(migration => (
                <div
                  key={migration.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">
                          {migration.name}
                        </h3>
                        {getMigrationStatus(migration.id)}
                        {migration.dangerous && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            Dangerous
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {migration.description}
                      </p>
                      
                      {/* Result Message */}
                      {results[migration.id] && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          results[migration.id].success 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`text-sm ${
                            results[migration.id].success ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {results[migration.id].message}
                          </p>
                          {results[migration.id].details?.tablesCreated && (
                            <p className="text-xs text-green-700 mt-1">
                              Tables created: {results[migration.id].details.tablesCreated.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => runMigration(migration)}
                      disabled={loading || results[migration.id]?.success}
                      className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        results[migration.id]?.success
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : migration.id === 'run_all_migrations'
                          ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                          : migration.dangerous
                          ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                          : 'bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50'
                      }`}
                    >
                      {loading && currentMigration === migration.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running...
                        </>
                      ) : results[migration.id]?.success ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4" />
                          Run
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Success Message */}
            {results['run_all_migrations']?.success && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">All Migrations Complete!</h3>
                    <p className="text-sm text-green-800 mt-1">
                      Your database is now set up for the line items system. You can start using the new features.
                    </p>
                    <div className="flex gap-3 mt-3">
                      <Link
                        href="/admin/line-items-migration"
                        className="text-sm text-green-700 hover:text-green-900 underline"
                      >
                        Migrate existing orders to line items
                      </Link>
                      <Link
                        href="/orders"
                        className="text-sm text-green-700 hover:text-green-900 underline"
                      >
                        View orders
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}