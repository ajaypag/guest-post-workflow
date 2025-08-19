import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Test endpoint for ManyReach webhook integration
// This simulates ManyReach sending a webhook to test the integration

interface TestPayloadOptions {
  confidence?: 'high' | 'medium' | 'low' | 'failed';
  hasWebsite?: boolean;
  hasOfferings?: boolean;
  isAutoReply?: boolean;
}

function generateTestPayload(options: TestPayloadOptions = {}) {
  const {
    confidence = 'high',
    hasWebsite = true,
    hasOfferings = true,
    isAutoReply = false,
  } = options;

  const timestamp = new Date().toISOString();
  const messageId = `test-${crypto.randomBytes(8).toString('hex')}@manyreach.com`;
  
  // Generate test email content based on confidence level
  let emailContent = '';
  let senderEmail = '';
  let senderName = '';
  let websiteDomain = '';
  
  switch (confidence) {
    case 'high':
      senderEmail = 'john.smith@publishersite.com';
      senderName = 'John Smith';
      websiteDomain = 'publishersite.com';
      emailContent = `Hi there,

Thank you for reaching out about guest posting opportunities on ${websiteDomain}.

We do accept guest posts and here are our current rates:
- Standard guest post (1000-1500 words): $250
- Premium guest post with homepage link (1500-2000 words): $450
- Link insertion in existing content: $150

Our typical turnaround time is 5-7 business days. We accept content in the following niches:
- Technology and SaaS
- Digital Marketing
- Business and Entrepreneurship
- AI and Machine Learning

Please let me know if you'd like to proceed or if you have any questions.

Best regards,
${senderName}
Content Manager
${websiteDomain}`;
      break;
      
    case 'medium':
      senderEmail = 'contact@blog-network.net';
      senderName = 'Blog Network Team';
      websiteDomain = 'various-sites.com';
      emailContent = `Hello,

We manage multiple websites and can offer guest posting services.

Our rates vary by site but typically range from $100-500.
Turnaround is usually 1-2 weeks.

Contact us for more details.

Thanks,
${senderName}`;
      break;
      
    case 'low':
      senderEmail = 'noreply@automated-system.com';
      senderName = 'Automated Response';
      emailContent = `This is an automated response. 
      
We might accept posts. 
Email us for info.`;
      break;
      
    case 'failed':
      senderEmail = 'bounce@invalid.com';
      emailContent = '';
      break;
  }
  
  if (!hasWebsite) {
    websiteDomain = '';
    emailContent = emailContent.replace(/publishersite\.com/g, '[website]');
  }
  
  if (!hasOfferings) {
    emailContent = `Hi,

Thank you for your interest. We'll get back to you soon.

Best regards,
${senderName}`;
  }

  const payload = {
    event: 'email_received',
    webhook_id: `test-webhook-${crypto.randomBytes(4).toString('hex')}`,
    timestamp: timestamp,
    campaign: {
      id: 'test-campaign-001',
      name: 'Test Guest Post Outreach',
      type: 'outreach' as const,
      original_email_subject: 'Guest Post Opportunity Inquiry',
    },
    email: {
      message_id: messageId,
      from: {
        email: senderEmail,
        name: senderName,
      },
      to: {
        email: 'outreach@yourcompany.com',
        name: 'Outreach Team',
      },
      subject: 'Re: Guest Post Opportunity Inquiry',
      received_at: timestamp,
      content: {
        text: emailContent,
        html: `<html><body>${emailContent.replace(/\n/g, '<br>')}</body></html>`,
      },
      attachments: [],
    },
    original_outreach: hasWebsite ? {
      sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      subject: 'Guest Post Opportunity Inquiry',
      recipient_website: websiteDomain,
    } : undefined,
    metadata: {
      thread_id: `thread-${crypto.randomBytes(4).toString('hex')}`,
      reply_count: 1,
      is_auto_reply: isAutoReply,
    },
  };

  return payload;
}

