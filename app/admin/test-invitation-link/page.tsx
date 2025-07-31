'use client';

import React, { useState } from 'react';
import { Link, Database, CheckCircle, XCircle } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import NextLink from 'next/link';

export default function TestInvitationLinkPage() {
  const [token, setToken] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testToken = async () => {
    if (!token) {
      setResult({ error: 'Please enter a token' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Test the verify endpoint
      const response = await fetch(`/api/invitations/verify?token=${token}&type=accounts`);
      const data = await response.json();
      
      setResult({
        status: response.status,
        ok: response.ok,
        data: data
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setIsLoading(false);
  };

  const testFullUrl = async () => {
    if (!inviteUrl) {
      setResult({ error: 'Please enter an invitation URL' });
      return;
    }

    // Extract token from URL
    const urlMatch = inviteUrl.match(/token=([^&]+)/);
    if (!urlMatch) {
      setResult({ error: 'No token found in URL' });
      return;
    }

    setToken(urlMatch[1]);
    
    // Also show what the registration page URL should be
    const baseUrl = window.location.origin;
    const correctUrl = `${baseUrl}/register/account?token=${urlMatch[1]}`;
    
    setResult({
      extractedToken: urlMatch[1],
      correctUrl: correctUrl,
      providedUrl: inviteUrl
    });
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <NextLink
              href="/admin"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to Admin
            </NextLink>
            
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Link className="w-8 h-8 mr-3 text-purple-600" />
              Test Invitation Link
            </h1>
            <p className="text-gray-600 mt-2">
              Debug invitation tokens and URLs
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            {/* Test by URL */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Full Invitation URL</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inviteUrl}
                  onChange={(e) => setInviteUrl(e.target.value)}
                  placeholder="Paste full invitation URL here..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={testFullUrl}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Extract Token
                </button>
              </div>
            </div>

            {/* Test by Token */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Token Directly</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter invitation token..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={testToken}
                  disabled={isLoading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    'Test Token'
                  )}
                </button>
              </div>
            </div>

            {/* Database Check */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Direct Database Check</h3>
              <a
                href={`/api/admin/test-invitation-token?token=${token}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 ${!token ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Database className="w-4 h-4 mr-2" />
                Check in Database
              </a>
            </div>

            {/* Results */}
            {result && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Results:</h3>
                
                {result.correctUrl && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Correct Registration URL:</h4>
                    <a 
                      href={result.correctUrl} 
                      className="text-sm text-green-600 break-all hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {result.correctUrl}
                    </a>
                  </div>
                )}

                {result.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800">Error</h4>
                        <p className="text-red-700 mt-1">{result.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {result.ok !== undefined && (
                  <div className={`p-4 rounded-lg ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start">
                      {result.ok ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-medium ${result.ok ? 'text-green-800' : 'text-red-800'}`}>
                          Status: {result.status} {result.ok ? '(Success)' : '(Failed)'}
                        </h4>
                        {result.data && (
                          <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw result display */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    View Raw Result
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}