'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

export default function TestEmailMigration() {
  const [testResult, setTestResult] = useState<any>(null);
  const [createResult, setCreateResult] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runConnectionTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-email-migration');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, error: error instanceof Error ? error.message : 'Test failed' });
    }
    setLoading(false);
  };

  const runDirectCreation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-email-migration', {
        method: 'POST'
      });
      const data = await response.json();
      setCreateResult(data);
    } catch (error) {
      setCreateResult({ success: false, error: error instanceof Error ? error.message : 'Creation failed' });
    }
    setLoading(false);
  };

  const runFixTable = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/fix-email-logs-table', {
        method: 'POST'
      });
      const data = await response.json();
      setFixResult(data);
    } catch (error) {
      setFixResult({ success: false, error: error instanceof Error ? error.message : 'Fix failed' });
    }
    setLoading(false);
  };

  const runDebug = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/debug-email-logs');
      const data = await response.json();
      setDebugResult(data);
    } catch (error) {
      setDebugResult({ success: false, error: error instanceof Error ? error.message : 'Debug failed' });
    }
    setLoading(false);
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/admin/database-migration"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Database Migration
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Email Migration</h1>
            
            <div className="space-y-6">
              {/* Connection Test */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Database Connection Test</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Test database connectivity and table creation permissions
                </p>
                <button
                  onClick={runConnectionTest}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Run Connection Test'}
                </button>
                
                {testResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Direct Creation Test */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Direct Table Creation Test</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Attempt to create email_logs table directly (will drop existing table first)
                </p>
                <button
                  onClick={runDirectCreation}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Table Directly'}
                </button>
                
                {createResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(createResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Fix Table */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h2 className="font-semibold text-gray-900 mb-3">Fix Email Logs Table</h2>
                <p className="text-gray-600 text-sm mb-4">
                  If the table exists but has missing columns (like sent_at), use this to drop and recreate it properly.
                </p>
                <button
                  onClick={runFixTable}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Fixing...' : 'Fix Table (Drop & Recreate)'}
                </button>
                
                {fixResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(fixResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Debug */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h2 className="font-semibold text-gray-900 mb-3">Debug Email Logs Table</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Comprehensive debug to check table existence using multiple methods
                </p>
                <button
                  onClick={runDebug}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Debugging...' : 'Run Debug'}
                </button>
                
                {debugResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(debugResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}