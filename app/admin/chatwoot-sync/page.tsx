'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Globe, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ChatwootSyncPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const syncAccounts = async () => {
    setLoading('accounts');
    setResults(null);
    
    try {
      const response = await fetch('/api/admin/chatwoot-sync/accounts', {
        method: 'POST'
      });
      
      const data = await response.json();
      setResults({ type: 'accounts', ...data });
    } catch (error) {
      console.error('Sync failed:', error);
      setResults({ type: 'accounts', error: 'Sync failed' });
    } finally {
      setLoading(null);
    }
  };

  const syncWebsites = async () => {
    setLoading('websites');
    setResults(null);
    
    try {
      const response = await fetch('/api/admin/chatwoot-sync/websites', {
        method: 'POST'
      });
      
      const data = await response.json();
      setResults({ type: 'websites', ...data });
    } catch (error) {
      console.error('Sync failed:', error);
      setResults({ type: 'websites', error: 'Sync failed' });
    } finally {
      setLoading(null);
    }
  };

  const testConnection = async () => {
    setLoading('test');
    setResults(null);
    
    try {
      const response = await fetch('/api/admin/chatwoot-sync/test');
      const data = await response.json();
      setResults({ type: 'test', ...data });
    } catch (error) {
      console.error('Test failed:', error);
      setResults({ type: 'test', error: 'Connection test failed' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/admin" 
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Chatwoot Integration</h1>
          </div>
          
          <p className="text-gray-600">
            Sync Linkio data with your Chatwoot instance
          </p>
        </div>

        {/* Configuration Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Configuration Status</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">API URL:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_CHATWOOT_API_URL || 'Not configured'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Account ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID || 'Not configured'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Inbox ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_CHATWOOT_INBOX_ID || 'Not configured'}
              </code>
            </div>
          </div>

          <button
            onClick={testConnection}
            disabled={loading === 'test'}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading === 'test' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Test Connection
          </button>
        </div>

        {/* Sync Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sync Accounts */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Sync Accounts</h3>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Import all Linkio accounts as Chatwoot contacts. This will create contacts for all advertisers.
            </p>
            
            <button
              onClick={syncAccounts}
              disabled={loading === 'accounts'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'accounts' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Sync Account Contacts
            </button>
          </div>

          {/* Sync Websites */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Sync Website Contacts</h3>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Import website contacts from the Airtable sync. This will create contacts for publishers.
            </p>
            
            <button
              onClick={syncWebsites}
              disabled={loading === 'websites'}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'websites' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              Sync Website Contacts
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">
              {results.type === 'test' && 'Connection Test Results'}
              {results.type === 'accounts' && 'Account Sync Results'}
              {results.type === 'websites' && 'Website Sync Results'}
            </h3>
            
            {results.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-600 mt-1">{results.error}</p>
              </div>
            ) : (
              <div>
                {results.type === 'test' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span>Connection successful!</span>
                    </div>
                    {results.account && (
                      <div className="text-sm text-gray-600">
                        <p>Account: {results.account.name}</p>
                        <p>Inboxes: {results.inboxes?.length || 0}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {(results.type === 'accounts' || results.type === 'websites') && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded p-3">
                        <div className="text-2xl font-bold text-green-600">
                          {results.synced || 0}
                        </div>
                        <div className="text-sm text-green-800">Successfully synced</div>
                      </div>
                      <div className="bg-red-50 rounded p-3">
                        <div className="text-2xl font-bold text-red-600">
                          {results.failed || 0}
                        </div>
                        <div className="text-sm text-red-800">Failed to sync</div>
                      </div>
                    </div>
                    
                    {results.errors && results.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Errors:</h4>
                        <div className="space-y-1 text-sm text-red-600">
                          {results.errors.map((error: string, index: number) => (
                            <div key={index}>• {error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Integration Setup</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li>1. Configure environment variables in your .env file</li>
            <li>2. Test the connection to verify configuration</li>
            <li>3. Sync accounts to import advertiser contacts</li>
            <li>4. Sync websites to import publisher contacts</li>
            <li>5. Configure webhook URL in Chatwoot: <code className="bg-white px-2 py-1 rounded">/api/webhooks/chatwoot</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}