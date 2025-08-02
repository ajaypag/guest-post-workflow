'use client';

import React, { useState } from 'react';
import { Bug, Key, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function DebugResetTokenPage() {
  const [email, setEmail] = useState('');
  const [rawToken, setRawToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDebug = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/debug-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, rawToken: rawToken || undefined })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to debug token');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bug className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Debug Reset Token</h1>
          </div>

          <div className="mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="text-sm text-purple-700">
                  <p className="font-semibold mb-1">Debug Tool for Password Reset Tokens</p>
                  <p>Enter an email to check the reset token status in the database.</p>
                  <p>Optionally provide the raw token from the URL to verify if it matches.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raw Token (Optional)
              </label>
              <input
                type="text"
                value={rawToken}
                onChange={(e) => setRawToken(e.target.value)}
                placeholder="d488a0f17c041ffb9f09f43a5b7ef807bc6d31fec4a6a2210dae31da03fe1d52"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Copy the token from the reset URL after ?token=
              </p>
            </div>

            <button
              onClick={handleDebug}
              disabled={loading || !email}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key className="w-4 h-4 mr-2" />
              {loading ? 'Debugging...' : 'Debug Token'}
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Account Token Info</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Email:</dt>
                    <dd className="font-mono">{result.accountInfo.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Has Reset Token:</dt>
                    <dd>
                      {result.accountInfo.hasResetToken ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </dd>
                  </div>
                  {result.accountInfo.hasResetToken && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Token Length:</dt>
                        <dd>{result.accountInfo.resetTokenLength} chars</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Token (first 20):</dt>
                        <dd className="font-mono text-xs">{result.accountInfo.resetTokenFirst20}...</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Expiry:</dt>
                        <dd className="text-xs">{new Date(result.accountInfo.resetTokenExpiry).toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Status:</dt>
                        <dd>
                          {result.accountInfo.isExpired ? (
                            <span className="text-red-600">Expired</span>
                          ) : (
                            <span className="text-green-600">Valid ({result.accountInfo.expiryInMinutes} min left)</span>
                          )}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              {/* Token Match Results */}
              {result.tokenMatch && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Token Verification</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Raw Token Length:</dt>
                      <dd>{result.tokenMatch.providedRawTokenLength} chars</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Hashed Token (first 20):</dt>
                      <dd className="font-mono text-xs">{result.tokenMatch.hashedProvidedTokenFirst20}...</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-600">Token Matches:</dt>
                      <dd>
                        {result.tokenMatch.matches ? (
                          <span className="inline-flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            No
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* All Tokens */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  All Reset Tokens ({result.totalAccountsWithTokens})
                </h3>
                {result.allTokens.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Email</th>
                          <th className="text-left py-2">Token (first 20)</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.allTokens.map((token: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2">{token.email}</td>
                            <td className="py-2 font-mono text-xs">{token.tokenFirst20}...</td>
                            <td className="py-2">
                              {token.isExpired ? (
                                <span className="text-red-600">Expired</span>
                              ) : (
                                <span className="text-green-600">Valid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No accounts have reset tokens</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}