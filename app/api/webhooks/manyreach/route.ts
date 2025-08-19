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
    is_auto_reply?: boolean;
  };
}

// ManyReach IP ranges for allowlisting
const MANYREACH_IP_RANGES = [
  '52.70.186.0/24',
  '34.224.132.0/24',
  '18.208.0.0/13'
];

// Validate HMAC signature (if ManyReach provides one)
function validateManyReachSignature(payload: string, signature: string): boolean {
  // ManyReach doesn't provide webhook secrets, so skip signature validation
  if (!signature || signature === '') {
    console.log('No signature provided by ManyReach - skipping validation');
    return true;
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
  if (ipParts.length !== 4 || ipParts.some(isNaN)) {
    console.error('Invalid IP format:', ip);
    return false;
  }
  
  // Check against ManyReach IP ranges
  for (const range of MANYREACH_IP_RANGES) {
    if (isIpInCIDR(ip, range)) {
      console.log('IP allowed from ManyReach range:', ip, range);
      return true;
    }
  }
  
  console.warn('IP not in ManyReach ranges:', ip);
  return false;
}

// Check if IP is within CIDR range
function isIpInCIDR(ip: string, cidr: string): boolean {
  const [rangeIp, maskBits] = cidr.split('/');
  const mask = parseInt(maskBits, 10);
  
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIp);
  
  // Create mask
  const maskNum = (0xffffffff << (32 - mask)) >>> 0;
  
  // Check if IP is in range
  return (ipNum & maskNum) === (rangeNum & maskNum);
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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
  
  // Validate security
  const signatureValid = validateManyReachSignature(rawBody, signature);
  const timestampValid = isTimestampValid(timestamp);
  const ipAllowed = isIpAllowed(ipAddress);
  
  // Log security check
  try {
    await db.insert(webhookSecurityLogs).values({
      webhookId,
      ipAddress,
      userAgent,
      signatureValid,
      signatureProvided: signature.substring(0, 500), // Truncate for storage
      timestampValid,
      ipAllowed,
      allowed: signatureValid && timestampValid && ipAllowed,
      rejectionReason: !signatureValid ? 'Invalid signature' : 
                       !timestampValid ? 'Invalid timestamp' : 
                       !ipAllowed ? 'IP not allowed' : null,
    });
  } catch (error) {
    console.error('Failed to log security check:', error);
  }
  
  // Reject if security checks fail (only if signature was provided)
  if (!signatureValid && signature && signature !== '') {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }
  
  // Skip timestamp validation for ManyReach (they don't send timestamps)
  if (false && !timestampValid) {
    return NextResponse.json(
      { error: 'Request timestamp expired' },
      { status: 401 }
    );
  }
  
  if (!ipAllowed) {
    return NextResponse.json(
      { error: 'IP not allowed' },
      { status: 403 }
    );
  }
  
  // Parse payload
  let payload: any; // Use any for now to see what ManyReach actually sends
  try {
    payload = JSON.parse(rawBody);
    console.log('ManyReach webhook payload:', JSON.stringify(payload, null, 2));
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }
  
  // Handle ManyReach's actual payload structure
  if (payload.eventId === 'prospect_replied') {
    // Transform ManyReach payload to our expected structure
    const transformedPayload: ManyReachWebhookPayload = {
      event: 'email_received',
      webhook_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      campaign: {
        id: payload.campaignid || 'unknown',
        name: 'ManyReach Campaign',
        type: 'outreach',
      },
      email: {
        message_id: crypto.randomUUID(),
        from: {
          email: payload.prospect?.email || 'unknown@email.com',
          name: `${payload.prospect?.firstname || ''} ${payload.prospect?.lastname || ''}`.trim(),
        },
        to: {
          email: payload.sender_email || 'outreach@company.com',
          name: 'Outreach Team',
        },
        subject: 'Re: Guest Post Opportunity',
        received_at: new Date().toISOString(),
        content: {
          text: payload.message || '',
          html: `<p>${payload.message || ''}</p>`,
        },
      },
      original_outreach: {
        sent_at: new Date().toISOString(),
        subject: 'Guest Post Opportunity',
        recipient_website: payload.prospect?.www || payload.prospect?.domain || '',
      },
      metadata: {
        is_auto_reply: false,
      },
    };
    
    // Use the transformed payload
    payload = transformedPayload;
  } else if (!payload.email?.from?.email || !payload.email?.content?.text) {
    return NextResponse.json(
      { error: 'Missing required email fields' },
      { status: 400 }
    );
  }
  
  try {
    // Store raw email in database
    const [emailLog] = await db.insert(emailProcessingLogs).values({
      webhookId: payload.webhook_id,
      campaignId: payload.campaign.id,
      campaignName: payload.campaign.name,
      campaignType: payload.campaign.type,
      emailFrom: payload.email.from.email,
      emailTo: payload.email.to?.email,
      emailSubject: payload.email.subject,
      emailMessageId: payload.email.message_id,
      receivedAt: payload.email.received_at ? new Date(payload.email.received_at) : new Date(),
      rawContent: payload.email.content.text,
      htmlContent: payload.email.content.html,
      threadId: payload.metadata?.thread_id,
      replyCount: payload.metadata?.reply_count || 0,
      isAutoReply: payload.metadata?.is_auto_reply || false,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Process asynchronously to avoid webhook timeout
    processEmailAsync(emailLog.id, payload);
    
    // Return success immediately
    const processingTime = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      message: 'Webhook received and queued for processing',
      webhook_id: payload.webhook_id,
      processing_id: emailLog.id,
      estimated_completion: new Date(Date.now() + 30000).toISOString(), // 30 seconds estimate
    });
    
  } catch (error) {
    console.error('Failed to process webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Use retry configuration from centralized config
const RETRY_CONFIG = shadowPublisherConfig.retry;

// Async processing function with retry logic
async function processEmailAsync(
  emailLogId: string, 
  payload: ManyReachWebhookPayload,
  attempt: number = 1
) {
  const startTime = Date.now();
  
  try {
    // Initialize services
    const emailParser = new EmailParserService();
    const shadowPublisher = new ShadowPublisherService();
    
    // Parse email content with AI
    const parsedData = await emailParser.parseEmail({
      from: payload.email.from.email,
      subject: payload.email.subject,
      content: payload.email.content.text,
      htmlContent: payload.email.content.html,
      campaignType: payload.campaign.type,
      originalWebsite: payload.original_outreach?.recipient_website,
    });
    
    // Update email log with parsed data
    await db.update(emailProcessingLogs)
      .set({
        parsedData: JSON.stringify(parsedData),
        confidenceScore: parsedData.overallConfidence?.toFixed(2),
        parsingErrors: parsedData.errors ? JSON.stringify(parsedData.errors) : null,
        status: 'parsed',
        processedAt: new Date(),
        processingDurationMs: Date.now() - startTime,
        updatedAt: new Date(),
      })
      .where(eq(emailProcessingLogs.id, emailLogId));
    
    // Process shadow publisher based on confidence threshold
    if (parsedData.overallConfidence && parsedData.overallConfidence >= shadowPublisherConfig.confidence.minProcessing) {
      await shadowPublisher.processPublisherFromEmail(
        emailLogId,
        parsedData,
        payload.campaign.type
      );
    } else {
      // Add to review queue for manual processing
      await shadowPublisher.addToReviewQueue(
        emailLogId,
        parsedData,
        'low_confidence'
      );
    }
    
  } catch (error) {
    console.error(`Failed to process email async (attempt ${attempt}):`, error);
    
    // Check if we should retry
    if (attempt < RETRY_CONFIG.maxAttempts) {
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelayMs
      );
      
      console.log(`Retrying email processing in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
      
      // Update status to retrying
      await db.update(emailProcessingLogs)
        .set({
          status: 'retrying',
          errorMessage: `Retry attempt ${attempt + 1} after error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          updatedAt: new Date(),
        })
        .where(eq(emailProcessingLogs.id, emailLogId));
      
      // Wait and retry
      setTimeout(() => {
        processEmailAsync(emailLogId, payload, attempt + 1);
      }, delay);
      
    } else {
      // Max retries reached, mark as failed
      await db.update(emailProcessingLogs)
        .set({
          status: 'failed',
          errorMessage: `Failed after ${attempt} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          processedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
          updatedAt: new Date(),
        })
        .where(eq(emailProcessingLogs.id, emailLogId));
      
      // Add to review queue for manual intervention
      const shadowPublisher = new ShadowPublisherService();
      await shadowPublisher.addToReviewQueue(
        emailLogId,
        { 
          sender: { email: payload.email.from.email, confidence: 0 },
          websites: [],
          offerings: [],
          overallConfidence: 0,
          missingFields: ['all'],
          errors: [`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        },
        'processing_failed'
      );
    }
  }
}

// GET endpoint for webhook health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    webhook: 'manyreach',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}