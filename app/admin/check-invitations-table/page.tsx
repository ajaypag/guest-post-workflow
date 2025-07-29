'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, X, Play, Table } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import Link from 'next/link';

export default function CheckInvitationsTablePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkTable = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/check-invitations-table');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        exists: false,
        columns: []
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
              <Table className="w-8 h-8 mr-3 text-blue-600" />
              Check Invitations Table
            </h1>
            <p className="text-gray-600 mt-2">
              Verify the database structure for the invitations table
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <button
                onClick={checkTable}
                disabled={isLoading}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Check Table Structure
                  </>
                )}
              </button>
            </div>

            {result && (
              <div className="space-y-4">
                {/* Status */}
                <div className={`p-4 rounded-lg flex items-start space-x-3 ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <h3 className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? 'Table Check Complete' : 'Table Check Failed'}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message || result.error}
                    </p>
                  </div>
                </div>

                {/* Table exists info */}
                <div className={`p-4 rounded-lg ${
                  result.exists 
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <h4 className={`font-medium ${
                    result.exists ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Table Exists: {result.exists ? 'YES' : 'NO'}
                  </h4>
                  {result.exists && (
                    <p className="text-green-700 text-sm mt-1">
                      Found {result.columns.length} columns
                    </p>
                  )}
                </div>

                {/* Columns */}
                {result.exists && result.columns && result.columns.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Column Structure:</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 font-medium text-gray-700">Column Name</th>
                              <th className="text-left py-2 font-medium text-gray-700">Data Type</th>
                              <th className="text-left py-2 font-medium text-gray-700">Nullable</th>
                              <th className="text-left py-2 font-medium text-gray-700">Default</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.columns.map((col: any, index: number) => (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="py-2 font-mono text-blue-600">{col.column_name}</td>
                                <td className="py-2 text-gray-600">{col.data_type}</td>
                                <td className="py-2 text-gray-600">{col.is_nullable}</td>
                                <td className="py-2 text-gray-600 font-mono text-xs">
                                  {col.column_default || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expected vs Actual */}
                {result.exists && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Expected Columns
                    </h4>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p className="mb-2">The invitations table should have these columns:</p>
                      <ul className="list-disc list-inside space-y-1 font-mono text-xs">
                        <li>id (uuid)</li>
                        <li>email (varchar)</li>
                        <li>user_type (varchar)</li>
                        <li>role (varchar)</li>
                        <li>token (varchar)</li>
                        <li>expires_at (timestamp)</li>
                        <li>used_at (timestamp)</li>
                        <li>revoked_at (timestamp)</li>
                        <li>created_by_email (varchar)</li>
                        <li>created_at (timestamp)</li>
                        <li>updated_at (timestamp)</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Raw Result */}
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Raw API Response
                  </summary>
                  <pre className="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
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