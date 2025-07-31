'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AlertCircle, CheckCircle, Loader2, CreditCard } from 'lucide-react';

export default function PaymentTablesMigrationPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/admin/payment-tables-migration', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResults(data);
    } catch (err) {
      console.error('Migration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRunning(false);
    }
  };

  return (
    <AuthWrapper requireAdmin>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <h1 className="text-2xl font-bold">Payment Tables Migration</h1>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">About this migration</h3>
                  <p className="text-blue-800 mt-1">
                    This migration creates the payment tracking tables required for recording payments, generating invoices, and tracking payment history.
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                    <li>Creates <code>payments</code> table for payment records</li>
                    <li>Creates <code>invoices</code> table for invoice generation</li>
                    <li>Adds support for partial payments and payment states</li>
                    <li>Enables payment history tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            {!results && !error && (
              <button
                onClick={runMigration}
                disabled={running}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {running ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Run Payment Tables Migration
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900">Migration Failed</h3>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {results && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-900">Migration Completed Successfully</h3>
                      <p className="text-green-700 mt-1">
                        Payment tables have been created and are ready to use.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Migration Results:</h4>
                  <pre className="text-sm text-gray-700 overflow-x-auto">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>

                {results.tablesCreated && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Tables Created:</h4>
                    <ul className="list-disc list-inside text-blue-700">
                      {results.tablesCreated.map((table: string) => (
                        <li key={table}>{table}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}