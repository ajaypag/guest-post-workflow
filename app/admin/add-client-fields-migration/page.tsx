'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function AddClientFieldsMigrationPage() {
  return (
    <AuthWrapper>
      <Header />
      <AddClientFieldsMigrationContent />
    </AuthWrapper>
  );
}

function AddClientFieldsMigrationContent() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/admin/add-client-fields-migration', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Add Client Fields Migration</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Migration Details</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">This migration will:</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Add <code className="bg-blue-100 px-1 rounded">accountId</code> field to link clients to accounts</li>
              <li>Add <code className="bg-blue-100 px-1 rounded">shareToken</code> field for lead generation links</li>
              <li>Add <code className="bg-blue-100 px-1 rounded">invitationId</code> field to track sent invitations</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Migration Error</p>
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Migration Successful</p>
                  <div className="mt-2 space-y-1 text-green-800">
                    {results.accountIdAdded && <p>✓ Added accountId column</p>}
                    {results.shareTokenAdded && <p>✓ Added shareToken column</p>}
                    {results.invitationIdAdded && <p>✓ Added invitationId column</p>}
                    {results.alreadyExists && <p>ℹ️ Some columns already exist (skipped)</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={runMigration}
              disabled={isRunning}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Running Migration...
                </>
              ) : (
                'Run Migration'
              )}
            </button>

            <button
              onClick={() => router.push('/admin')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}