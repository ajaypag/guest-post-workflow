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
  intelligent?: {
    publisher: any;
    websites: any[];
    offerings: any[];
    websiteRelations: any[];
    pricingRules: any[];
    extractionConfidence: number;
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
  const [testType, setTestType] = useState<'parserV1' | 'parserV2' | 'both-parsers' | 'intelligent' | 'qualification' | 'all'>('all');
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
                <option value="all">All Tests (V1 + V2 + Intelligent + Qualification)</option>
                <option value="both-parsers">Both Parsers (V1 + V2)</option>
                <option value="parserV1">Parser V1 Only (Original)</option>
                <option value="parserV2">Parser V2 Only (New)</option>
                <option value="intelligent">Intelligent Parser Only (OpenAI Schema-Aware)</option>
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
{`model: 'o3-mini' (recently updated from gpt-4o)
reasoning_effort: 'medium'
max_completion_tokens: 5000

3 separate API calls with different prompts:`}
                      </pre>
                    </div>
                    
                    <details className="bg-white rounded p-3">
                      <summary className="cursor-pointer font-semibold text-sm">Call 1: Extract Basic Info & Websites</summary>
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-gray-600">Focuses on identifying the sender and their websites</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
{`Context: This is an outreach conversation. We reached out asking about guest posting on THEIR website.

CRITICAL UNDERSTANDING:
- We likely mentioned THEIR website (e.g., "Hi, I'd like a guest post on yoursite.com")
- When they reply with pricing, they're talking about THAT website
- Look for contextual clues like "our rates are..." - they're talking about the site we inquired about

Extract:
1. Their name (from signature or email content)
2. Their company/business name  
3. Their website(s) - CRITICAL LOGIC:
   - If our outreach says "I want to post on [domain.com]" and they reply with pricing, then [domain.com] IS their website
   - Check their email signature for website URLs
   - The email domain is likely theirs (unless gmail.com, outlook.com, etc.)
   - If they list multiple sites with different prices, those are ALL their websites`}
                        </pre>
                      </div>
                    </details>

                    <details className="bg-white rounded p-3">
                      <summary className="cursor-pointer font-semibold text-sm">Call 2: Extract All Pricing Information</summary>
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-gray-600">Comprehensive pricing extraction with complex structures</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
{`PRICES: Extract EVERY price mentioned:
- "Guest posts are $250" → guest_post_price: 250
- "$200 (includes 2 do-follow links)" → guest_post_price: 200, max_links_included: 2
- "Additional links: $30 each" → additional_link_price: 30
- "Link insertion: $80" → link_insertion_price: 80

COMPLEX PRICING STRUCTURES:
- Listicle positions (1st: $999, 2nd: $899, etc.) → Store in listicle_pricing array
- Transactional vs non-transactional pricing → Store both with clear labels
- SAAS/niche-specific pricing → Store in niche_pricing with adjustment

TURNAROUND TIME: Look for ANY mention:
- "delivered in 7 days", "48 hours", "1 week turnaround"
- If NOT mentioned, return null (DO NOT make up values)

BULK/PACKAGE DEALS:
- "10% off for 5+ posts" → bulk_discounts
- "Package of 3 for $500" → package_deals

RAW PRICING TEXT: ALWAYS include the exact pricing text from the email`}
                        </pre>
                      </div>
                    </details>

                    <details className="bg-white rounded p-3">
                      <summary className="cursor-pointer font-semibold text-sm">Call 3: Extract Requirements & Restrictions</summary>
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-gray-600">Captures all content requirements and prohibited topics</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
{`LINK POLICIES:
- "do-follow", "dofollow", "DF" → accepts_dofollow: true
- "includes 2 do-follow links" → max_links: 2, accepts_dofollow: true
- "Additional links: $30 each" → implies base number of links included

PROHIBITED/RESTRICTED CONTENT:
- "We do not accept...", "No content about...", "Prohibited topics include..."
- Common: CBD, casino, gambling, adult, porn, dating, essay writing, crypto, weapons, payday loans
- IMPORTANT: Copy the EXACT text about restrictions

WORD COUNT:
- "500-1000 words", "minimum 500 words", "at least 800 words"

WHAT THEY DON'T DO:
- "We do not barter" → no_barter: true
- "We don't do link exchanges" → no_link_exchanges: true
- "No free posts" → no_free_posts: true

Return includes: prohibited_topics array, restricted_niches_notes, word counts, link policies, etc.`}
                        </pre>
                      </div>
                    </details>

                    <div className="bg-white rounded p-3">
                      <h4 className="font-semibold text-sm mb-2">Key Issues with V1:</h4>
                      <ul className="text-xs space-y-1 list-disc list-inside text-orange-600">
                        <li>3x the cost (3 API calls vs 1)</li>
                        <li>3x slower (sequential calls)</li>
                        <li>Risk of inconsistency between calls</li>
                        <li>May miss connections between data points</li>
                        <li>Harder to maintain (3 separate prompts)</li>
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

            {(testType === 'intelligent' || testType === 'all') && (
              <div className="border rounded-lg p-4 bg-orange-50">
                <div className="flex items-center justify-between w-full text-left">
                  <div>
                    <h3 className="font-semibold text-orange-900">Intelligent Parser Details (Schema-Aware)</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Sends ACTUAL database schema to OpenAI o3-mini for intelligent extraction without hardcoded rules
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="bg-white rounded p-3">
                    <h4 className="font-semibold text-sm mb-2">Key Innovation:</h4>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li><strong>Schema-Aware:</strong> Sends complete database table structures to OpenAI</li>
                      <li><strong>No Hardcoded Rules:</strong> OpenAI decides what to extract based on understanding the schema</li>
                      <li><strong>Direct Database Format:</strong> Returns data ready for immediate database insertion</li>
                      <li><strong>Intelligent Mapping:</strong> AI understands relationships between tables and data</li>
                      <li><strong>o3-mini Model:</strong> High reasoning capability for complex data extraction</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white rounded p-3">
                    <h4 className="font-semibold text-sm mb-2">Tables Sent to OpenAI:</h4>
                    <div className="text-xs space-y-1">
                      <div><code className="bg-gray-100 px-1">publishers</code> - Publisher/company records</div>
                      <div><code className="bg-gray-100 px-1">websites</code> - Websites offering guest posting</div>
                      <div><code className="bg-gray-100 px-1">publisher_offerings</code> - Specific services and pricing</div>
                      <div><code className="bg-gray-100 px-1">shadow_publisher_websites</code> - Publisher-website relationships</div>
                      <div><code className="bg-gray-100 px-1">publisher_pricing_rules</code> - Complex pricing conditions</div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded p-3">
                    <h4 className="font-semibold text-sm mb-2">Example Schema Fragment Sent:</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`publishers: {
  email: "VARCHAR(255) UNIQUE NOT NULL - their email address",
  contactName: "VARCHAR(255) DEFAULT 'Unknown' - person's name",
  companyName: "VARCHAR(255) - company/business name",
  accountStatus: "VARCHAR(50) DEFAULT 'shadow' - for email-extracted publishers",
  source: "VARCHAR(50) DEFAULT 'manyreach' - how we got this publisher",
  confidenceScore: "DECIMAL(3,2) - your confidence in the extraction (0-1)"
}`}
                    </pre>
                  </div>
                  
                  <div className="bg-white rounded p-3">
                    <h4 className="font-semibold text-sm mb-2">Advantages over V1/V2:</h4>
                    <ul className="text-xs space-y-1 list-disc list-inside text-green-600">
                      <li>Single API call (vs V1's 3 calls)</li>
                      <li>No hardcoded extraction logic to maintain</li>
                      <li>OpenAI understands data relationships automatically</li>
                      <li>Adapts to schema changes without code updates</li>
                      <li>Returns data in exact database format</li>
                      <li>Built-in confidence scoring and extraction notes</li>
                    </ul>
                  </div>
                </div>
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
            
            {/* Intelligent Parser Results */}
            {testResults.intelligent && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-orange-600">
                  Intelligent Parser Results (Schema-Aware)
                  <span className="text-sm font-normal ml-2 text-gray-500">
                    ({testResults.intelligent.duration}ms)
                  </span>
                </h2>
                
                {testResults.intelligent.error ? (
                  <div className="text-red-600 p-3 bg-red-50 rounded">
                    Error: {testResults.intelligent.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Publisher Info */}
                    <div>
                      <h3 className="font-semibold mb-2">Publisher Info</h3>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div><strong>Email:</strong> {testResults.intelligent.publisher?.email}</div>
                        <div><strong>Contact Name:</strong> {testResults.intelligent.publisher?.contactName || 'N/A'}</div>
                        <div><strong>Company:</strong> {testResults.intelligent.publisher?.companyName || 'N/A'}</div>
                        <div><strong>Phone:</strong> {testResults.intelligent.publisher?.phone || 'N/A'}</div>
                        <div><strong>Status:</strong> {testResults.intelligent.publisher?.status || 'pending'}</div>
                        <div><strong>Account Status:</strong> {testResults.intelligent.publisher?.accountStatus || 'shadow'}</div>
                        <div><strong>Source:</strong> {testResults.intelligent.publisher?.source || 'manyreach'}</div>
                        <div><strong>Confidence Score:</strong> {testResults.intelligent.publisher?.confidenceScore || 'N/A'}</div>
                        {testResults.intelligent.publisher?.attributes && Object.keys(testResults.intelligent.publisher.attributes).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-orange-600">Publisher Attributes</summary>
                            <pre className="text-xs mt-1">{JSON.stringify(testResults.intelligent.publisher.attributes, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    </div>

                    {/* Websites */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Websites ({testResults.intelligent.websites?.length || 0})
                      </h3>
                      {testResults.intelligent.websites?.map((website, idx) => (
                        <div key={`${website.id || idx}-${idx}`} className="bg-gray-50 p-3 rounded text-sm mb-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div><strong>Domain:</strong> {website.domain}</div>
                            <div><strong>DR:</strong> {website.domainRating || 'N/A'}</div>
                            <div><strong>Traffic:</strong> {website.totalTraffic || 'N/A'}</div>
                            <div><strong>Type:</strong> {website.websiteType?.join(', ') || 'N/A'}</div>
                            <div><strong>Niche:</strong> {website.niche?.join(', ') || 'N/A'}</div>
                            <div><strong>Source:</strong> {website.source || 'manyreach'}</div>
                          </div>
                          {website.attributes && Object.keys(website.attributes).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-orange-600">Website Attributes</summary>
                              <pre className="text-xs mt-1">{JSON.stringify(website.attributes, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Offerings */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Offerings ({testResults.intelligent.offerings?.length || 0})
                      </h3>
                      {testResults.intelligent.offerings?.map((offer, idx) => (
                        <div key={`${offer.id || idx}-${idx}`} className="bg-gray-50 p-3 rounded text-sm mb-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div><strong>Type:</strong> {offer.offeringType}</div>
                            <div><strong>Price:</strong> ${(offer.basePrice / 100).toFixed(2)} {offer.currency}</div>
                            <div><strong>Turnaround:</strong> {offer.turnaroundDays || 'N/A'} days</div>
                            <div><strong>Name:</strong> {offer.offeringName || 'N/A'}</div>
                            <div><strong>Min Words:</strong> {offer.minWordCount || 'N/A'}</div>
                            <div><strong>Max Words:</strong> {offer.maxWordCount || 'N/A'}</div>
                            <div><strong>Niches:</strong> {offer.niches?.join(', ') || 'N/A'}</div>
                          </div>
                          {offer.pricingExtractedFrom && (
                            <div className="mt-2 text-xs text-gray-600">
                              <strong>Raw pricing:</strong> "{offer.pricingExtractedFrom}"
                            </div>
                          )}
                          {offer.attributes && Object.keys(offer.attributes).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-orange-600">Offering Attributes</summary>
                              <pre className="text-xs mt-1">{JSON.stringify(offer.attributes, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Website Relations */}
                    {testResults.intelligent.websiteRelations && testResults.intelligent.websiteRelations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">
                          Website Relations ({testResults.intelligent.websiteRelations.length})
                        </h3>
                        {testResults.intelligent.websiteRelations.map((relation, idx) => (
                          <div key={idx} className="bg-gray-50 p-2 rounded text-sm mb-1">
                            <div><strong>Publisher-Website Link:</strong> {relation.isPrimary ? 'Primary' : 'Secondary'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pricing Rules */}
                    {testResults.intelligent.pricingRules && testResults.intelligent.pricingRules.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">
                          Pricing Rules ({testResults.intelligent.pricingRules.length})
                        </h3>
                        {testResults.intelligent.pricingRules.map((rule, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded text-sm mb-2">
                            <div><strong>Type:</strong> {rule.ruleType}</div>
                            <div><strong>Description:</strong> {rule.description}</div>
                            {rule.condition && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-orange-600">Rule Details</summary>
                                <pre className="text-xs mt-1">{JSON.stringify({condition: rule.condition, adjustment: rule.adjustmentType}, null, 2)}</pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confidence & Notes */}
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Extraction Confidence:</span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          testResults.intelligent.extractionConfidence > 0.8 ? 'bg-green-100 text-green-800' :
                          testResults.intelligent.extractionConfidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(testResults.intelligent.extractionConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {testResults.intelligent.extractionNotes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Extraction Notes:</strong> {testResults.intelligent.extractionNotes}
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