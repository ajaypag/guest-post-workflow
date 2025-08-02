'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Database, ArrowRight, RefreshCw, X } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

interface MigrationStatus {
  systemUserExists: boolean;
  totalDraftOrders: number;
  accountDraftOrders: number;
  needsMigration: number;
  migrationErrors: string[];
  migratedCount: number;
}

interface DraftOrder {
  id: string;
  accountId: string;
  accountEmail: string;
  accountName: string;
  createdBy: string;
  status: string;
  updatedAt: string;
}

export default function DraftOrdersMigrationPage() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('Checking migration status...');

      const response = await fetch('/api/admin/draft-orders-migration/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status');
      }

      setStatus(data.status);
      setDraftOrders(data.draftOrders || []);
      
      addLog(`Found ${data.status.totalDraftOrders} total draft orders`);
      addLog(`${data.status.accountDraftOrders} created by account users`);
      addLog(`${data.status.needsMigration} orders need migration`);
      
      if (!data.status.systemUserExists) {
        addLog('⚠️ System user does not exist - needs to be created first');
      }

    } catch (error: any) {
      console.error('Error checking status:', error);
      setError(error.message);
      addLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createSystemUser = async () => {
    try {
      addLog('Creating system user...');
      
      const response = await fetch('/api/admin/create-system-user', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create system user');
      }

      addLog('✅ System user created successfully');
      await checkStatus();
      
    } catch (error: any) {
      console.error('Error creating system user:', error);
      setError(error.message);
      addLog(`Error creating system user: ${error.message}`);
    }
  };

  const runMigration = async () => {
    try {
      setMigrating(true);
      setError(null);
      addLog('Starting migration...');

      const response = await fetch('/api/admin/draft-orders-migration/migrate', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      addLog(`✅ Migration completed! Migrated ${data.migratedCount} orders`);
      
      if (data.errors && data.errors.length > 0) {
        addLog('⚠️ Some errors occurred during migration:');
        data.errors.forEach((err: string) => addLog(`  - ${err}`));
      }

      await checkStatus();

    } catch (error: any) {
      console.error('Error running migration:', error);
      setError(error.message);
      addLog(`Error during migration: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Database className="h-6 w-6 text-blue-600" />
                Draft Orders Migration
              </h1>
              <button
                onClick={checkStatus}
                disabled={loading || migrating}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <X className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {loading && !status ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-4">Checking migration status...</p>
              </div>
            ) : status && (
              <>
                {/* Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Draft Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">{status.totalDraftOrders}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Account Draft Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">{status.accountDraftOrders}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Needs Migration</p>
                    <p className="text-2xl font-semibold text-gray-900">{status.needsMigration}</p>
                  </div>
                </div>

                {/* System User Status */}
                <div className={`p-4 rounded-lg mb-6 ${
                  status.systemUserExists ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status.systemUserExists ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                      <p className={`font-medium ${
                        status.systemUserExists ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        System User: {status.systemUserExists ? 'Exists' : 'Not Found'}
                      </p>
                    </div>
                    {!status.systemUserExists && (
                      <button
                        onClick={createSystemUser}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                      >
                        Create System User
                      </button>
                    )}
                  </div>
                  {!status.systemUserExists && (
                    <p className="text-sm text-yellow-700 mt-2">
                      System user (ID: 00000000-0000-0000-0000-000000000000) is required for account-created content.
                    </p>
                  )}
                </div>

                {/* Migration Action */}
                {status.needsMigration > 0 && status.systemUserExists && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="font-medium text-blue-900 mb-2">Migration Required</h3>
                    <p className="text-blue-800 mb-4">
                      {status.needsMigration} draft orders were created by account users but have incorrect 
                      created_by references. These need to be migrated to use the system user.
                    </p>
                    <button
                      onClick={runMigration}
                      disabled={migrating}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {migrating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Migrating...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4" />
                          Run Migration
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Success Message */}
                {status.needsMigration === 0 && status.totalDraftOrders > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-green-800">All draft orders are properly configured!</p>
                    </div>
                  </div>
                )}

                {/* Draft Orders List */}
                {draftOrders.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Account Draft Orders ({draftOrders.length})
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Order ID</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Account</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Created By</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {draftOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm font-mono text-gray-600">
                                {order.id.substring(0, 8)}...
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                <div>
                                  <p className="font-medium">{order.accountName}</p>
                                  <p className="text-gray-600">{order.accountEmail}</p>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  order.createdBy === '00000000-0000-0000-0000-000000000000' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {order.createdBy === '00000000-0000-0000-0000-000000000000' 
                                    ? 'System User' 
                                    : 'Needs Migration'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {order.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Migration Logs */}
                {logs.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 mb-3">Activity Log</h3>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono max-h-64 overflow-y-auto">
                      {logs.map((log, index) => (
                        <div key={index} className="mb-1">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}