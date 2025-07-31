'use client';

import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, CheckCircle, X, Play, Wrench, Eye, RefreshCw } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import Link from 'next/link';

export default function FixAccountsTablePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    setDiagnostics(null);
    
    try {
      const response = await fetch('/api/admin/fix-accounts-table?check=true', {
        method: 'GET'
      });
      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      setDiagnostics({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Diagnostics failed'
      });
    }
    
    setIsLoadingDiagnostics(false);
  };

  const runMigration = async () => {
    if (!confirm('Are you sure? This will modify the database structure for the accounts table.')) {
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/fix-accounts-table', {
        method: 'POST'
      });
      const data = await response.json();
      setResult(data);
      
      // Auto-run diagnostics after migration
      setTimeout(() => runDiagnostics(), 1000);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Migration failed'
      });
    }
    
    setIsLoading(false);
  };

  // Run diagnostics on page load
  useEffect(() => {
    runDiagnostics();
  }, []);

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
              <Wrench className="w-8 h-8 mr-3 text-orange-600" />
              Fix Accounts Table
            </h1>
            <p className="text-gray-600 mt-2">
              Add missing 'role' column to accounts table
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {/* Critical Error Alert */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-red-800">CRITICAL: Missing role Column</h3>
                  <p className="text-red-700 text-sm mt-1">
                    Account invitations are failing because the accounts table is missing the 'role' column:
                  </p>
                  <div className="bg-red-100 border border-red-300 rounded p-3 mt-2">
                    <code className="text-sm text-red-800">
                      ERROR: column "role" does not exist
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostics Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-blue-600" />
                  Current Table Status
                </h2>
                <button
                  onClick={runDiagnostics}
                  disabled={isLoadingDiagnostics}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoadingDiagnostics ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Check Status
                </button>
              </div>

              {diagnostics && (
                <div className="space-y-4">
                  {/* Migration Status */}
                  <div className={`p-4 rounded-lg border ${
                    diagnostics.migrationNeeded 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center">
                      {diagnostics.migrationNeeded ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      )}
                      <div>
                        <h3 className={`font-medium ${
                          diagnostics.migrationNeeded ? 'text-red-800' : 'text-green-800'
                        }`}>
                          {diagnostics.migrationNeeded ? 'Migration Required' : 'Schema is Correct'}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          diagnostics.migrationNeeded ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {diagnostics.migrationNeeded 
                            ? 'The accounts table is missing the required "role" column'
                            : 'The accounts table already has the "role" column'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Table Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Table Information:</h4>
                    <div className="text-sm text-blue-700">
                      <div>Total Columns: {diagnostics.tableColumns?.length || 0}</div>
                      <div>Total Accounts: {diagnostics.totalAccounts || 0}</div>
                      <div>Role Column Present: {diagnostics.migrationNeeded ? 'No' : 'Yes'}</div>
                    </div>
                  </div>

                  {/* Columns List */}
                  {diagnostics.tableColumns && (
                    <details className="bg-gray-50 rounded-lg p-4">
                      <summary className="cursor-pointer font-medium text-gray-700">
                        Current Table Columns ({diagnostics.tableColumns.length})
                      </summary>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {diagnostics.tableColumns.map((col: any, index: number) => (
                          <div key={index} className={`text-sm p-2 rounded ${
                            col.column_name === 'role' ? 'bg-green-100 text-green-800' : 'bg-white text-gray-700'
                          }`}>
                            <span className="font-medium">{col.column_name}</span>
                            <span className="text-gray-500 ml-2">({col.data_type})</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Migration Section */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-orange-600" />
                Database Migration
              </h2>
            
              {/* Migration Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium text-blue-800">Schema Migration</h3>
                    <p className="text-blue-700 text-sm mt-1">
                      This migration will fix the accounts table schema:
                    </p>
                    <ul className="list-disc list-inside text-blue-700 text-sm mt-2 space-y-1">
                      <li><strong>Add missing <code>role</code> VARCHAR(50) column</strong> (critical fix)</li>
                      <li>Set default value to 'viewer' for new accounts</li>
                      <li>Validate schema with the exact query that was failing</li>
                      <li>Check for other missing columns and report status</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <button
                  onClick={runMigration}
                  disabled={isLoading || (!diagnostics?.migrationNeeded && diagnostics)}
                  className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Running Migration...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      {diagnostics?.migrationNeeded ? 'Fix Critical Schema Error' : 'No Migration Needed'}
                    </>
                  )}
                </button>
                {!diagnostics?.migrationNeeded && diagnostics && (
                  <p className="text-sm text-gray-600 mt-2">
                    The accounts table already has the required role column.
                  </p>
                )}
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
                        {result.success ? 'Migration Successful' : 'Migration Failed'}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  </div>

                  {/* Changes made */}
                  {result.success && result.changes && result.changes.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Changes Applied:</h4>
                      <ul className="space-y-1">
                        {result.changes.map((change: string, index: number) => (
                          <li key={index} className="text-blue-700 text-sm flex items-center">
                            <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Error details */}
                  {!result.success && result.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-800">Error Details:</h4>
                      <p className="text-red-700 text-sm mt-1 font-mono">{result.error}</p>
                    </div>
                  )}

                  {/* Next steps */}
                  {result.success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Next Steps
                      </h4>
                      <div className="mt-2 text-sm text-green-700">
                        <p className="mb-2">The critical database schema error has been fixed! You can now:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Go back to <Link href="/admin/account-invitations" className="underline">Account Invitations</Link></li>
                          <li>Test sending account invitations (should work without errors)</li>
                          <li>The "column 'role' does not exist" error is resolved</li>
                          <li>All account authentication functionality should now work properly</li>
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
      </div>
    </AuthWrapper>
  );
}