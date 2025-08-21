'use client';

import { useState, useEffect } from 'react';
import { AuthServiceClient } from '@/lib/services/authServiceClient';

interface EmailSample {
  id: string;
  emailFrom: string;
  emailSubject: string;
  rawContent: string;
  receivedAt: string;
  campaignName?: string;
}

interface TestResults {
  parserV2?: {
    publisher: any;
    offerings: any[];
    pricingRules: any[];
    confidence: number;
    extractionNotes: string;
    duration: number;
    error?: string;
  };
  qualification?: {
    isQualified: boolean;
    status: string;
    reason?: string;
    notes?: string;
    duration: number;
    error?: string;
  };
}

export default function EmailTestingPage() {
  const [session, setSession] = useState<any>(null);
  const [emailSamples, setEmailSamples] = useState<EmailSample[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailSample | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<'parser' | 'qualification' | 'both'>('both');

  useEffect(() => {
    checkAuth();
    loadEmailSamples();
  }, []);

  const checkAuth = async () => {
    const authService = AuthServiceClient.getInstance();
    const currentSession = await authService.getSession();
    
    if (!currentSession || currentSession.userType !== 'internal') {
      window.location.href = '/login';
      return;
    }
    
    setSession(currentSession);
  };

  const loadEmailSamples = async () => {
    try {
      const response = await fetch('/api/admin/email-testing/samples');
      const data = await response.json();
      setEmailSamples(data.samples);
    } catch (error) {
      console.error('Failed to load email samples:', error);
    }
  };

  const runTest = async () => {
    if (!selectedEmail) return;
    
    setLoading(true);
    setTestResults(null);
    
    try {
      const response = await fetch('/api/admin/email-testing/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: selectedEmail.id,
          emailContent: selectedEmail.rawContent,
          emailFrom: selectedEmail.emailFrom,
          emailSubject: selectedEmail.emailSubject,
          testType
        })
      });
      
      const data = await response.json();
      setTestResults(data.results);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Email Testing Interface</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Email Sample</label>
              <select
                className="w-full p-2 border rounded"
                value={selectedEmail?.id || ''}
                onChange={(e) => {
                  const email = emailSamples.find(s => s.id === e.target.value);
                  setSelectedEmail(email || null);
                  setTestResults(null);
                }}
              >
                <option value="">Choose an email...</option>
                {emailSamples.map(sample => (
                  <option key={sample.id} value={sample.id}>
                    {sample.emailFrom} - {sample.emailSubject || 'No subject'}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Test Type</label>
              <select
                className="w-full p-2 border rounded"
                value={testType}
                onChange={(e) => setTestType(e.target.value as any)}
              >
                <option value="both">Both Services</option>
                <option value="parser">Parser V2 Only</option>
                <option value="qualification">Qualification Only</option>
              </select>
            </div>

            {/* Run Button */}
            <div className="flex items-end">
              <button
                onClick={runTest}
                disabled={!selectedEmail || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Running Test...' : 'Run Test'}
              </button>
            </div>
          </div>
        </div>

        {/* Email Content Display */}
        {selectedEmail && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Email Content</h2>
            <div className="space-y-2 mb-4">
              <div><strong>From:</strong> {selectedEmail.emailFrom}</div>
              <div><strong>Subject:</strong> {selectedEmail.emailSubject || 'No subject'}</div>
              <div><strong>Campaign:</strong> {selectedEmail.campaignName || 'N/A'}</div>
              <div><strong>Received:</strong> {new Date(selectedEmail.receivedAt).toLocaleString()}</div>
            </div>
            <div className="border rounded p-4 bg-gray-50">
              <pre className="whitespace-pre-wrap text-sm">{selectedEmail.rawContent}</pre>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parser V2 Results */}
            {testResults.parserV2 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-600">
                  Parser V2 Results
                  <span className="text-sm font-normal ml-2 text-gray-500">
                    ({testResults.parserV2.duration}ms)
                  </span>
                </h2>
                
                {testResults.parserV2.error ? (
                  <div className="text-red-600 p-3 bg-red-50 rounded">
                    Error: {testResults.parserV2.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Publisher Info */}
                    <div>
                      <h3 className="font-semibold mb-2">Publisher Info</h3>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div><strong>Email:</strong> {testResults.parserV2.publisher?.email}</div>
                        <div><strong>Name:</strong> {testResults.parserV2.publisher?.name || 'N/A'}</div>
                        <div><strong>Company:</strong> {testResults.parserV2.publisher?.company || 'N/A'}</div>
                        <div><strong>Websites:</strong> {testResults.parserV2.publisher?.websites?.join(', ') || 'None'}</div>
                      </div>
                    </div>

                    {/* Offerings */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Offerings ({testResults.parserV2.offerings?.length || 0})
                      </h3>
                      {testResults.parserV2.offerings?.map((offer, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded text-sm mb-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div><strong>Type:</strong> {offer.offeringType}</div>
                            <div><strong>Price:</strong> ${(offer.basePrice / 100).toFixed(2)} {offer.currency}</div>
                            <div><strong>Turnaround:</strong> {offer.turnaroundDays || 'N/A'} days</div>
                            <div><strong>Name:</strong> {offer.offeringName || 'N/A'}</div>
                          </div>
                          {offer.attributes && Object.keys(offer.attributes).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-600">Attributes</summary>
                              <pre className="text-xs mt-1">{JSON.stringify(offer.attributes, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Confidence & Notes */}
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Confidence:</span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          testResults.parserV2.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                          testResults.parserV2.confidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(testResults.parserV2.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {testResults.parserV2.extractionNotes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Notes:</strong> {testResults.parserV2.extractionNotes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Qualification Results */}
            {testResults.qualification && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-green-600">
                  Qualification Results
                  <span className="text-sm font-normal ml-2 text-gray-500">
                    ({testResults.qualification.duration}ms)
                  </span>
                </h2>
                
                {testResults.qualification.error ? (
                  <div className="text-red-600 p-3 bg-red-50 rounded">
                    Error: {testResults.qualification.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="text-center p-4 rounded-lg border-2" style={{
                      backgroundColor: testResults.qualification.isQualified ? '#f0fdf4' : '#fef2f2',
                      borderColor: testResults.qualification.isQualified ? '#16a34a' : '#dc2626'
                    }}>
                      <div className="text-2xl font-bold mb-2" style={{
                        color: testResults.qualification.isQualified ? '#16a34a' : '#dc2626'
                      }}>
                        {testResults.qualification.status.toUpperCase()}
                      </div>
                      <div className="text-lg">
                        {testResults.qualification.isQualified ? '✅ Ready for Publisher Creation' : '❌ Should Not Create Publisher'}
                      </div>
                    </div>

                    {/* Reason */}
                    {testResults.qualification.reason && (
                      <div>
                        <h3 className="font-semibold mb-2">Reason</h3>
                        <div className="bg-gray-50 p-3 rounded">
                          {testResults.qualification.reason}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {testResults.qualification.notes && (
                      <div>
                        <h3 className="font-semibold mb-2">Notes</h3>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          {testResults.qualification.notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}