function generateSignature(payload: string, secret: string): string {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// GET endpoint to show test interface
export async function GET(request: NextRequest) {
  const secret = process.env.MANYREACH_WEBHOOK_SECRET;
  
  if (!secret) {
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ManyReach Webhook Test</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { background: #fee; padding: 10px; border: 1px solid #fcc; border-radius: 4px; }
          code { background: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
        </style>
      </head>
      <body>
        <h1>ManyReach Webhook Test</h1>
        <div class="error">
          <strong>Configuration Error:</strong> MANYREACH_WEBHOOK_SECRET is not configured.
          <br><br>
          Please add it to your .env file:
          <br>
          <code>MANYREACH_WEBHOOK_SECRET=your-secret-key</code>
        </div>
      </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ManyReach Webhook Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .test-section { margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        button { 
          background: #007bff; color: white; border: none; padding: 10px 20px; 
          border-radius: 4px; cursor: pointer; margin: 5px;
        }
        button:hover { background: #0056b3; }
        button.secondary { background: #6c757d; }
        button.secondary:hover { background: #545b62; }
        button.danger { background: #dc3545; }
        button.danger:hover { background: #c82333; }
        .result { 
          margin-top: 20px; padding: 15px; background: white; 
          border: 1px solid #ddd; border-radius: 4px; 
        }
        .success { border-color: #28a745; background: #d4edda; }
        .error { border-color: #dc3545; background: #f8d7da; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .info { background: #e9ecef; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        textarea { width: 100%; min-height: 200px; font-family: monospace; }
      </style>
    </head>
    <body>
      <h1>ManyReach Webhook Test Interface</h1>
      
      <div class="info">
        <strong>Webhook URL:</strong> <code>${request.url.replace('/test', '')}</code><br>
        <strong>Secret Configured:</strong> Yes (${secret.substring(0, 4)}...)<br>
        <strong>IP Bypass:</strong> ${process.env.MANYREACH_BYPASS_IP_CHECK === 'true' ? 'Enabled' : 'Disabled'}
      </div>

      <div class="grid">
        <div class="test-section">
          <h2>Quick Tests</h2>
          <p>Send test webhooks with different scenarios:</p>
          
          <h3>Success Scenarios</h3>
          <button onclick="sendTest('high')">High Confidence (85%+)</button>
          <button onclick="sendTest('medium')">Medium Confidence (70-84%)</button>
          <button onclick="sendTest('low')">Low Confidence (50-69%)</button>
          
          <h3>Edge Cases</h3>
          <button onclick="sendTest('no-website')" class="secondary">No Website Info</button>
          <button onclick="sendTest('no-offerings')" class="secondary">No Offerings</button>
          <button onclick="sendTest('auto-reply')" class="secondary">Auto-Reply</button>
          
          <h3>Error Scenarios</h3>
          <button onclick="sendTest('invalid-signature')" class="danger">Invalid Signature</button>
          <button onclick="sendTest('expired-timestamp')" class="danger">Expired Timestamp</button>
          <button onclick="sendTest('malformed')" class="danger">Malformed Payload</button>
        </div>

        <div class="test-section">
          <h2>Custom Payload</h2>
          <p>Edit and send custom webhook payload:</p>
          <textarea id="customPayload">{
  "event": "email_received",
  "email": {
    "from": {
      "email": "custom@publisher.com"
    },
    "content": {
      "text": "Custom email content here"
    }
  }
}</textarea>
          <br><br>
          <button onclick="sendCustom()">Send Custom Payload</button>
        </div>
      </div>

      <div id="result"></div>

      <script>
        async function sendTest(scenario) {
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = '<div class="result">Sending test webhook...</div>';
          
          try {
            const response = await fetch('/api/webhooks/manyreach/test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ scenario }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.innerHTML = \`
                <div class="result success">
                  <h3>✅ Test Successful</h3>
                  <p><strong>Scenario:</strong> \${scenario}</p>
                  <p><strong>Webhook Response:</strong></p>
                  <pre>\${JSON.stringify(data.webhookResponse, null, 2)}</pre>
                  <p><strong>Test Payload Sent:</strong></p>
                  <pre>\${JSON.stringify(data.payload, null, 2)}</pre>
                </div>
              \`;
            } else {
              resultDiv.innerHTML = \`
                <div class="result error">
                  <h3>❌ Test Failed</h3>
                  <p><strong>Scenario:</strong> \${scenario}</p>
                  <p><strong>Error:</strong> \${data.error}</p>
                  <p><strong>Status:</strong> \${data.webhookStatus}</p>
                  <pre>\${JSON.stringify(data.webhookResponse, null, 2)}</pre>
                </div>
              \`;
            }
          } catch (error) {
            resultDiv.innerHTML = \`
              <div class="result error">
                <h3>❌ Request Failed</h3>
                <p>\${error.message}</p>
              </div>
            \`;
          }
        }
        
        async function sendCustom() {
          const resultDiv = document.getElementById('result');
          const customPayload = document.getElementById('customPayload').value;
          
          try {
            const payload = JSON.parse(customPayload);
            resultDiv.innerHTML = '<div class="result">Sending custom webhook...</div>';
            
            const response = await fetch('/api/webhooks/manyreach/test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                scenario: 'custom',
                customPayload: payload 
              }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.innerHTML = \`
                <div class="result success">
                  <h3>✅ Custom Test Successful</h3>
                  <p><strong>Webhook Response:</strong></p>
                  <pre>\${JSON.stringify(data.webhookResponse, null, 2)}</pre>
                </div>
              \`;
            } else {
              resultDiv.innerHTML = \`
                <div class="result error">
                  <h3>❌ Custom Test Failed</h3>
                  <p><strong>Error:</strong> \${data.error}</p>
                  <pre>\${JSON.stringify(data.webhookResponse, null, 2)}</pre>
                </div>
              \`;
            }
          } catch (error) {
            resultDiv.innerHTML = \`
              <div class="result error">
                <h3>❌ Invalid JSON</h3>
                <p>\${error.message}</p>
              </div>
            \`;
          }
        }
      </script>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  });
}

// POST endpoint to send test webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario, customPayload } = body;
    
    const secret = process.env.MANYREACH_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'MANYREACH_WEBHOOK_SECRET not configured' },
        { status: 500 }
      );
    }
    
    let payload: any;
    let headers: Record<string, string>;
    
    if (scenario === 'custom' && customPayload) {
      payload = customPayload;
    } else {
      // Generate test payload based on scenario
      switch (scenario) {
        case 'high':
          payload = generateTestPayload({ confidence: 'high' });
          break;
        case 'medium':
          payload = generateTestPayload({ confidence: 'medium' });
          break;
        case 'low':
          payload = generateTestPayload({ confidence: 'low' });
          break;
        case 'no-website':
          payload = generateTestPayload({ hasWebsite: false });
          break;
        case 'no-offerings':
          payload = generateTestPayload({ hasOfferings: false });
          break;
        case 'auto-reply':
          payload = generateTestPayload({ isAutoReply: true });
          break;
        case 'failed':
          payload = generateTestPayload({ confidence: 'failed' });
          break;
        case 'malformed':
          payload = { invalid: 'structure' };
          break;
        case 'expired-timestamp':
          payload = generateTestPayload({ confidence: 'high' });
          payload.timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          break;
        default:
          payload = generateTestPayload();
      }
    }
    
    const payloadString = JSON.stringify(payload);
    
    // Generate headers
    headers = {
      'Content-Type': 'application/json',
      'x-manyreach-signature': scenario === 'invalid-signature' 
        ? 'sha256=invalid' 
        : generateSignature(payloadString, secret),
      'x-manyreach-webhook-id': payload.webhook_id || 'test-webhook',
      'x-manyreach-timestamp': payload.timestamp || new Date().toISOString(),
      'x-manyreach-campaign-id': payload.campaign?.id || 'test-campaign',
      'x-forwarded-for': '52.70.186.1', // ManyReach IP range
      'user-agent': 'ManyReach-Webhook/1.0',
    };
    
    // Send webhook to our secret endpoint
    const webhookSecret = process.env.MANYREACH_WEBHOOK_URL_SECRET || 'test-secret-please-change';
    const webhookUrl = new URL(`/api/webhooks/manyreach/${webhookSecret}`, request.url);
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: headers,
      body: payloadString,
    });
    
    const webhookData = await webhookResponse.json();
    
    return NextResponse.json({
      success: webhookResponse.ok,
      scenario: scenario,
      webhookStatus: webhookResponse.status,
      webhookResponse: webhookData,
      payload: payload,
      headers: headers,
    });
    
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}