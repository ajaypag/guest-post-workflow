'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

interface EmailSample {
  id: string;
  emailFrom: string;
  emailSubject: string;
  rawContent: string;
  receivedAt: string;
  campaignName?: string;
}

interface TestResults {
  parserV1?: {
    sender: any;
    websites: any[];
    offerings: any[];
    overallConfidence: number;
    missingFields: string[];
    duration: number;
    error?: string;
  };
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
  const [testType, setTestType] = useState<'parserV1' | 'parserV2' | 'both-parsers' | 'qualification' | 'all'>('all');
  const [showParserV1Prompt, setShowParserV1Prompt] = useState(false);
  const [showParserV2Prompt, setShowParserV2Prompt] = useState(false);
  const [showQualificationLogic, setShowQualificationLogic] = useState(false);

  useEffect(() => {
    checkAuth();
    loadEmailSamples();
  }, []);

  const checkAuth = async () => {
    const currentSession = AuthService.getSession();
    
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
                <option value="all">All Tests (V1 + V2 + Qualification)</option>
                <option value="both-parsers">Both Parsers (V1 + V2)</option>
                <option value="parserV1">Parser V1 Only (Original)</option>
                <option value="parserV2">Parser V2 Only (New)</option>
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

          {/* Test Type Details */}
          <div className="mt-6 space-y-4">
            {(testType === 'parserV1' || testType === 'both-parsers' || testType === 'all') && (
              <div className="border rounded-lg p-4 bg-purple-50">
                <button
                  onClick={() => setShowParserV1Prompt(!showParserV1Prompt)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h3 className="font-semibold text-purple-900">Parser V1 Details (Original)</h3>
                    <p className="text-sm text-purple-700 mt-1">
                      Original parser - uses GPT-4o with 3 separate extraction calls
                    </p>
                  </div>
                  <span className="text-purple-600">{showParserV1Prompt ? '▼' : '▶'}</span>
                </button>
                
                {showParserV1Prompt && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Model Configuration:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`model: 'gpt-4o'
3 separate API calls:
1. Extract sender info
2. Extract offerings
3. Extract websites`}
                      </pre>
                    </div>
                    
                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Original Extraction Approach:</h4>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Makes 3 separate OpenAI calls for different data types</li>
                        <li>Returns confidence scores for each field</li>
                        <li>Identifies missing fields explicitly</li>
                        <li>Supports transactional and niche-specific pricing</li>
                        <li>Extracts raw pricing and requirements text</li>
                        <li>More verbose but potentially less accurate</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {(testType === 'parserV2' || testType === 'both-parsers' || testType === 'all') && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <button
                  onClick={() => setShowParserV2Prompt(!showParserV2Prompt)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h3 className="font-semibold text-blue-900">Parser V2 Details (New)</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Uses OpenAI o3-mini to extract publisher info, offerings, and pricing from emails
                    </p>
                  </div>
                  <span className="text-blue-600">{showParserV2Prompt ? '▼' : '▶'}</span>
                </button>
                
                {showParserV2Prompt && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Model Configuration:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`model: 'o3-mini'
max_completion_tokens: 5000
reasoning_effort: 'medium'`}
                      </pre>
                    </div>
                    
                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Key Extraction Logic:</h4>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Extracts publisher email, name, company, and websites</li>
                        <li>Creates separate offering records for each service type</li>
                        <li>Converts all prices to cents (multiplies dollars by 100)</li>
                        <li>Identifies guest_post, link_insertion, listicle_placement, sponsored_review</li>
                        <li>Captures complex pricing in attributes field (bulk discounts, niche surcharges)</li>
                        <li>Normalizes domain names automatically</li>
                      </ul>
                    </div>
                    
                    <details className="bg-white rounded p-3">
                      <summary className="cursor-pointer font-semibold text-sm">View Full Prompt Template</summary>
                      <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
{`Your task: Extract ALL information and create offering records that match our exact database schema.

DATABASE SCHEMA FOR OFFERINGS:
{
  "offeringType": "guest_post" | "link_insertion" | "listicle_placement" | "sponsored_review",
  "basePrice": INTEGER_IN_CENTS, // CRITICAL: $250 = 25000
  "currency": "USD" | "EUR" | "GBP",
  "turnaroundDays": INTEGER or null,
  "attributes": {
    "restrictions": {"niches": ["cbd", "casino"]},
    "includedLinks": 2,
    "additionalLinkPrice": 3000, // in cents!
    "rawPricingText": "exact pricing text from email"
  }
}

EXTRACTION EXAMPLES:
1. "Guest posts are $250" → basePrice: 25000
2. "$200 (includes 2 do-follow links), additional links $30 each"
   → basePrice: 20000, attributes.includedLinks: 2, attributes.additionalLinkPrice: 3000`}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            {(testType === 'qualification' || testType === 'all') && (
              <div className="border rounded-lg p-4 bg-green-50">
                <button
                  onClick={() => setShowQualificationLogic(!showQualificationLogic)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h3 className="font-semibold text-green-900">Qualification Logic Details</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Determines if email should create a publisher record based on business rules
                    </p>
                  </div>
                  <span className="text-green-600">{showQualificationLogic ? '▼' : '▶'}</span>
                </button>
                
                {showQualificationLogic && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Qualification Checks (in order):</h4>
                      <ol className="text-xs space-y-2 list-decimal list-inside">
                        <li className="ml-2">
                          <strong>Must have offerings with pricing</strong>
                          <br />→ Disqualified if no offerings found
                        </li>
                        <li className="ml-2">
                          <strong>Must have valid pricing (not zero)</strong>
                          <br />→ Disqualified if all prices are $0
                        </li>
                        <li className="ml-2">
                          <strong>If mentions prices/costs → QUALIFIED</strong>
                          <br />→ Trumps all other checks (pricing terms: price, cost, fee, charge, $, USD, payment)
                        </li>
                        <li className="ml-2">
                          <strong>Check for rejections</strong>
                          <br />→ Disqualified if contains: "not interested", "no thanks", "unsubscribe", etc.
                        </li>
                        <li className="ml-2">
                          <strong>Check for link swaps</strong>
                          <br />→ Disqualified if contains: "in exchange", "reciprocal", "link swap", "free", etc.
                        </li>
                        <li className="ml-2">
                          <strong>Check for vague responses</strong>
                          <br />→ Disqualified if shows interest but no concrete pricing
                        </li>
                      </ol>
                    </div>
                    
                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Disqualification Reasons:</h4>
                      <div className="text-xs space-y-1">
                        <div><code className="bg-gray-100 px-1">no_offerings</code> - No paid offerings found</div>
                        <div><code className="bg-gray-100 px-1">no_pricing</code> - No pricing information provided</div>
                        <div><code className="bg-gray-100 px-1">link_swap</code> - Link exchange offer (not paid)</div>
                        <div><code className="bg-gray-100 px-1">rejection</code> - Declined/rejected the offer</div>
                        <div><code className="bg-gray-100 px-1">vague_response</code> - Vague response without details</div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Key Logic:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`// Pricing mentions override everything
if (checkForPricingMentions(email)) {
  return QUALIFIED;
}

// Otherwise check disqualifiers
if (checkForRejection(email)) {
  return DISQUALIFIED("rejection");
}
if (checkForLinkSwap(email)) {
  return DISQUALIFIED("link_swap");
}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
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
            {/* Parser V1 Results (Original) */}
            {testResults.parserV1 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-purple-600">
                  Parser V1 Results (Original)
                  <span className="text-sm font-normal ml-2 text-gray-500">
                    ({testResults.parserV1.duration}ms)
                  </span>
                </h2>
                
                {testResults.parserV1.error ? (
                  <div className="text-red-600 p-3 bg-red-50 rounded">
                    Error: {testResults.parserV1.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Sender Info */}
                    <div>
                      <h3 className="font-semibold mb-2">Sender Info</h3>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div><strong>Email:</strong> {testResults.parserV1.sender?.email}</div>
                        <div><strong>Name:</strong> {testResults.parserV1.sender?.name || 'N/A'}</div>
                        <div><strong>Company:</strong> {testResults.parserV1.sender?.company || 'N/A'}</div>
                        <div><strong>Confidence:</strong> {(testResults.parserV1.sender?.confidence * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    {/* Websites */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Websites ({testResults.parserV1.websites?.length || 0})
                      </h3>
                      {testResults.parserV1.websites?.map((site, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded text-sm mb-1">
                          <span className="font-medium">{site.domain}</span>
                          <span className="ml-2 text-gray-500">({(site.confidence * 100).toFixed(0)}% conf)</span>
                        </div>
                      ))}
                    </div>

                    {/* Offerings */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Offerings ({testResults.parserV1.offerings?.length || 0})
                      </h3>
                      {testResults.parserV1.offerings?.map((offer, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded text-sm mb-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div><strong>Type:</strong> {offer.type}</div>
                            <div><strong>Price:</strong> ${offer.basePrice} {offer.currency}</div>
                            <div><strong>Confidence:</strong> {(offer.confidence * 100).toFixed(0)}%</div>
                            <div><strong>Turnaround:</strong> {offer.turnaroundDays || 'N/A'} days</div>
                          </div>
                          {offer.rawPricingText && (
                            <div className="mt-2 text-xs text-gray-600">
                              <strong>Raw text:</strong> "{offer.rawPricingText}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Overall Stats */}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Overall Confidence:</span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          testResults.parserV1.overallConfidence > 0.8 ? 'bg-green-100 text-green-800' :
                          testResults.parserV1.overallConfidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(testResults.parserV1.overallConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {testResults.parserV1.missingFields && testResults.parserV1.missingFields.length > 0 && (
                        <div className="mt-2 text-sm text-orange-600">
                          <strong>Missing:</strong> {testResults.parserV1.missingFields.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
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