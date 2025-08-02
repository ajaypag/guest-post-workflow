'use client';

import { useState, useEffect } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AlertCircle, CheckCircle, Database } from 'lucide-react';

interface ConstraintInfo {
  constraint_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

export default function CheckOrderConstraintsPage() {
  const [loading, setLoading] = useState(true);
  const [constraints, setConstraints] = useState<ConstraintInfo[]>([]);
  const [systemUserExists, setSystemUserExists] = useState(false);
  const [accountCount, setAccountCount] = useState(0);
  const [ordersWithAccount, setOrdersWithAccount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConstraints();
  }, []);

  const checkConstraints = async () => {
    try {
      const response = await fetch('/api/admin/check-order-constraints');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setConstraints(data.constraints || []);
        setSystemUserExists(data.systemUserExists || false);
        setAccountCount(data.accountCount || 0);
        setOrdersWithAccount(data.ordersWithAccount || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check constraints');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Order Table Constraints Check</h1>
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Checking database constraints...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-700">Error: {error}</p>
                </div>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Foreign Key Constraints */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Foreign Key Constraints on Orders Table</h2>
                  {constraints.length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b border-gray-200">
                            <th className="pb-2">Constraint Name</th>
                            <th className="pb-2">Column</th>
                            <th className="pb-2">References</th>
                          </tr>
                        </thead>
                        <tbody>
                          {constraints.map((constraint, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-2 font-mono text-sm">{constraint.constraint_name}</td>
                              <td className="py-2">{constraint.column_name}</td>
                              <td className="py-2">
                                {constraint.foreign_table_name}.{constraint.foreign_column_name}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-600">No foreign key constraints found.</p>
                  )}
                </div>

                {/* System User Check */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">System User Status</h2>
                  <div className={`flex items-center gap-2 ${systemUserExists ? 'text-green-700' : 'text-red-700'}`}>
                    {systemUserExists ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <p>
                      System user (00000000-0000-0000-0000-000000000000): {systemUserExists ? 'EXISTS' : 'NOT FOUND'}
                    </p>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900">Total Accounts</h3>
                    <p className="text-2xl font-bold text-blue-700">{accountCount}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-900">Orders with Account ID</h3>
                    <p className="text-2xl font-bold text-purple-700">{ordersWithAccount}</p>
                  </div>
                </div>

                {/* Problem Identification */}
                {constraints.some(c => c.column_name === 'account_id' && c.foreign_table_name === 'users') && (
                  <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-900">Constraint Issue Detected</h3>
                        <p className="text-amber-800 mt-1">
                          The account_id column has a foreign key constraint referencing the users table instead of the accounts table.
                          This is causing the error when account users try to create orders.
                        </p>
                        <p className="text-amber-800 mt-2">
                          Solution: Drop the existing constraint and create a new one referencing the accounts table.
                        </p>
                      </div>
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