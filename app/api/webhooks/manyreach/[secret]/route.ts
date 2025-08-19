import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs, webhookSecurityLogs } from '@/lib/db/emailProcessingSchema';
import { EmailParserService } from '@/lib/services/emailParserService';
import { ShadowPublisherService } from '@/lib/services/shadowPublisherService';
import { shadowPublisherConfig } from '@/lib/config/shadowPublisherConfig';
import { eq } from 'drizzle-orm';

// ManyReach webhook payload interface
interface ManyReachWebhookPayload {
  event: 'email_received';
  webhook_id: string;
  timestamp: string;
  campaign: {
    id: string;
    name: string;
    type: 'outreach' | 'follow_up' | 'bulk';
    original_email_subject?: string;
  };
  email: {
    message_id: string;
    from: {
      email: string;
      name?: string;
    };
    to: {
      email: string;
      name?: string;
    };
    subject: string;
    received_at: string;
    content: {
      text: string;
      html?: string;
    };
    attachments?: Array<{
      filename: string;
      content_type: string;
      size: number;
      url?: string;
    }>;
  };
  original_outreach?: {
    sent_at: string;
    subject: string;
    recipient_website?: string;
  };
  metadata?: {
    thread_id?: string;
    reply_count?: number;
    prospect_name?: string;
    prospect_company?: string;
    prospect_website?: string;
    original_campaign_id?: string;
  };
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
  { params }: { params: { secret: string } }
) {
  const startTime = Date.now();
  
  // Validate URL secret first (most important security check)
  const secretValid = validateWebhookSecret(params.secret);
  
  // Get request details for security logging
  const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
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
  
  // Deny request if security checks fail
  if (!secretValid) {
    console.error('🚨 Webhook access denied: Invalid URL secret');
    return NextResponse.json(
      { error: 'Invalid webhook URL' },
      { status: 401 }
    );
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
    const payload: ManyReachWebhookPayload = JSON.parse(rawBody);
    
    // Validate webhook payload structure
    if (!payload.email?.from?.email || !payload.email?.content?.text) {
      console.error('Invalid webhook payload structure:', payload);
      return NextResponse.json(
        { error: 'Invalid payload structure' },
        { status: 400 }
      );
    }

    // Create email processing log entry
    const [logEntry] = await db.insert(emailProcessingLogs).values({
      webhookId: payload.webhook_id,
      campaignId: payload.campaign.id,
      campaignName: payload.campaign.name,
      campaignType: payload.campaign.type,
      emailFrom: payload.email.from.email,
      emailTo: payload.email.to.email,
      emailSubject: payload.email.subject,
      emailMessageId: payload.email.message_id,
      receivedAt: new Date(payload.email.received_at),
      rawContent: payload.email.content.text,
      htmlContent: payload.email.content.html || null,
      threadId: payload.metadata?.thread_id || null,
      replyCount: payload.metadata?.reply_count || 0,
      status: 'processing',
      processingDurationMs: null,
    }).returning();

    console.log(`📧 Processing email from ${payload.email.from.email} (Log ID: ${logEntry.id})`);

    // Parse the email content with AI
    const emailParser = new EmailParserService();
    const parsedData = await emailParser.parseEmailContent({
      from: payload.email.from.email,
      subject: payload.email.subject,
      content: payload.email.content.text,
      metadata: {
        prospectName: payload.metadata?.prospect_name,
        prospectCompany: payload.metadata?.prospect_company,
        originalWebsite: payload.metadata?.prospect_website,
        threadId: payload.metadata?.thread_id,
      }
    });

    // Update log with parsing results
    await db.update(emailProcessingLogs)
      .set({
        parsedData: parsedData,
        confidenceScore: parsedData.overallConfidence,
        parsingErrors: parsedData.errors || [],
        status: parsedData.overallConfidence >= shadowPublisherConfig.confidenceThreshold ? 'parsed' : 'needs_review',
        processedAt: new Date(),
        processingDurationMs: Date.now() - startTime,
      })
      .where(eq(emailProcessingLogs.id, logEntry.id));

    console.log(`🤖 AI parsing completed with confidence: ${(parsedData.overallConfidence * 100).toFixed(1)}%`);

    // If confidence is high enough, create shadow publisher
    let publisherId = null;
    if (parsedData.overallConfidence >= shadowPublisherConfig.confidenceThreshold) {
      try {
        const shadowPublisherService = new ShadowPublisherService();
        publisherId = await shadowPublisherService.processEmailResponse(logEntry.id, parsedData);
        
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
        websiteDetected: parsedData.websiteInfo?.domain || null,
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
  { params }: { params: { secret: string } }
) {
  // For GET requests, just validate the secret and return status
  const secretValid = validateWebhookSecret(params.secret);
  
  if (!secretValid) {
    return NextResponse.json(
      { error: 'Invalid webhook URL' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: 'ManyReach webhook endpoint is ready',
    security: 'URL secret validated'
  });
}