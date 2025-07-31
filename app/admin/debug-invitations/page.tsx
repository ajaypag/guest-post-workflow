'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, Clock, UserX, Search } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import Link from 'next/link';

export default function DebugInvitationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setData(null);
    
    try {
      const response = await fetch('/api/admin/debug-invitations');
      const result = await response.json();
      setData(result);
    } catch (error) {
      setData({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    setIsLoading(false);
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to Admin
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Search className="w-8 h-8 mr-3 text-purple-600" />
              Debug Invitations
            </h1>
            <p className="text-gray-600 mt-2">
              View all invitations in the database for debugging
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    Fetch All Invitations
                  </>
                )}
              </button>
            </div>

            {data && (
              <div className="space-y-6">
                {/* Statistics */}
                {data.stats && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-blue-600 font-medium">Total</div>
                      <div className="text-2xl font-bold text-blue-800">{data.stats.total || 0}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-green-600 font-medium">Active</div>
                      <div className="text-2xl font-bold text-green-800">{data.stats.active || 0}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-600 font-medium">Used</div>
                      <div className="text-2xl font-bold text-gray-800">{data.stats.used || 0}</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-red-600 font-medium">Revoked</div>
                      <div className="text-2xl font-bold text-red-800">{data.stats.revoked || 0}</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-yellow-600 font-medium">Expired</div>
                      <div className="text-2xl font-bold text-yellow-800">{data.stats.expired || 0}</div>
                    </div>
                  </div>
                )}

                {/* Table Columns */}
                {data.columns && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Table Columns ({data.columns.length}):</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.columns.map((col: any, index: number) => (
                        <span key={index} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">
                          {col.column_name} <span className="text-gray-500">({col.data_type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Invitations */}
                {data.recentInvitations && data.recentInvitations.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-800 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Recent Invitations (Last Hour): {data.recentInvitations.length}
                    </h3>
                    <div className="space-y-2">
                      {data.recentInvitations.map((inv: any, index: number) => (
                        <div key={index} className="bg-yellow-100 rounded p-2 text-sm">
                          <div className="font-mono text-xs">Token: {inv.token}</div>
                          <div>Email: {inv.email} | Table: {inv.target_table || 'N/A'}</div>
                          <div className="text-xs text-yellow-700">Created: {new Date(inv.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Invitations */}
                {data.invitations && data.invitations.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">All Invitations ({data.invitations.length}):</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-2 px-3">Email</th>
                            <th className="text-left py-2 px-3">Target</th>
                            <th className="text-left py-2 px-3">Token</th>
                            <th className="text-left py-2 px-3">Status</th>
                            <th className="text-left py-2 px-3">Created</th>
                            <th className="text-left py-2 px-3">Expires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.invitations.map((inv: any, index: number) => {
                            const isExpired = new Date(inv.expires_at) < new Date();
                            const isUsed = inv.used_at !== null;
                            const isRevoked = inv.revoked_at !== null;
                            const isActive = !isExpired && !isUsed && !isRevoked;
                            
                            return (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="py-2 px-3">{inv.email}</td>
                                <td className="py-2 px-3">{inv.target_table || 'N/A'}</td>
                                <td className="py-2 px-3 font-mono text-xs">{inv.token?.substring(0, 20)}...</td>
                                <td className="py-2 px-3">
                                  {isActive && <span className="text-green-600">Active</span>}
                                  {isUsed && <span className="text-gray-600">Used</span>}
                                  {isRevoked && <span className="text-red-600">Revoked</span>}
                                  {isExpired && !isUsed && !isRevoked && <span className="text-yellow-600">Expired</span>}
                                </td>
                                <td className="py-2 px-3 text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                                <td className="py-2 px-3 text-xs">{new Date(inv.expires_at).toLocaleDateString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : data.invitations ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <UserX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No invitations found in the database</p>
                  </div>
                ) : null}

                {/* Raw Data */}
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Raw Response Data
                  </summary>
                  <pre className="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}