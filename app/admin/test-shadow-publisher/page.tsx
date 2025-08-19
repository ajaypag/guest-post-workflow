'use client';

import { useState } from 'react';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function TestShadowPublisherPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedTest, setSelectedTest] = useState('jameelah');
  const [customEmail, setCustomEmail] = useState({
    name: '',
    from: '',
    company: '',
    website: '',
    content: ''
  });

  const testEmails = {
    jameelah: {
      name: 'Jameelah from The Hype Magazine',
      from: 'justjay@thehypemagazine.com',
      company: 'The Hype Magazine',
      website: 'thehypemagazine.com',
      content: `Thank you for your email regarding sponsored posts on thehypemagazine.com. We do accept sponsored content and link insertions.

Our agency rate per post is $450, discounted to $200 per post for bulk orders of 10 or more.

Agency Rate Casino/Gambling Post: $550 

Link insertions: $150

TAT: 12 - 24 Hours After Receiving the Submission 

No sex or dating-related articles or links are accepted.

The rate for our LGBT outlet www.raynbowaffair.com is $150

Best regards,
Jameelah Wilkerson
CEO & Publisher
The Hype Magazine`
    },
    simple: {
      name: 'Simple Test Publisher',
      from: 'test@example.com',
      company: 'Test Blog',
      website: 'testblog.com',
      content: `Hi there,

Yes, we accept guest posts on our website testblog.com.

Our rate is $300 per post. We provide dofollow links and the post stays permanent.

Turnaround time is 48 hours.

Best,
John from Test Blog`
    },
    complex: {
      name: 'Complex Pricing Publisher',
      from: 'editor@premiumsite.com',
      company: 'Premium Site',
      website: 'premiumsite.com',
      content: `Hello,

Thank you for reaching out. Here are our rates:

Standard Guest Post: $500
Finance/Crypto content: $750 (+50% surcharge)
Casino/Gambling: $800 
CBD/Cannabis: $650

We do NOT accept:
- Adult/Dating content
- Essay writing services
- Illegal content
- Payday loans

All posts include 2 dofollow links. Additional links are $75 each.

Bulk discount: 5+ posts get 15% off
Payment terms: 50% upfront, 50% on publication

Turnaround: 3-5 business days

Regards,
Sarah
Editor-in-Chief`
    },
    custom: {
      name: customEmail.name || 'Custom Publisher',
      from: customEmail.from || 'test@example.com',
      company: customEmail.company || 'Custom Company',
      website: customEmail.website || 'example.com',
      content: customEmail.content || 'No content provided'
    }
  };

  const sendTest = async () => {
    setLoading(true);
    setResult(null);

    const testData = testEmails[selectedTest as keyof typeof testEmails];

    try {
      // Create the webhook payload
      const webhookPayload = {
        eventId: 'prospect_replied',
        campaignId: `test-${Date.now()}`,
        campaignName: 'Test Campaign - Shadow Publisher System',
        campaignType: 'outreach',
        email: {
          from: testData.from,
          to: 'outreach@linkio.com',
          subject: `Re: Guest posting opportunity on ${testData.website}`,
          messageId: `test-${Date.now()}@test.com`,
          receivedAt: new Date().toISOString(),
          content: testData.content
        },
        metadata: {
          prospectName: testData.name,
          prospectCompany: testData.company,
          originalWebsite: testData.website,
          threadId: `thread-${Date.now()}`
        }
      };

      // Send to the test endpoint
      const response = await fetch('/api/webhooks/manyreach/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      const data = await response.json();
      
      setResult({
        success: response.ok,
        status: response.status,
        data
      });

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Test Shadow Publisher System</h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Test Email</h2>
        
        <div className="space-y-3 mb-6">
          {Object.entries(testEmails).filter(([key]) => key !== 'custom').map(([key, email]) => (
            <label key={key} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="test"
                value={key}
                checked={selectedTest === key}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">{email.name}</div>
                <div className="text-sm text-gray-600">{email.from}</div>
                <div className="text-xs text-gray-500 mt-1">Website: {email.website}</div>
              </div>
            </label>
          ))}
          
          {/* Custom Email Option */}
          <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-blue-50 border-blue-500">
            <input
              type="radio"
              name="test"
              value="custom"
              checked={selectedTest === 'custom'}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-blue-600">✏️ Custom Email</div>
              <div className="text-sm text-gray-600">Write your own test email</div>
            </div>
          </label>
        </div>

        {/* Custom Email Form */}
        {selectedTest === 'custom' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Contact Name</label>
                <input
                  type="text"
                  value={customEmail.name}
                  onChange={(e) => setCustomEmail({...customEmail, name: e.target.value})}
                  placeholder="John from Example Blog"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">From Email</label>
                <input
                  type="email"
                  value={customEmail.from}
                  onChange={(e) => setCustomEmail({...customEmail, from: e.target.value})}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <input
                  type="text"
                  value={customEmail.company}
                  onChange={(e) => setCustomEmail({...customEmail, company: e.target.value})}
                  placeholder="Example Blog"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <input
                  type="text"
                  value={customEmail.website}
                  onChange={(e) => setCustomEmail({...customEmail, website: e.target.value})}
                  placeholder="example.com"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email Content</label>
              <textarea
                value={customEmail.content}
                onChange={(e) => setCustomEmail({...customEmail, content: e.target.value})}
                placeholder="Hi there,

Yes, we accept guest posts. Our rate is $400 per post.

Casino/gambling content is $600.

We don't accept adult or dating content.

Turnaround is 48 hours.

Best,
John"
                className="w-full px-3 py-2 border rounded-lg h-32 font-mono text-sm"
              />
            </div>
          </div>
        )}

        {selectedTest !== 'custom' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Email Preview:</h3>
            <pre className="text-xs whitespace-pre-wrap">{testEmails[selectedTest as keyof typeof testEmails].content}</pre>
          </div>
        )}

        <button
          onClick={sendTest}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Sending test email to webhook...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Email to ManyReach Webhook
            </span>
          )}
        </button>
      </div>

      {result && (
        <div className={`rounded-lg p-6 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3 mb-4">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                {result.success ? 'Test Successful!' : 'Test Failed'}
              </h3>
              
              {result.success && result.data && (
                <div className="space-y-2 text-sm">
                  {result.data.emailLogId && (
                    <div>
                      <strong>Email Log ID:</strong> 
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">{result.data.emailLogId}</code>
                    </div>
                  )}
                  
                  {result.data.parsedData && (
                    <>
                      <div>
                        <strong>Confidence Score:</strong> 
                        <span className="ml-2">{(result.data.parsedData.overallConfidence * 100).toFixed(1)}%</span>
                      </div>
                      
                      {result.data.parsedData.offerings?.length > 0 && (
                        <div>
                          <strong>Extracted Pricing:</strong>
                          <ul className="ml-4 mt-1">
                            {result.data.parsedData.offerings.map((offer: any, i: number) => (
                              <li key={i}>
                                {offer.type}: ${offer.basePrice} {offer.currency}
                                {offer.nichePricing && offer.nichePricing.length > 0 && (
                                  <ul className="ml-4 text-xs text-gray-600">
                                    {offer.nichePricing.map((np: any, j: number) => (
                                      <li key={j}>{np.niche}: ${np.price}</li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  
                  {result.data.publisherId && (
                    <div className="mt-4 p-3 bg-blue-100 rounded">
                      <strong>✅ Shadow Publisher Created!</strong>
                      <div className="text-xs mt-1">
                        Publisher ID: <code>{result.data.publisherId}</code>
                      </div>
                      <a 
                        href="/admin/shadow-publishers" 
                        className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                      >
                        View in Shadow Publishers →
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {result.error && (
                <div className="text-red-800">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>
          </div>
          
          {result.data && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">View Full Response</summary>
              <pre className="mt-2 p-3 bg-white rounded text-xs overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">How This Test Works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Select a test email scenario above</li>
          <li>Click "Send Test Email" to simulate a ManyReach webhook</li>
          <li>The system will parse the email with AI and extract pricing/requirements</li>
          <li>If confidence is high enough, a shadow publisher will be created</li>
          <li>Check the <a href="/admin/shadow-publishers" className="text-blue-600 hover:underline">Shadow Publishers page</a> to see the result</li>
        </ol>
      </div>
    </div>
  );
}