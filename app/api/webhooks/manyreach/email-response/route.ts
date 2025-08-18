import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/schema';
import crypto from 'crypto';

// Webhook signature validation
function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.MANYREACH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('MANYREACH_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature validation
    const rawBody = await request.text();
    
    // Validate webhook signature (if ManyReach provides one)
    const signature = request.headers.get('x-manyreach-signature');
    if (signature && !validateWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    
    // Extract email data from ManyReach webhook
    // Note: Adjust these fields based on actual ManyReach webhook format
    const emailData = {
      webhookId: payload.id || crypto.randomUUID(),
      eventType: payload.event || 'email.received',
      emailFrom: payload.from_email || payload.prospect?.email || '',
      emailTo: payload.to_email || '',
      emailSubject: payload.subject || '',
      emailBody: payload.body || payload.message || '',
      campaignId: payload.campaign_id,
      prospectData: payload.prospect || {},
      receivedAt: payload.received_at || new Date().toISOString(),
      rawPayload: payload
    };

    // Store in database for processing
    const [log] = await db.insert(emailProcessingLogs).values({
      id: crypto.randomUUID(),
      webhookId: emailData.webhookId,
      emailFrom: emailData.emailFrom,
      emailSubject: emailData.emailSubject,
      rawContent: emailData.emailBody,
      parsedData: {
        eventType: emailData.eventType,
        campaignId: emailData.campaignId,
        prospectData: emailData.prospectData,
        receivedAt: emailData.receivedAt,
        rawPayload: emailData.rawPayload
      },
      status: 'pending',
      createdAt: new Date()
    }).returning();

    // Queue for async processing
    // In production, use a proper queue (Redis, SQS, etc.)
    // For now, we'll process inline but return immediately
    processEmailAsync(log.id).catch(console.error);

    // Return success immediately (webhook best practice)
    return NextResponse.json({
      success: true,
      logId: log.id,
      message: 'Webhook received and queued for processing'
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Still return 200 to prevent webhook retries for bad data
    return NextResponse.json({
      success: false,
      error: 'Processing error logged'
    });
  }
}

// Async processing function (runs in background)
async function processEmailAsync(logId: string) {
  try {
    // Import services dynamically to avoid circular dependencies
    const { EmailParserService } = await import('@/lib/services/emailParserService');
    const { PublisherMatchingService } = await import('@/lib/services/publisherMatchingService');
    
    // Get the log entry
    const [log] = await db
      .select()
      .from(emailProcessingLogs)
      .where(eq(emailProcessingLogs.id, logId))
      .limit(1);

    if (!log) {
      console.error(`Log ${logId} not found`);
      return;
    }

    // Parse email with OpenAI
    const parser = new EmailParserService();
    const parsedData = await parser.parsePublisherEmail(
      log.rawContent || '',
      log.emailFrom || '',
      log.emailSubject || ''
    );

    // Update log with parsed data
    await db
      .update(emailProcessingLogs)
      .set({
        parsedData: {
          ...log.parsedData,
          extracted: parsedData,
          confidence: parsedData.confidence
        },
        confidenceScore: parsedData.confidence
      })
      .where(eq(emailProcessingLogs.id, logId));

    // If confidence is high enough, process the data
    if (parsedData.confidence >= 0.7) {
      const matcher = new PublisherMatchingService();
      await matcher.processPublisherData(parsedData, logId);
      
      // Mark as processed
      await db
        .update(emailProcessingLogs)
        .set({
          status: 'processed',
          processedAt: new Date()
        })
        .where(eq(emailProcessingLogs.id, logId));
    } else {
      // Mark for manual review
      await db
        .update(emailProcessingLogs)
        .set({
          status: 'manual_review'
        })
        .where(eq(emailProcessingLogs.id, logId));
    }

  } catch (error) {
    console.error(`Error processing email log ${logId}:`, error);
    
    // Mark as failed
    await db
      .update(emailProcessingLogs)
      .set({
        status: 'failed',
        parsedData: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      .where(eq(emailProcessingLogs.id, logId));
  }
}

// Import after to avoid issues
import { eq } from 'drizzle-orm';