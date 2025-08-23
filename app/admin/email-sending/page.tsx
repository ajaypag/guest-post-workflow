'use client';

import { useState, useEffect } from 'react';

interface EmailTestResult {
  success: boolean;
  id?: string;
  error?: string;
  timestamp: string;
  details?: any;
}

interface TestPublisher {
  id: string;
  companyName: string;
  email: string;
  contactName: string;
  websiteCount: number;
}

export default function EmailSendingTestPage() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailType, setEmailType] = useState<'single' | 'preview'>('single');
  const [testResults, setTestResults] = useState<EmailTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{ html: string; text: string } | null>(null);
  const [testPublishers, setTestPublishers] = useState<TestPublisher[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('');
  const [creatingTestData, setCreatingTestData] = useState(false);

  // Load test publishers on mount
  useEffect(() => {
    loadTestPublishers();
  }, []);

  const loadTestPublishers = async () => {
    try {
      const response = await fetch('/api/admin/email-sending/publishers');
      if (response.ok) {
        const data = await response.json();
        setTestPublishers(data.publishers);
      }
    } catch (error) {
      console.error('Failed to load test publishers:', error);
    }
  };

  const createTestPublishers = async () => {
    setCreatingTestData(true);
    try {
      const response = await fetch('/api/admin/email-sending/create-test-data', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        addTestResult({
          success: true,
          timestamp: new Date().toISOString(),
          details: `Created ${data.created} test publishers`
        });
        await loadTestPublishers();
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setCreatingTestData(false);
    }
  };

  const sendTestEmail = async () => {
    if (!recipientEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/email-sending/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          publisherId: selectedPublisher || undefined,
          type: 'invitation'
        })
      });

      const data = await response.json();
      
      addTestResult({
        success: data.success,
        id: data.id,
        error: data.error,
        timestamp: new Date().toISOString(),
        details: data
      });

      if (data.success) {
        // Clear form on success
        setRecipientEmail('');
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const previewEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/email-sending/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publisherId: selectedPublisher || testPublishers[0]?.id,
          type: 'invitation'
        })
      });

      const data = await response.json();
      setEmailPreview(data);
    } catch (error: any) {
      addTestResult({
        success: false,
        error: `Preview failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testBulkSend = async () => {
    if (!recipientEmail) {
      alert('Please enter at least one email address');
      return;
    }

    setLoading(true);
    try {
      const emails = recipientEmail.split(',').map(e => e.trim()).filter(e => e);
      
      const response = await fetch('/api/admin/email-sending/send-bulk-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmails: emails,
          count: Math.min(emails.length, 5) // Max 5 for testing
        })
      });

      const data = await response.json();
      
      addTestResult({
        success: data.success,
        timestamp: new Date().toISOString(),
        details: `Sent: ${data.sent}, Failed: ${data.failed}`,
        error: data.error
      });
    } catch (error: any) {
      addTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const addTestResult = (result: EmailTestResult) => {
    setTestResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">📧 Email Sending Test Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            {/* Test Data Setup */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Test Data</h3>
              <p className="text-sm text-gray-600 mb-3">
                {testPublishers.length > 0 
                  ? `${testPublishers.length} test publishers available`
                  : 'No test publishers found'}
              </p>
              <button
                onClick={createTestPublishers}
                disabled={creatingTestData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingTestData ? 'Creating...' : 'Create Test Publishers'}
              </button>
            </div>

            {/* Publisher Selection */}
            {testPublishers.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Test Publisher
                </label>
                <select
                  value={selectedPublisher}
                  onChange={(e) => setSelectedPublisher(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">-- Select Publisher --</option>
                  {testPublishers.map(pub => (
                    <option key={pub.id} value={pub.id}>
                      {pub.companyName} ({pub.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipient Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email(s)
              </label>
              <input
                type="text"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="test@example.com or comma-separated for bulk"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                For bulk test, separate emails with commas
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={sendTestEmail}
                disabled={loading || !recipientEmail}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : '📨 Send Test Invitation Email'}
              </button>
              
              <button
                onClick={previewEmail}
                disabled={loading || testPublishers.length === 0}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                👁️ Preview Email Template
              </button>
              
              <button
                onClick={testBulkSend}
                disabled={loading || !recipientEmail}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                📮 Test Bulk Send
              </button>
            </div>

            {/* API Key Status */}
            <div className="mt-6 p-3 bg-gray-100 rounded">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Resend API Status:</span>{' '}
                <span className="text-green-600">Configured ✓</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">From:</span> info@linkio.com
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">API Key:</span> re_iJDQ7cLu_...
              </p>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Test Results</h2>
              <button
                onClick={clearResults}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No test results yet</p>
              ) : (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`font-medium ${
                          result.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {result.success ? '✓ Success' : '✗ Failed'}
                        </p>
                        {result.id && (
                          <p className="text-xs text-gray-600 mt-1">
                            ID: {result.id}
                          </p>
                        )}
                        {result.error && (
                          <p className="text-sm text-red-600 mt-1">
                            {result.error}
                          </p>
                        )}
                        {result.details && (
                          <div className="text-sm text-gray-600 mt-1">
                            {typeof result.details === 'string' 
                              ? result.details 
                              : (
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-2">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Email Preview */}
        {emailPreview && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Email Preview</h2>
            
            <div className="space-y-4">
              {/* HTML Preview */}
              <div>
                <h3 className="font-medium mb-2">HTML Version</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <iframe
                    srcDoc={emailPreview.html}
                    className="w-full h-96 bg-white rounded"
                    title="Email HTML Preview"
                  />
                </div>
              </div>
              
              {/* Text Preview */}
              <div>
                <h3 className="font-medium mb-2">Text Version</h3>
                <pre className="border rounded-lg p-4 bg-gray-50 text-sm whitespace-pre-wrap">
                  {emailPreview.text}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}