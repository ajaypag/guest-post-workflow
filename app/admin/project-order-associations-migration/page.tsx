'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

interface MigrationStatus {
  tableExists: boolean;
  existingAssociations: number;
  orderGroupsToMigrate: number;
  readyToMigrate: boolean;
  errors: string[];
}

interface MigrationResult {
  success: boolean;
  action?: 'migrate' | 'reverse';
  migrated?: number;
  restored?: number;
  failed: number;
  errors: string[];
  note?: string;
  details: Array<{
    orderGroupId: string;
    orderId: string;
    projectId: string;
    status: 'success' | 'failed' | 'restored';
    error?: string;
  }>;
}

export default function ProjectOrderAssociationsMigrationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/project-order-associations-migration', {
        method: 'GET',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check migration status');
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (action: 'migrate' | 'reverse' = 'migrate') => {
    try {
      setMigrating(true);
      setError(null);
      setResult(null);
      
      const response = await fetch('/api/admin/project-order-associations-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `${action === 'reverse' ? 'Reverse migration' : 'Migration'} failed`);
      }
      
      const data = await response.json();
      setResult(data);
      
      // Refresh status after migration
      await checkMigrationStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action === 'reverse' ? 'Reverse migration' : 'Migration'} failed`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto p-8">
          <div className="mb-6">
            <Link href="/admin" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center">
                <Database className="h-6 w-6 text-gray-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Project-Order Associations Migration
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Migrate from rigid 1:1 project associations to flexible many-to-many relationships
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <XCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Error</h3>
                          <div className="mt-1 text-sm text-red-700">{error}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {status && (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Migration Status</h3>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Junction Table</span>
                              {status.tableExists ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {status.tableExists ? 'Table exists' : 'Table needs to be created'}
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Existing Associations</span>
                              <span className="text-2xl font-bold text-gray-900">{status.existingAssociations}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Already migrated associations
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Groups to Migrate</span>
                              <span className="text-2xl font-bold text-gray-900">{status.orderGroupsToMigrate}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Order groups with bulkAnalysisProjectId
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Ready to Migrate</span>
                              {status.readyToMigrate ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {status.readyToMigrate ? 'All checks passed' : 'Issues detected'}
                            </p>
                          </div>
                        </div>

                        {status.errors.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                            <div className="flex">
                              <AlertCircle className="h-5 w-5 text-yellow-400" />
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">Issues Detected</h3>
                                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                                  {status.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {result && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Migration Result</h3>
                          
                          <div className={`border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-md p-4`}>
                            <div className="flex">
                              {result.success ? (
                                <CheckCircle className="h-5 w-5 text-green-400" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-400" />
                              )}
                              <div className="ml-3">
                                <h3 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                  {result.success 
                                    ? result.action === 'reverse' 
                                      ? 'Reverse Migration Completed' 
                                      : 'Migration Completed'
                                    : result.action === 'reverse'
                                      ? 'Reverse Migration Failed'
                                      : 'Migration Failed'}
                                </h3>
                                <div className="mt-2 text-sm">
                                  {result.action === 'reverse' ? (
                                    <>
                                      <p>Successfully restored: {result.restored}</p>
                                      <p>Failed: {result.failed}</p>
                                      {result.note && <p className="mt-2">{result.note}</p>}
                                    </>
                                  ) : (
                                    <>
                                      <p>Successfully migrated: {result.migrated}</p>
                                      <p>Failed: {result.failed}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {result.details.length > 0 && (
                            <div className="border border-gray-200 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-2">Migration Details</h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {result.details.map((detail, i) => (
                                  <div
                                    key={i}
                                    className={`text-sm p-2 rounded ${
                                      detail.status === 'success' || detail.status === 'restored'
                                        ? 'bg-green-50 text-green-800' 
                                        : 'bg-red-50 text-red-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>Order Group: {detail.orderGroupId.slice(0, 8)}...</span>
                                      {detail.status === 'success' || detail.status === 'restored' ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        <XCircle className="h-4 w-4" />
                                      )}
                                    </div>
                                    {detail.error && (
                                      <p className="text-xs mt-1">{detail.error}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <button
                            onClick={() => runMigration('migrate')}
                            disabled={!status.readyToMigrate || migrating || (status.orderGroupsToMigrate === 0 && status.tableExists)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {migrating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {status.tableExists ? 'Migrating...' : 'Creating Tables...'}
                              </>
                            ) : (
                              <>
                                <Database className="mr-2 h-4 w-4" />
                                {!status.tableExists ? 'Create Tables' : 'Run Migration'}
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={checkMigrationStatus}
                            disabled={loading || migrating}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Refresh Status
                          </button>
                        </div>

                        {status.existingAssociations > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Reverse Migration</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              Restore direct bulkAnalysisProjectId references from junction table associations.
                            </p>
                            <button
                              onClick={() => runMigration('reverse')}
                              disabled={migrating || status.existingAssociations === 0}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {migrating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Reversing...
                                </>
                              ) : (
                                <>
                                  <ArrowLeft className="mr-2 h-4 w-4" />
                                  Reverse Migration
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {status.orderGroupsToMigrate === 0 && status.existingAssociations === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                          <div className="flex">
                            <AlertCircle className="h-5 w-5 text-yellow-400" />
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">No Data to Migrate</h3>
                              <div className="mt-1 text-sm text-yellow-700">
                                <p>No order groups have bulkAnalysisProjectId set. This could mean:</p>
                                <ul className="list-disc list-inside mt-2">
                                  <li>No bulk analysis projects have been created yet</li>
                                  <li>Order groups haven't been linked to projects</li>
                                  <li>The system is using a different association method</li>
                                </ul>
                                <p className="mt-2">
                                  Check <a href="/api/admin/debug-order-groups" className="underline text-yellow-800 hover:text-yellow-900" target="_blank">debug endpoint</a> for more details.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {status.orderGroupsToMigrate === 0 && status.existingAssociations > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-green-800">Migration Complete</h3>
                              <div className="mt-1 text-sm text-green-700">
                                All order groups have been migrated to the flexible association model.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}