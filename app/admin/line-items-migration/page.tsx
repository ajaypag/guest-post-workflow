'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, AlertTriangle, CheckCircle, XCircle, 
  Loader2, RefreshCw, Database, ArrowRight, Info
} from 'lucide-react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { isLineItemsMigrationUIEnabled } from '@/lib/config/featureFlags';

interface MigrationPlan {
  orderId: string;
  totalGroups: number;
  totalSubmissions: number;
  summary: {
    totalLineItems: number;
    byStatus: Record<string, number>;
    byClient: Record<string, number>;
  };
}

export default function LineItemsMigrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Check feature flag
  if (!isLineItemsMigrationUIEnabled()) {
    return (
      <AuthWrapper>
        <Header />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <h2 className="text-lg font-semibold text-yellow-900">
                  Line Items Migration Not Available
                </h2>
              </div>
              <p className="mt-2 text-yellow-800">
                The line items migration feature is currently disabled. Please contact an administrator to enable it.
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-flex items-center text-yellow-700 hover:text-yellow-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }
  const [orderId, setOrderId] = useState('');
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadRecentOrders();
  }, []);

  const loadRecentOrders = async () => {
    try {
      const response = await fetch('/api/orders?limit=10&sort=createdAt:desc');
      if (response.ok) {
        const data = await response.json();
        setRecentOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to load recent orders:', error);
    }
  };

  const runDryRun = async () => {
    if (!orderId) {
      setError('Please enter an order ID');
      return;
    }

    setLoading(true);
    setError(null);
    setMigrationPlan(null);
    setMigrationResult(null);

    try {
      const response = await fetch('/api/admin/migrate-to-line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, dryRun: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration dry run failed');
      }

      setMigrationPlan(data.migrationPlan);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const executeMigration = async () => {
    if (!orderId || !migrationPlan) return;

    const confirmed = confirm(
      `Are you sure you want to migrate this order?\n\n` +
      `This will create ${migrationPlan.summary.totalLineItems} line items.\n` +
      `This action cannot be easily undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/migrate-to-line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, dryRun: false })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setMigrationResult(data);
      setMigrationPlan(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Line Items Migration</h1>
            <p className="text-gray-600 mt-2">
              Migrate orders from the old orderGroups/submissions model to the new line-items model
            </p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Important Information</h3>
                <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                  <li>• This migration converts orderGroups and submissions to line items</li>
                  <li>• Each link in an orderGroup becomes a separate line item</li>
                  <li>• Existing submissions are mapped to their corresponding line items</li>
                  <li>• Always run a dry run first to preview the migration</li>
                  <li>• This process preserves all pricing, status, and metadata</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Migration Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Select Order to Migrate</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter order ID or select from recent orders"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Recent Orders */}
              {recentOrders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or select from recent orders:
                  </label>
                  <div className="space-y-2">
                    {recentOrders.slice(0, 5).map(order => (
                      <button
                        key={order.id}
                        onClick={() => setOrderId(order.id)}
                        className={`w-full text-left px-3 py-2 border rounded-lg hover:bg-gray-50 ${
                          orderId === order.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        disabled={loading}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">#{order.id.slice(0, 8)}</span>
                            <span className="ml-2 text-sm text-gray-600">
                              {order.account?.contactName || order.account?.email}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              order.metadata?.migratedToLineItems 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {order.metadata?.migratedToLineItems ? 'Migrated' : 'Not Migrated'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={runDryRun}
                  disabled={loading || !orderId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      Run Dry Run
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900">Error</span>
              </div>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Migration Plan (Dry Run Results) */}
          {migrationPlan && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Migration Plan Preview
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-2xl font-bold text-gray-900">
                    {migrationPlan.totalGroups}
                  </div>
                  <div className="text-sm text-gray-600">Order Groups</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-2xl font-bold text-gray-900">
                    {migrationPlan.totalSubmissions}
                  </div>
                  <div className="text-sm text-gray-600">Existing Submissions</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Line Items to Create</h3>
                <div className="bg-blue-50 p-3 rounded mb-3">
                  <div className="text-2xl font-bold text-blue-900">
                    {migrationPlan.summary.totalLineItems}
                  </div>
                  <div className="text-sm text-blue-700">Total Line Items</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">By Status</h4>
                    <div className="space-y-1">
                      {Object.entries(migrationPlan.summary.byStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between text-sm">
                          <span className="text-gray-600">{status}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">By Client</h4>
                    <div className="space-y-1">
                      {Object.entries(migrationPlan.summary.byClient).map(([client, count]) => (
                        <div key={client} className="flex justify-between text-sm">
                          <span className="text-gray-600 truncate">{client}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={executeMigration}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Execute Migration
                </button>
                <button
                  onClick={() => {
                    setMigrationPlan(null);
                    setOrderId('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Migration Result */}
          {migrationResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h2 className="text-lg font-semibold text-green-900">
                  Migration Completed Successfully
                </h2>
              </div>
              
              <div className="space-y-3">
                <p className="text-green-800">
                  Created {migrationResult.stats.lineItemsCreated} line items
                </p>
                
                {migrationResult.stats.byStatus && (
                  <div>
                    <h4 className="text-sm font-medium text-green-900 mb-1">Status Breakdown:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(migrationResult.stats.byStatus).map(([status, count]) => (
                        <span key={status} className="px-2 py-1 bg-white rounded text-sm">
                          {status}: {String(count)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-green-200">
                  <Link
                    href={`/orders/${orderId}/internal`}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    View Order with Line Items
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}