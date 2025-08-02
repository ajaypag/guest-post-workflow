'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { AuthService } from '@/lib/auth';

export default function DebugAccountClients() {
  return (
    <AuthWrapper>
      <Header />
      <DebugAccountClientsContent />
    </AuthWrapper>
  );
}

function DebugAccountClientsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accountUserId, setAccountUserId] = useState('');
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Check if user is admin
    const session = AuthService.getSession();
    if (!session || session.role !== 'admin') {
      router.push('/');
    }
  }, [router]);

  const runDiagnostics = async () => {
    if (!accountUserId) {
      setError('Please enter an account user ID');
      return;
    }

    setLoading(true);
    setError('');
    setDiagnostics(null);

    try {
      const response = await fetch('/api/admin/debug-account-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountUserId })
      });

      if (!response.ok) {
        throw new Error('Failed to run diagnostics');
      }

      const data = await response.json();
      setDiagnostics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Account Clients</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Enter Account User ID</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={accountUserId}
              onChange={(e) => setAccountUserId(e.target.value)}
              placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={runDiagnostics}
              disabled={loading || !accountUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Run Diagnostics
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {diagnostics && (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Account Information</h2>
              {diagnostics.account ? (
                <div className="space-y-2">
                  <p><strong>ID:</strong> {diagnostics.account.id}</p>
                  <p><strong>Email:</strong> {diagnostics.account.email}</p>
                  <p><strong>Name:</strong> {diagnostics.account.contactName}</p>
                  <p><strong>Company:</strong> {diagnostics.account.companyName}</p>
                  <p><strong>Primary Client ID:</strong> {diagnostics.account.primaryClientId || 'None'}</p>
                  <p><strong>Status:</strong> {diagnostics.account.status}</p>
                </div>
              ) : (
                <p className="text-red-600">Account not found!</p>
              )}
            </div>

            {/* Session Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Session Information (What auth sees)</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify(diagnostics.sessionInfo, null, 2)}
              </pre>
            </div>

            {/* Clients via Different Methods */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Clients Found via Different Methods</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">1. Primary Client (from account.primaryClientId)</h3>
                  {diagnostics.primaryClient ? (
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                      {JSON.stringify(diagnostics.primaryClient, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-gray-500">No primary client found</p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">2. Clients by AccountId (clients.accountId = account.id)</h3>
                  {diagnostics.clientsByAccountId?.length > 0 ? (
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                      {JSON.stringify(diagnostics.clientsByAccountId, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-gray-500">No clients found with matching accountId</p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">3. All Clients (for comparison)</h3>
                  <p className="text-sm text-gray-600 mb-2">Total clients in system: {diagnostics.allClientsCount}</p>
                  {diagnostics.sampleClients?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Sample of first 5 clients:</p>
                      <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                        {JSON.stringify(diagnostics.sampleClients, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* API Endpoint Tests */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">API Endpoint Results</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">/api/clients (Internal)</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                    {JSON.stringify(diagnostics.internalClientsEndpoint, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">/api/account/clients (Account)</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                    {JSON.stringify(diagnostics.accountClientsEndpoint, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">/api/accounts/client (Dashboard)</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                    {JSON.stringify(diagnostics.dashboardClientsEndpoint, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <div className="space-y-2">
                <p><strong>Account exists:</strong> {diagnostics.account ? 'Yes' : 'No'}</p>
                <p><strong>Has primary client:</strong> {diagnostics.primaryClient ? 'Yes' : 'No'}</p>
                <p><strong>Clients with matching accountId:</strong> {diagnostics.clientsByAccountId?.length || 0}</p>
                <p><strong>Total clients returned by /api/clients:</strong> {diagnostics.internalClientsEndpoint?.clients?.length || 0}</p>
                <p><strong>Total clients returned by /api/account/clients:</strong> {diagnostics.accountClientsEndpoint?.clients?.length || 0}</p>
                <p><strong>Total clients returned by /api/accounts/client:</strong> {diagnostics.dashboardClientsEndpoint?.clients?.length || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}