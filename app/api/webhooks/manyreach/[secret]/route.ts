import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs, webhookSecurityLogs } from '@/lib/db/emailProcessingSchema';
import { EmailParserService } from '@/lib/services/emailParserService';
import { ShadowPublisherService } from '@/lib/services/shadowPublisherService';
import { shadowPublisherConfig } from '@/lib/config/shadowPublisherConfig';
import { eq } from 'drizzle-orm';

// ManyReach actual webhook payload interface
interface ManyReachWebhookPayload {
  eventId: string; // 'prospect_replied'
  campaignid: string;
  message: string; // The actual reply message
  prospect: {
    email: string;
    firstname: string;
    lastname: string;
    company: string;
    www?: string;
    domain?: string;
    industry?: string;
    country?: string;
    state?: string;
    city?: string;
    phone?: string;
    // Custom fields
    [key: string]: any;
  };
  description?: string;
  sender_email?: string;
}

// Validate webhook secret in URL
function validateWebhookSecret(secret: string): boolean {
  const expectedSecret = process.env.MANYREACH_WEBHOOK_URL_SECRET;
  
  if (!expectedSecret) {
    console.warn('🚨 MANYREACH_WEBHOOK_URL_SECRET not configured - webhook is NOT secure!');
    console.warn('⚠️  Anyone who discovers this URL can send fake webhook requests');
    console.warn('💡 Generate a secret: openssl rand -hex 32');
    return false; // Deny access if no secret is configured
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(secret, 'utf8'),
      Buffer.from(expectedSecret, 'utf8')
    );
  } catch (error) {
    console.error('Secret validation error:', error);
    return false;
  }
}

