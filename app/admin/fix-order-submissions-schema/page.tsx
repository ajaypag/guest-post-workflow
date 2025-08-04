'use client';

import { useState, useEffect } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SchemaCheckResult {
  tableName: string;
  exists: boolean;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>;
  missingColumns: string[];
  expectedColumns: string[];
}

export default function FixOrderSubmissionsSchemaPage() {
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<SchemaCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const checkSchema = async () => {
    setChecking(true);
    setError(null);
    setResult(null);
    setFixResult(null);

    try {
      const response = await fetch('/api/admin/check-order-submissions-schema');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check schema');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const fixSchema = async () => {
    setFixing(true);
    setError(null);
    setFixResult(null);

    try {
      const response = await fetch('/api/admin/fix-order-submissions-schema', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix schema');
      }

      setFixResult(data.message);
      // Re-check schema after fix
      await checkSchema();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    checkSchema();
  }, []);

  return (
    <AuthWrapper requireAdmin>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-6">Fix Order Submissions Schema</h1>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">Issue Detected</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The API is trying to insert a `client_reviewed_by` column that doesn't exist in the database.
                      This is causing the "Failed to add domains" error.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Error</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {fixResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800">Fix Applied</p>
                      <p className="text-sm text-green-700">{fixResult}</p>
                    </div>
                  </div>
                </div>
              )}

              {checking ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking database schema...</span>
                </div>
              ) : result && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Table: {result.tableName}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Status: {result.exists ? (
                        <span className="text-green-600 font-medium">✓ Table exists</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Table missing</span>
                      )}
                    </p>
                  </div>

                  {result.exists && (
                    <>
                      <div>
                        <h4 className="font-medium mb-2">Current Columns in Database:</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <ul className="space-y-1 text-sm font-mono">
                            {result.columns.map((col) => (
                              <li key={col.column_name}>
                                {col.column_name}: {col.data_type} 
                                {col.is_nullable === 'NO' && ' (NOT NULL)'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Expected Columns from Schema:</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <ul className="space-y-1 text-sm font-mono">
                            {result.expectedColumns.map((col) => (
                              <li key={col} className={
                                result.missingColumns.includes(col) ? 'text-red-600' : ''
                              }>
                                {col}
                                {result.missingColumns.includes(col) && ' (MISSING)'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {result.missingColumns.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-red-600">Missing Columns:</h4>
                          <div className="bg-red-50 rounded-lg p-3">
                            <ul className="space-y-1 text-sm">
                              {result.missingColumns.map((col) => (
                                <li key={col} className="text-red-700">
                                  • {col}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">
                              SQL to fix (will be run automatically):
                            </p>
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
{`ALTER TABLE order_site_submissions 
ADD COLUMN client_reviewed_by UUID REFERENCES users(id);`}
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={checkSchema}
                      disabled={checking}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checking ? (
                        <>
                          <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        'Re-check Schema'
                      )}
                    </button>

                    {result?.missingColumns.length > 0 && (
                      <button
                        onClick={fixSchema}
                        disabled={fixing}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fixing ? (
                          <>
                            <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                            Applying Fix...
                          </>
                        ) : (
                          'Fix Missing Columns'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}