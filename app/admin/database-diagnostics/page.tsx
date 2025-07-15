'use client';

import React, { useState } from 'react';
import { Database, Search, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function DatabaseDiagnosticsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const addResult = (title: string, data: any, status: 'success' | 'error' | 'info' = 'info') => {
    setResults(prev => [...prev, { title, data, status, timestamp: new Date().toISOString() }]);
  };

  const runFullDiagnostics = async () => {
    setIsLoading(true);
    setResults([]);
    setMessage('Running comprehensive database diagnostics...');

    try {
      // 1. Check database connection
      addResult('Database Connection Test', 'Testing...');
      try {
        const dbResponse = await fetch('/api/admin/test-db-connection');
        const dbData = await dbResponse.json();
        addResult('Database Connection Test', dbData, dbResponse.ok ? 'success' : 'error');
      } catch (error) {
        addResult('Database Connection Test', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      }

      // 2. List all tables
      addResult('All Database Tables', 'Fetching...');
      try {
        const tablesResponse = await fetch('/api/admin/database-diagnostics/tables');
        const tablesData = await tablesResponse.json();
        addResult('All Database Tables', tablesData, tablesResponse.ok ? 'success' : 'error');
      } catch (error) {
        addResult('All Database Tables', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      }

      // 3. Check specific audit tables
      addResult('Semantic Audit Tables Check', 'Checking...');
      try {
        const auditResponse = await fetch('/api/admin/check-semantic-audit-tables');
        const auditData = await auditResponse.json();
        addResult('Semantic Audit Tables Check', auditData, auditResponse.ok ? 'success' : 'error');
      } catch (error) {
        addResult('Semantic Audit Tables Check', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      }

      // 4. Check audit_sessions columns if table exists
      addResult('audit_sessions Column Structure', 'Checking...');
      try {
        const columnsResponse = await fetch('/api/admin/database-diagnostics/audit-sessions-columns');
        const columnsData = await columnsResponse.json();
        addResult('audit_sessions Column Structure', columnsData, columnsResponse.ok ? 'success' : 'error');
      } catch (error) {
        addResult('audit_sessions Column Structure', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      }

      // 5. Test actual semantic audit table creation with full logging
      addResult('Semantic Audit Migration Test', 'Testing...');
      try {
        const migrationResponse = await fetch('/api/admin/database-diagnostics/test-semantic-migration');
        const migrationData = await migrationResponse.json();
        addResult('Semantic Audit Migration Test', migrationData, migrationResponse.ok ? 'success' : 'error');
      } catch (error) {
        addResult('Semantic Audit Migration Test', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      }

      // 6. Check final polish status
      addResult('Final Polish Status Check', 'Checking...');
      try {
        const polishResponse = await fetch('/api/admin/migrate-final-polish', { method: 'GET' });
        const polishData = await polishResponse.json();
        addResult('Final Polish Status Check', polishData, polishResponse.ok ? 'success' : 'error');
      } catch (error) {
        addResult('Final Polish Status Check', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      }

      setMessage('✅ Diagnostics complete! Check results below.');
    } catch (error) {
      setMessage(`❌ Diagnostics failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setIsLoading(false);
  };

  const runSemanticMigrationTest = async () => {
    setIsLoading(true);
    setMessage('Testing semantic audit migration with detailed logging...');

    try {
      const response = await fetch('/api/admin/database-diagnostics/test-semantic-migration');
      const data = await response.json();
      
      addResult('Semantic Migration Test Result', data, response.ok ? 'success' : 'error');
      setMessage(response.ok ? '✅ Migration test complete' : '❌ Migration test failed');
    } catch (error) {
      addResult('Semantic Migration Test Result', { error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      setMessage(`❌ Migration test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">Database Migration Diagnostics</h1>
          </div>

          {/* Big Red Warning */}
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-2">🚨 MIGRATION FAILURE INVESTIGATION</h2>
                <p className="text-red-800 mb-4">
                  The semantic audit tables keep failing to create despite migration success messages. 
                  This page will help us understand exactly what's happening in your database.
                </p>
                <p className="text-sm text-red-700">
                  Click the buttons below to run comprehensive diagnostics and get detailed logging.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-8 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Full Database Diagnostics</h3>
              <p className="text-blue-800 text-sm mb-3">
                Runs all checks: connection, tables, columns, migration tests
              </p>
              <button
                onClick={runFullDiagnostics}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Search className="w-5 h-5" />
                <span>{isLoading ? 'Running Diagnostics...' : 'Run Full Diagnostics'}</span>
              </button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Semantic Migration Deep Test</h3>
              <p className="text-purple-800 text-sm mb-3">
                Specifically tests semantic audit table creation with extensive logging
              </p>
              <button
                onClick={runSemanticMigrationTest}
                disabled={isLoading}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <FileText className="w-5 h-5" />
                <span>{isLoading ? 'Testing Migration...' : 'Test Semantic Migration'}</span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.includes('✅') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : message.includes('❌')
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-start space-x-3">
                {message.includes('✅') && <CheckCircle className="w-5 h-5 mt-0.5" />}
                {message.includes('❌') && <X className="w-5 h-5 mt-0.5" />}
                {!message.includes('✅') && !message.includes('❌') && <Database className="w-5 h-5 mt-0.5" />}
                <p className="text-sm">{message}</p>
              </div>
            </div>
          )}

          {/* Results Display */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Diagnostic Results</h2>
              {results.map((result, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  result.status === 'success' 
                    ? 'border-green-200 bg-green-50' 
                    : result.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium ${
                      result.status === 'success' 
                        ? 'text-green-900' 
                        : result.status === 'error'
                        ? 'text-red-900'
                        : 'text-blue-900'
                    }`}>
                      {result.title}
                    </h3>
                    <span className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className={`text-xs overflow-x-auto p-3 rounded bg-white border ${
                    result.status === 'success' 
                      ? 'border-green-200 text-green-800' 
                      : result.status === 'error'
                      ? 'border-red-200 text-red-800'
                      : 'border-blue-200 text-blue-800'
                  }`}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href="/admin/database-migration"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Migration Manager
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}