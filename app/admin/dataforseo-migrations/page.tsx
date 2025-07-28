'use client';

import { useState } from 'react';
import { ArrowLeft, Database, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface MigrationResult {
  success: boolean;
  message?: string;
  migrations?: string[];
  error?: string;
  details?: string;
  verifications?: string[];
}

export default function DataForSeoMigrationsPage() {
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const runMigrations = async () => {
    setRunning(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/run-migrations');
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Failed to run migrations',
        details: error.message
      });
    } finally {
      setRunning(false);
    }
  };

  const checkStatus = async () => {
    setChecking(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/run-migrations?check=true');
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Failed to check status',
        details: error.message
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Admin
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-6">
            <Database className="w-6 h-6 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold">DataForSEO Cache Migrations</h1>
          </div>

          <div className="prose max-w-none mb-8">
            <p className="text-gray-600">
              This tool runs database migrations required for the DataForSEO smart caching system.
              The migrations will:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Add caching columns to the bulk_analysis_domains table</li>
              <li>Add batch tracking to keyword_analysis_results</li>
              <li>Create the keyword_search_history table to track zero-result searches</li>
              <li>Create performance indexes for faster queries</li>
            </ul>
          </div>

          <div className="border-t pt-6 flex gap-4">
            <button
              onClick={runMigrations}
              disabled={running || checking}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Migrations...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Run Migrations
                </>
              )}
            </button>
            
            <button
              onClick={checkStatus}
              disabled={running || checking}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Status
                </>
              )}
            </button>
          </div>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? 'Migrations Completed Successfully' : 'Migration Failed'}
                  </h3>
                  {result.message && (
                    <p className={`mt-1 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                  )}
                  {result.error && (
                    <p className="mt-1 text-sm text-red-700">{result.error}</p>
                  )}
                  {result.details && (
                    <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                      {result.details}
                    </pre>
                  )}
                  {result.migrations && result.migrations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-green-900">Completed migrations:</p>
                      <ul className="mt-1 text-sm text-green-700 space-y-0.5">
                        {result.migrations.map((migration, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="w-3 h-3 text-green-600 mr-1.5 flex-shrink-0 mt-0.5" />
                            {migration}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.verifications && result.verifications.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-900">Verification results:</p>
                      <ul className="mt-1 text-sm text-gray-700 space-y-0.5">
                        {result.verifications.map((verification, index) => (
                          <li key={index} className="flex items-start">
                            <span className={verification.includes('✓') ? 'text-green-600' : 'text-red-600'}>
                              {verification}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>These migrations are safe to run multiple times (idempotent)</li>
                  <li>The system will automatically create tables if they don't exist</li>
                  <li>Existing data will not be affected</li>
                  <li>Run this if you see cache-related errors in the console</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}