'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AlertCircle, CheckCircle, Wrench } from 'lucide-react';

export default function FixOrderConstraintsPage() {
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fixConstraints = async () => {
    setFixing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/fix-order-constraints', {
        method: 'POST',
      });
      
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fix constraints');
    } finally {
      setFixing(false);
    }
  };

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <Wrench className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Fix Order Table Constraints</h1>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-amber-900 mb-2">What this will do:</h2>
              <ol className="list-decimal list-inside text-amber-800 space-y-1">
                <li>Drop the existing foreign key constraint on orders.account_id that references users table</li>
                <li>Create a new constraint that references the accounts table (if account_id is not null)</li>
                <li>This allows account users to create orders without foreign key violations</li>
              </ol>
            </div>

            {!result && !error && (
              <button
                onClick={fixConstraints}
                disabled={fixing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {fixing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Fixing constraints...
                  </>
                ) : (
                  <>
                    <Wrench className="h-5 w-5" />
                    Fix Order Constraints
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-700 font-medium">Error</p>
                </div>
                <p className="text-red-700 mt-2">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.droppedConstraint && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-green-700 font-medium">Dropped old constraint</p>
                    </div>
                    <p className="text-green-700 mt-1">{result.droppedConstraint}</p>
                  </div>
                )}

                {result.createdConstraint && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-green-700 font-medium">Created new constraint</p>
                    </div>
                    <p className="text-green-700 mt-1">{result.createdConstraint}</p>
                  </div>
                )}

                {result.message && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-700">{result.message}</p>
                  </div>
                )}

                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Refresh Page
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}