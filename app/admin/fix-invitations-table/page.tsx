'use client';

import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, CheckCircle, X, Play, Wrench, Eye, RefreshCw } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import Link from 'next/link';

export default function FixInvitationsTablePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    setDiagnostics(null);
    
    try {
      const response = await fetch('/api/admin/comprehensive-diagnostics', {
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
    if (!confirm('Are you sure? This will modify the database structure for the invitations table.')) {
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/fix-invitations-table', {
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
              Fix Invitations Table
            </h1>
            <p className="text-gray-600 mt-2">
              Migrate database columns to match code expectations
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {/* Comprehensive Diagnostics */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-blue-600" />
                  Database Diagnostics
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
                  Refresh
                </button>
              </div>

              {diagnostics && (
                <div className="space-y-4">
                  {/* Critical Issues */}
                  {diagnostics.criticalIssues && diagnostics.criticalIssues.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                        <div className="flex-1">
                          <h3 className="font-medium text-red-800">Critical Issues Found</h3>
                          <div className="mt-2 space-y-2">
                            {diagnostics.criticalIssues.map((issue: any, index: number) => (
                              <div key={index} className="bg-red-100 border border-red-300 rounded p-3">
                                <div className="font-medium text-red-800">{issue.table}: {issue.error}</div>
                                <div className="text-sm text-red-700 mt-1">{issue.description}</div>
                                {issue.query && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-sm font-medium text-red-800">Failed Query</summary>
                                    <pre className="mt-1 text-xs bg-red-200 p-2 rounded overflow-x-auto">{issue.query}</pre>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Table Status */}
                  {diagnostics.tables && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(diagnostics.tables).map(([tableName, tableInfo]: [string, any]) => (
                        <div key={tableName} className={`border rounded-lg p-4 ${
                          tableInfo.status === 'healthy' ? 'bg-green-50 border-green-200' :
                          tableInfo.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{tableName}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              tableInfo.status === 'healthy' ? 'bg-green-100 text-green-800' :
                              tableInfo.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tableInfo.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>Columns: {tableInfo.columnCount}</div>
                            <div>Records: {tableInfo.recordCount}</div>
                            {tableInfo.missingColumns && tableInfo.missingColumns.length > 0 && (
                              <div className="text-red-600 mt-1">
                                Missing: {tableInfo.missingColumns.join(', ')}
                              </div>
                            )}
                            {tableInfo.issues && tableInfo.issues.length > 0 && (
                              <div className="text-orange-600 mt-1">
                                Issues: {tableInfo.issues.length}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Raw Diagnostics */}
                  <details className="bg-gray-50 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-gray-700">
                      Raw Diagnostics Data
                    </summary>
                    <pre className="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(diagnostics, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {isLoadingDiagnostics && !diagnostics && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-gray-600">Running comprehensive diagnostics...</span>
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
                    This migration will fix the invitations table schema:
                  </p>
                  <ul className="list-disc list-inside text-blue-700 text-sm mt-2 space-y-1">
                    <li><strong>Add missing <code>target_table</code> VARCHAR(20) column</strong> (critical fix)</li>
                    <li>Add missing <code>role</code> VARCHAR(50) column if needed</li>
                    <li>Rename <code>accepted_at</code> → <code>used_at</code> if needed</li>
                    <li>Add missing <code>revoked_at</code> TIMESTAMP column</li>
                    <li>Add missing <code>created_by_email</code> VARCHAR(255) column</li>
                    <li>Validate schema with the exact query that was failing</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <button
                onClick={runMigration}
                disabled={isLoading}
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
                    Fix Critical Schema Error
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
                {result.success && result.changes && (
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
                        <li>The "column 'target_table' does not exist" error is resolved</li>
                        <li>All invitation functionality should now work properly</li>
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