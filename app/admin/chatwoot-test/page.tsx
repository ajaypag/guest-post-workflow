'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ChatwootTestPage() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<any>(null);

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/chatwoot/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipientEmail: 'test@example.com',
          testMode: true 
        })
      });

      const data = await response.json();
      setTestResult({
        type: response.ok ? 'success' : 'error',
        data
      });
    } catch (error: any) {
      setTestResult({
        type: 'error',
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!recipientEmail) {
      alert('Please enter a recipient email');
      return;
    }

    setLoading(true);
    setTestResult(null);
    setEmailStatus(null);
    
    try {
      const response = await fetch('/api/admin/chatwoot/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipientEmail,
          recipientName,
          testMode: false 
        })
      });

      const data = await response.json();
      setTestResult({
        type: response.ok ? 'success' : 'error',
        data
      });

      if (response.ok && data.result?.conversationId) {
        setConversationId(data.result.conversationId);
      }
    } catch (error: any) {
      setTestResult({
        type: 'error',
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!conversationId) return;

    setStatusLoading(true);
    
    try {
      const response = await fetch(`/api/admin/chatwoot/test-email?conversationId=${conversationId}`);
      const data = await response.json();
      
      if (response.ok) {
        setEmailStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Chatwoot Email Test</h1>
            </div>
          </div>

          {/* Step 1: Test Connection */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Step 1: Test Chatwoot Connection</h3>
            <button
              onClick={testConnection}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </button>
          </div>

          {/* Step 2: Send Test Email */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Step 2: Send Test Email</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="publisher@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name (optional)
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <button
                onClick={sendTestEmail}
                disabled={loading || !recipientEmail}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Check Status */}
          {conversationId && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Step 3: Check Email Status</h3>
              
              <button
                onClick={checkStatus}
                disabled={statusLoading}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {statusLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Status
                  </>
                )}
              </button>

              {emailStatus && (
                <div className="mt-4 p-4 bg-white rounded-lg border">
                  <p className="text-sm">
                    <strong>Status:</strong> {emailStatus.status}
                  </p>
                  <p className="text-sm">
                    <strong>Has Publisher Response:</strong> {emailStatus.hasPublisherResponse ? 'Yes' : 'No'}
                  </p>
                  {emailStatus.lastActivity && (
                    <p className="text-sm">
                      <strong>Last Activity:</strong> {new Date(emailStatus.lastActivity).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Test Results */}
          {testResult && (
            <div className={`p-6 rounded-lg border ${
              testResult.type === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {testResult.type === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                
                <div className="flex-1">
                  <h4 className={`font-semibold ${
                    testResult.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.type === 'success' ? 'Success!' : 'Error'}
                  </h4>
                  
                  <pre className="mt-2 text-sm whitespace-pre-wrap">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>

                  {testResult.data?.result?.conversationUrl && (
                    <a
                      href={testResult.data.result.conversationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-700"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      View in Chatwoot
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>First test the connection to verify your Chatwoot configuration</li>
              <li>Send a test email to any email address</li>
              <li>Check the status to see if there are any replies</li>
              <li>View the conversation in Chatwoot for full details</li>
            </ol>
            
            <h4 className="font-semibold text-blue-900 mt-4 mb-2">Required Environment Variables:</h4>
            <ul className="text-sm text-blue-800 space-y-1 font-mono">
              <li>• CHATWOOT_API_URL</li>
              <li>• CHATWOOT_API_KEY</li>
              <li>• CHATWOOT_ACCOUNT_ID</li>
              <li>• CHATWOOT_INBOX_ID</li>
              <li>• CHATWOOT_APP_URL (for conversation links)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}