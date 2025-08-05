'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2, Mail, MessageSquare, RefreshCw, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function ChatwootTestPage() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<any>(null);
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [loadingInboxes, setLoadingInboxes] = useState(false);

  // Load available inboxes when connection test succeeds
  const loadInboxes = async () => {
    setLoadingInboxes(true);
    try {
      const response = await fetch('/api/admin/chatwoot/inboxes');
      const data = await response.json();
      
      if (response.ok && data.inboxes) {
        setInboxes(data.inboxes);
        // Set default to first inbox or env default
        if (data.inboxes.length > 0 && !selectedInboxId) {
          setSelectedInboxId(data.inboxes[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to load inboxes:', error);
    } finally {
      setLoadingInboxes(false);
    }
  };

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
      
      // Load inboxes on successful connection
      if (response.ok) {
        await loadInboxes();
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
          inboxId: selectedInboxId || undefined,
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

          {/* Inbox Selector - Show after successful connection */}
          {inboxes.length > 0 && (
            <div className="mb-8 p-6 bg-indigo-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Select Email Inbox</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Choose Inbox for Sending
                  </label>
                  <select
                    value={selectedInboxId}
                    onChange={(e) => setSelectedInboxId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loadingInboxes}
                  >
                    {inboxes.map(inbox => (
                      <option key={inbox.id} value={inbox.id}>
                        {inbox.name} ({inbox.channel_type})
                        {inbox.email_address && ` - ${inbox.email_address}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedInboxId && (
                  <div className="text-sm text-indigo-700">
                    <strong>Selected Inbox ID:</strong> {selectedInboxId}
                    <p className="text-xs mt-1">This inbox will be used for sending the test email</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
          <div className="mt-8 space-y-6">
            {/* Chatwoot Setup Guide */}
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-lg font-semibold text-amber-900 mb-4">📋 Chatwoot Setup Guide</h3>
              
              <div className="space-y-4 text-sm text-amber-800">
                <div>
                  <h4 className="font-semibold mb-2">Step 1: Get Your API Access Token</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Log into your Chatwoot instance</li>
                    <li>Click on your profile icon (bottom left)</li>
                    <li>Go to "Profile Settings"</li>
                    <li>Click on "Access Token" tab</li>
                    <li>Copy your access token (or create one if needed)</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 2: Find Your Account ID</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Look at your Chatwoot URL when logged in</li>
                    <li>It should be: <code className="bg-amber-100 px-1">https://your-chatwoot.com/app/accounts/[ACCOUNT_ID]/...</code></li>
                    <li>The number after /accounts/ is your Account ID (usually 1)</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 3: Create or Find an Email Inbox</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Go to Settings → Inboxes</li>
                    <li>Look for an Email-type inbox OR create one:</li>
                    <li className="ml-4">• Click "Add Inbox"</li>
                    <li className="ml-4">• Choose "Email" as channel</li>
                    <li className="ml-4">• Configure SMTP settings (Gmail, SendGrid, etc.)</li>
                    <li className="ml-4">• Save and note the Inbox ID</li>
                    <li>To find Inbox ID: Click on the inbox → Look at URL → <code className="bg-amber-100 px-1">/inboxes/[INBOX_ID]/settings</code></li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 4: Get Your Chatwoot URLs</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>API URL:</strong> Usually <code className="bg-amber-100 px-1">https://your-chatwoot-domain.com</code></li>
                    <li><strong>App URL:</strong> Same as API URL (for generating conversation links)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">🔧 Coolify Environment Variables</h3>
              
              <div className="text-sm text-blue-800">
                <p className="mb-3">Add these to your Coolify application environment variables:</p>
                
                <div className="bg-white rounded-lg p-4 font-mono text-xs border border-blue-200">
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="text-blue-600 w-48">CHATWOOT_API_URL=</span>
                      <span className="text-gray-600">https://your-chatwoot-instance.com</span>
                    </div>
                    <div className="flex">
                      <span className="text-blue-600 w-48">CHATWOOT_API_KEY=</span>
                      <span className="text-gray-600">[Your Access Token from Step 1]</span>
                    </div>
                    <div className="flex">
                      <span className="text-blue-600 w-48">CHATWOOT_ACCOUNT_ID=</span>
                      <span className="text-gray-600">[Your Account ID from Step 2]</span>
                    </div>
                    <div className="flex">
                      <span className="text-blue-600 w-48">CHATWOOT_INBOX_ID=</span>
                      <span className="text-gray-600">[Your Email Inbox ID from Step 3]</span>
                    </div>
                    <div className="flex">
                      <span className="text-blue-600 w-48">CHATWOOT_APP_URL=</span>
                      <span className="text-gray-600">https://your-chatwoot-instance.com</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded">
                  <p className="font-semibold mb-1">⚡ How to update in Coolify:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Go to your PostFlow application in Coolify</li>
                    <li>Click on "Environment Variables" tab</li>
                    <li>Add each variable above</li>
                    <li>Click "Save" and "Redeploy"</li>
                  </ol>
                </div>

                <div className="mt-4 p-3 bg-green-100 rounded">
                  <p className="font-semibold mb-1">✨ Multiple Inbox Support:</p>
                  <p className="text-xs">
                    The CHATWOOT_INBOX_ID is your default inbox. After connecting, you can select different inboxes for each email sent. This allows you to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                    <li>Use different "from" addresses for different types of outreach</li>
                    <li>Separate guest post emails from other communications</li>
                    <li>Route responses to different teams based on inbox</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-3">⚠️ Important Notes</h3>
              
              <ul className="list-disc list-inside space-y-2 text-sm text-red-800">
                <li><strong>Email Inbox Required:</strong> You must use an Email-type inbox in Chatwoot, not a Website/Live Chat inbox</li>
                <li><strong>SMTP Configuration:</strong> Your Chatwoot email inbox needs working SMTP settings to actually send emails</li>
                <li><strong>API Access:</strong> Make sure your API token has full access (not read-only)</li>
                <li><strong>Webhook URL:</strong> After testing works, set up webhook in Chatwoot pointing to: <code className="bg-red-100 px-1">https://your-postflow-domain.com/api/webhooks/chatwoot</code></li>
              </ul>
            </div>

            {/* Quick Test */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">✅ Quick Test After Setup:</h4>
              <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                <li>Click "Test Connection" above - should show inbox details</li>
                <li>Send a test email to yourself</li>
                <li>Check your email and Chatwoot inbox</li>
                <li>Reply to the email and click "Check Status" to see the reply tracked</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}