// Validate ManyReach signature (if they support it)
function validateManyReachSignature(payload: string, signature: string): boolean {
  // If no signature provided, log but don't fail (ManyReach might not send signatures)
  if (!signature || signature === '') {
    console.log('No signature provided by ManyReach - relying on URL secret for security');
    return true; // Don't fail on missing signature since ManyReach may not support it
  }
  
  const secret = process.env.MANYREACH_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('MANYREACH_WEBHOOK_SECRET not configured - skipping signature validation');
    return true;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// Check if IP is in allowed ranges
function isIpAllowed(ip: string): boolean {
  // In development, always allow
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Check if bypass is enabled (for testing)
  if (process.env.MANYREACH_BYPASS_IP_CHECK === 'true') {
    console.log('IP check bypassed for:', ip);
    return true;
  }
  
  // Parse IP address
  const ipParts = ip.split('.').map(Number);
  
  // Check if it's a valid IPv4 address
  if (ipParts.length !== 4 || ipParts.some(part => isNaN(part) || part < 0 || part > 255)) {
    console.log('Invalid IP format:', ip);
    return false;
  }

  const ipNum = ipToNumber(ip);
  
  // Add ManyReach's IP ranges here - you'll need to get these from their support
  // For now, allow common webhook service ranges
  const allowedRanges = [
    { start: ipToNumber('192.168.1.0'), end: ipToNumber('192.168.1.255') }, // Local network
    // Add ManyReach's actual IP ranges here
  ];

  return allowedRanges.some(range => ipNum >= range.start && ipNum <= range.end);
}

// Convert IP string to number
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

// Check if timestamp is within acceptable window (5 minutes)
function isTimestampValid(timestamp: string): boolean {
  // Skip timestamp validation if not provided
  if (!timestamp || timestamp === '') {
    console.log('No timestamp provided - skipping validation');
    return true;
  }
  
  try {
    const webhookTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    const isValid = Math.abs(currentTime - webhookTime) <= fiveMinutes;
    if (!isValid) {
      console.log(`Timestamp validation failed: webhook time ${new Date(webhookTime)}, current time ${new Date(currentTime)}`);
    }
    return isValid;
  } catch (error) {
    console.error('Timestamp parsing error:', error);
    return true; // Be lenient if timestamp format is unexpected
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const startTime = Date.now();
  
  // Await params in Next.js 15
  const { secret } = await params;
  
  // Skip URL secret validation - ManyReach uses API key instead
  const secretValid = true; // validateWebhookSecret(secret);
  
  // Log all headers for debugging
  console.log('📋 Webhook Headers:', Object.fromEntries(request.headers.entries()));
  
  // Get request details for security logging
  const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization') || '';
  const signature = request.headers.get('x-manyreach-signature') || '';
  const webhookId = request.headers.get('x-manyreach-webhook-id') || '';
  const timestamp = request.headers.get('x-manyreach-timestamp') || '';
  const campaignId = request.headers.get('x-manyreach-campaign-id') || '';
  
  // Get raw body for signature validation
  const rawBody = await request.text();
  
  // Validate security (skip other checks if secret is invalid)
  const signatureValid = secretValid ? validateManyReachSignature(rawBody, signature) : false;
  const timestampValid = secretValid ? isTimestampValid(timestamp) : false;
  const ipAllowed = secretValid ? isIpAllowed(ipAddress) : false;
  
  // Log security check
  try {
    await db.insert(webhookSecurityLogs).values({
      webhookId,
      ipAddress,
      userAgent,
      signatureValid,
      signatureProvided: signature || null,
      timestampValid,
      ipAllowed,
      allowed: secretValid && signatureValid && timestampValid && ipAllowed,
      rejectionReason: !secretValid 
        ? 'Invalid URL secret' 
        : !signatureValid 
        ? 'Invalid signature' 
        : !timestampValid 
        ? 'Invalid timestamp' 
        : !ipAllowed 
        ? 'IP not allowed' 
        : null,
    });
  } catch (logError) {
    console.error('Failed to log security check:', logError);
    // Continue processing even if logging fails
  }
  
  // Validate ManyReach API key
  const expectedApiKey = process.env.MANYREACH_API_KEY;
  
  if (apiKey) {
    console.log('📝 ManyReach API Key received:', apiKey);
    if (apiKey !== expectedApiKey && apiKey !== `Bearer ${expectedApiKey}`) {
      console.error('🚨 Invalid ManyReach API key');
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
  } else {
    console.warn('⚠️ No API key provided by ManyReach');
    // For now, allow requests without API key since ManyReach might not send it with webhooks
  }
  
  if (!signatureValid || !timestampValid || !ipAllowed) {
    console.error('🚨 Webhook security validation failed:', {
      signature: signatureValid,
      timestamp: timestampValid,
      ip: ipAllowed
    });
    return NextResponse.json(
      { error: 'Webhook validation failed' },
      { status: 403 }
    );
  }
  
  console.log('✅ Webhook security validation passed');
  
  try {
    // Check if this is an empty test request
    if (!rawBody || rawBody.trim() === '' || rawBody === '{}') {
      console.log('📝 Empty test webhook received from ManyReach');
      return NextResponse.json({
        success: true,
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString()
      });
    }
    
    const payload: ManyReachWebhookPayload = JSON.parse(rawBody);
    
    // Log the actual payload for debugging
    console.log('📦 Received ManyReach payload:', JSON.stringify(payload, null, 2));
    
    // Check if this is a test payload without actual email data
    if (Object.keys(payload).length === 0) {
      console.log('📝 Test webhook with empty payload received');
      return NextResponse.json({
        success: true,
        message: 'Test webhook validated',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate webhook payload structure for ManyReach
    if (!payload.prospect?.email || !payload.message) {
      console.error('Invalid webhook payload structure:', JSON.stringify(payload, null, 2));
      console.error('Expected format: { prospect: { email: "..." }, message: "..." }');
      // For debugging, return what we received so we can see in ManyReach
      return NextResponse.json(
        { 
          error: 'Invalid payload structure',
          expected: {
            prospect: { email: 'required', firstname: 'optional', lastname: 'optional' },
            message: 'required',
            eventId: 'optional',
            campaignid: 'optional'
          },
          received: Object.keys(payload)
        },
        { status: 400 }
      );
    }

    // Create email processing log entry adapted for ManyReach
    const [logEntry] = await db.insert(emailProcessingLogs).values({
      webhookId: `manyreach-${Date.now()}`,
      campaignId: payload.campaignid || 'unknown',
      campaignName: 'ManyReach Campaign',
      campaignType: 'outreach',
      emailFrom: payload.prospect.email,
      emailTo: payload.sender_email || 'outreach@linkio.com',
      emailSubject: `Reply from ${payload.prospect.firstname} ${payload.prospect.lastname}`,
      emailMessageId: `manyreach-${Date.now()}`,
      receivedAt: new Date(),
      rawContent: payload.message,
      htmlContent: null,
      threadId: null,
      replyCount: 0,
      status: 'processing',
      processingDurationMs: null,
    }).returning();

    console.log(`📧 Processing email from ${payload.prospect.email} (Log ID: ${logEntry.id})`);

    // Parse the email content with AI
    const emailParser = new EmailParserService();
    const parsedData = await emailParser.parseEmail({
      from: payload.prospect.email,
      subject: `Reply from ${payload.prospect.company || payload.prospect.firstname}`,
      content: payload.message
    });

    // Update log with parsing results
    await db.update(emailProcessingLogs)
      .set({
        parsedData: parsedData as any,
        confidenceScore: parsedData.overallConfidence.toString(),
        parsingErrors: (parsedData.errors || []) as any,
        status: parsedData.overallConfidence >= shadowPublisherConfig.confidence.autoApprove ? 'parsed' : 'needs_review',
        processedAt: new Date(),
        processingDurationMs: Date.now() - startTime,
      })
      .where(eq(emailProcessingLogs.id, logEntry.id));

    console.log(`🤖 AI parsing completed with confidence: ${(parsedData.overallConfidence * 100).toFixed(1)}%`);

    // If confidence is high enough, create shadow publisher
    let publisherId = null;
    if (parsedData.overallConfidence >= shadowPublisherConfig.confidence.autoApprove) {
      try {
        const shadowPublisherService = new ShadowPublisherService();
        publisherId = await shadowPublisherService.processPublisherFromEmail(logEntry.id, parsedData, 'outreach');
        
        console.log(`✅ Shadow publisher created with ID: ${publisherId}`);
      } catch (publisherError) {
        console.error('Failed to create shadow publisher:', publisherError);
        // Update log with error but don't fail the webhook
        await db.update(emailProcessingLogs)
          .set({
            status: 'failed',
            errorMessage: `Publisher creation failed: ${publisherError instanceof Error ? publisherError.message : 'Unknown error'}`
          })
          .where(eq(emailProcessingLogs.id, logEntry.id));
      }
    } else {
      console.log(`⏸️ Confidence too low (${(parsedData.overallConfidence * 100).toFixed(1)}%) - queued for review`);
    }

    return NextResponse.json({
      success: true,
      emailLogId: logEntry.id,
      publisherId,
      parsedData: {
        confidence: parsedData.overallConfidence,
        offerings: parsedData.offerings?.length || 0,
        websiteDetected: parsedData.websites?.[0] || null,
      }
    });

  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Webhook processing failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check endpoint (no secret required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  // Await params in Next.js 15
  const { secret } = await params;
  
  // Check for ManyReach API key validation request
  const apiKey = request.headers.get('x-api-key') || 
                request.headers.get('authorization') ||
                request.headers.get('api-key');
  
  const expectedApiKey = process.env.MANYREACH_API_KEY;
  
  if (apiKey) {
    console.log('📝 ManyReach API Key validation - Received:', apiKey);
    console.log('📝 Expected:', expectedApiKey);
    
    // Validate ManyReach's API key
    if (apiKey === expectedApiKey || apiKey === `Bearer ${expectedApiKey}`) {
      // Return success for valid ManyReach API key
      return NextResponse.json({
        status: 'success',
        message: 'Webhook endpoint validated'
      });
    } else {
      // Invalid API key
      return NextResponse.json({
        error: 'Invalid API key'
      }, { status: 401 });
    }
  }
  
  // For regular GET health checks (not ManyReach validation)
  // Skip URL secret validation since ManyReach doesn't know about it
  return NextResponse.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: 'ManyReach webhook endpoint is ready'
  });
}