'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Database, PlayCircle, CheckCircle, 
  XCircle, Loader2, AlertTriangle, Info, Shield,
  Users, Globe, Columns, FileText, BarChart3
} from 'lucide-react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export default function PublisherMigrationsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, MigrationResult>>({});
  const [currentMigration, setCurrentMigration] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<Record<string, boolean>>({});

  const migrations = [
    {
      id: 'publisher_offerings_system',
      name: '1. Publisher Offerings System (Core)',
      description: 'Creates 6 core tables: publisher_offerings, publisher_offering_relationships, publisher_pricing_rules, publisher_performance, publisher_payouts, publisher_email_claims',
      icon: <Users className="h-5 w-5 text-blue-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0035_publisher_offerings_system_fixed_v2.sql',
      endpoint: '/api/admin/migrations/publisher-offerings-system'
    },
    {
      id: 'publisher_relationship_columns',
      name: '2. Publisher Relationship Columns',
      description: 'Adds missing columns to publisher_offering_relationships: relationship_type, verification_status, priority_rank, is_preferred',
      icon: <Columns className="h-5 w-5 text-purple-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0038_add_missing_publisher_columns_production.sql',
      endpoint: '/api/admin/migrations/publisher-relationship-columns'
    },
    {
      id: 'website_publisher_columns',
      name: '3. Website Publisher Columns',
      description: 'Adds 20+ columns to websites table including publisher_tier, content configuration, contact fields, and performance metrics',
      icon: <Globe className="h-5 w-5 text-green-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0039_add_missing_website_columns.sql',
      endpoint: '/api/admin/migrations/website-publisher-columns'
    },
    {
      id: 'publisher_offering_columns',
      name: '4. Publisher Offering Columns',
      description: 'Adds missing currency, currentAvailability, and express pricing columns to publisher_offerings table',
      icon: <FileText className="h-5 w-5 text-yellow-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0040_add_missing_publisher_offering_columns.sql',
      endpoint: '/api/admin/migrations/publisher-offering-columns'
    },
    {
      id: 'publisher_performance_columns',
      name: '5. Publisher Performance Columns',
      description: 'Adds missing performance metrics columns to publisher_performance table',
      icon: <BarChart3 className="h-5 w-5 text-cyan-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0041_add_missing_performance_columns.sql',
      endpoint: '/api/admin/migrations/publisher-performance-columns'
    },
    {
      id: 'fix_offering_id_nullable',
      name: '6. Fix Offering ID Nullable',
      description: 'Makes offering_id nullable in publisher_offering_relationships to allow relationships before offerings',
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0042_fix_offering_id_nullable.sql',
      endpoint: '/api/admin/migrations/fix-offering-id-nullable'
    },
    {
      id: 'add_missing_relationship_fields',
      name: '7. Add Missing Relationship Fields',
      description: 'Adds contact info, notes, and payment fields to publisher_offering_relationships table',
      icon: <Users className="h-5 w-5 text-indigo-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0043_add_missing_relationship_fields.sql',
      endpoint: '/api/admin/migrations/add-missing-relationship-fields'
    },
    {
      id: 'domain_normalization',
      name: '8. Domain Normalization',
      description: 'Normalizes all existing domains to prevent duplicates, adds normalized_domain column and triggers',
      icon: <Shield className="h-5 w-5 text-orange-600" />,
      dangerous: false,
      required: true,
      sqlFile: '0037_normalize_existing_domains.sql',
      endpoint: '/api/admin/migrations/domain-normalization'
    },
    {
      id: 'run_all_publisher_migrations',
      name: 'Run All Publisher Migrations (Recommended)',
      description: 'Runs all publisher and domain migrations in the correct order',
      icon: <Database className="h-5 w-5 text-indigo-600" />,
      dangerous: false,
      required: false,
      endpoint: '/api/admin/migrations/run-all-publisher'
    }
  ];

  const checkMigrationStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/admin/migrations/check-status');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data.status || {});
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const runMigration = async (migration: typeof migrations[0]) => {
    if (!confirm(`Are you sure you want to run "${migration.name}"?\n\nThis will modify your database.`)) {
      return;
    }

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
        // Refresh migration status
        await checkMigrationStatus();
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
    const isComplete = migrationStatus[migrationId];
    
    if (result?.success || isComplete) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (result?.success === false) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  // Check status on mount
  useState(() => {
    checkMigrationStatus();
  });

  return (
    <AuthWrapper requireAdmin>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Publisher System Migrations</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Set up the complete publisher portal and domain normalization system
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

            {/* Critical Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">⚠️ Production Database Warning</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    These migrations will modify your production database. Always backup your database before running migrations.
                  </p>
                  <div className="mt-2 p-2 bg-amber-100 rounded font-mono text-xs text-amber-900">
                    pg_dump -h [host] -U [user] -d [database] -F c {'>'} backup_$(date +%Y%m%d_%H%M%S).dmp
                  </div>
                </div>
              </div>
            </div>

            {/* Migration Order Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Migration Order is Critical</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    These migrations must be run in order (1 → 2 → 3 → 4 → 5 → 6). Each builds on the previous one.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Recommended:</strong> Use "Run All Publisher Migrations" to ensure correct order.
                  </p>
                </div>
              </div>
            </div>

            {/* Status Check Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={checkMigrationStatus}
                disabled={checkingStatus}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4" />
                    Check Migration Status
                  </>
                )}
              </button>
            </div>

            {/* Migration List */}
            <div className="space-y-4">
              {migrations.map((migration, index) => (
                <div
                  key={migration.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    migration.id === 'run_all_publisher_migrations' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {migration.icon}
                        <h3 className="font-semibold text-gray-900">
                          {migration.name}
                        </h3>
                        {getMigrationStatus(migration.id)}
                        {migration.required && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Required
                          </span>
                        )}
                        {migration.dangerous && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            Dangerous
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {migration.description}
                      </p>
                      {migration.sqlFile && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          SQL File: migrations/{migration.sqlFile}
                        </p>
                      )}
                      
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
                          {results[migration.id].details && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer">View Details</summary>
                              <pre className="text-xs mt-2 p-2 bg-white rounded overflow-x-auto">
                                {JSON.stringify(results[migration.id].details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => runMigration(migration)}
                      disabled={loading || results[migration.id]?.success || migrationStatus[migration.id]}
                      className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        results[migration.id]?.success || migrationStatus[migration.id]
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : migration.id === 'run_all_publisher_migrations'
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
                      ) : results[migration.id]?.success || migrationStatus[migration.id] ? (
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
            {results['run_all_publisher_migrations']?.success && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">All Publisher Migrations Complete!</h3>
                    <p className="text-sm text-green-800 mt-1">
                      Your database is now set up for the publisher portal system. All tables and columns have been created.
                    </p>
                    <div className="flex gap-3 mt-3">
                      <Link
                        href="/publisher/register"
                        className="text-sm text-green-700 hover:text-green-900 underline"
                      >
                        Test Publisher Registration
                      </Link>
                      <Link
                        href="/internal/websites"
                        className="text-sm text-green-700 hover:text-green-900 underline"
                      >
                        Manage Websites
                      </Link>
                      <Link
                        href="/admin/domain-migration"
                        className="text-sm text-green-700 hover:text-green-900 underline"
                      >
                        View Domain Status
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Migration Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">What These Migrations Do:</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="font-semibold">1.</span>
                  <div>
                    <strong>Publisher Offerings System:</strong> Creates the foundation tables for publisher management,
                    including offerings, relationships, pricing rules, performance tracking, and payouts.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">2.</span>
                  <div>
                    <strong>Relationship Columns:</strong> Adds critical columns for managing publisher-website relationships,
                    including verification status and priority ranking.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">3.</span>
                  <div>
                    <strong>Website Columns:</strong> Adds 20+ columns for publisher-related data on websites,
                    including tier levels, content preferences, and performance metrics.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">4.</span>
                  <div>
                    <strong>Publisher Offering Columns:</strong> Adds missing currency and currentAvailability columns 
                    required by the application code for publisher offerings management.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">5.</span>
                  <div>
                    <strong>Publisher Performance Columns:</strong> Adds comprehensive performance metrics columns 
                    for tracking publisher content approval rates, revenue, and other KPIs.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">6.</span>
                  <div>
                    <strong>Domain Normalization:</strong> Prevents duplicate domains by normalizing all existing entries
                    and adding automatic normalization for new domains.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}