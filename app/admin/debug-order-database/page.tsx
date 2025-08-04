'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { Loader2, Search, Database } from 'lucide-react';

interface OrderGroup {
  id: string;
  orderId: string;
  clientId: string;
  linkCount: number;
  targetPages: any[];
  anchorTexts: string[];
  requirementOverrides: any;
  groupStatus: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    website: string;
  };
}

interface Order {
  id: string;
  status: string;
  state: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  totalRetail: number;
  orderGroups: OrderGroup[];
}

export default function DebugOrderDatabasePage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const queryDatabase = async () => {
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/admin/debug-order-database?orderId=${encodeURIComponent(orderId.trim())}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to query database');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('Error querying database:', err);
      setError(err.message || 'Failed to query database');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔍 Order Database Query Tool
            </h1>
            <p className="text-gray-600">
              Enter an order ID to see exactly what's stored in the database
            </p>
          </div>

          {/* Query Interface */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID
                </label>
                <input
                  type="text"
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter full order ID (e.g., b4c67afe-c8b4-4926-9924-90fc21764c39)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && queryDatabase()}
                />
              </div>
              <button
                onClick={queryDatabase}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Query Database
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Order Information
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Order ID</p>
                    <p className="text-sm text-gray-900 font-mono">{result.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        result.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        result.status === 'pending_confirmation' ? 'bg-yellow-100 text-yellow-700' :
                        result.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {result.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">State</p>
                    <p className="text-sm text-gray-900">{result.state}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total</p>
                    <p className="text-sm text-gray-900">${result.totalRetail}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Account ID</p>
                    <p className="text-sm text-gray-900 font-mono">{result.accountId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created</p>
                    <p className="text-sm text-gray-900">{new Date(result.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Updated</p>
                    <p className="text-sm text-gray-900">{new Date(result.updatedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Order Groups</p>
                    <p className="text-sm text-gray-900 font-bold">{result.orderGroups.length} groups</p>
                  </div>
                </div>
              </div>

              {/* Order Groups */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Order Groups ({result.orderGroups.length})
                </h2>
                
                {result.orderGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Order Groups Found</p>
                    <p className="text-sm">This order has no order groups in the database</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {result.orderGroups.map((group, index) => (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-900">
                            Group {index + 1}: {group.client?.name || `Client ${group.clientId}`}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            group.groupStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            group.groupStatus === 'active' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {group.groupStatus}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-500">Group ID</p>
                            <p className="text-gray-900 font-mono text-xs">{group.id}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">Client ID</p>
                            <p className="text-gray-900 font-mono text-xs">{group.clientId}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">Link Count</p>
                            <p className="text-gray-900 font-bold">{group.linkCount}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">Target Pages</p>
                            <p className="text-gray-900 font-bold">{group.targetPages?.length || 0} pages</p>
                          </div>
                        </div>

                        {group.client && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm font-medium text-gray-500 mb-1">Client Details</p>
                            <p className="text-sm text-gray-900">{group.client.name} - {group.client.website}</p>
                          </div>
                        )}

                        {group.targetPages && group.targetPages.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm font-medium text-gray-500 mb-2">Target Pages</p>
                            <div className="space-y-1">
                              {group.targetPages.map((page: any, pageIndex: number) => (
                                <p key={pageIndex} className="text-sm text-gray-700">
                                  • {typeof page === 'string' ? page : page.url || JSON.stringify(page)}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {group.anchorTexts && group.anchorTexts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm font-medium text-gray-500 mb-2">Anchor Texts</p>
                            <div className="space-y-1">
                              {group.anchorTexts.map((anchor: string, anchorIndex: number) => (
                                <p key={anchorIndex} className="text-sm text-gray-700">
                                  • {anchor}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                          <p>Created: {new Date(group.createdAt).toLocaleString()}</p>
                          <p>Updated: {new Date(group.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}