import { NextRequest, NextResponse } from 'next/server';
import { ChatwootService } from '@/lib/services/chatwootService';
import crypto from 'crypto';

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.CHATWOOT_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('CHATWOOT_WEBHOOK_SECRET not configured');
    return false;
  }

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
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Get signature from headers
    const signature = request.headers.get('x-chatwoot-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse body
    const data = JSON.parse(rawBody);
    const { event } = data;

    console.log(`[Chatwoot Webhook] Received event: ${event}`);

    // Handle the webhook
    await ChatwootService.handleWebhook(event, data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Chatwoot Webhook] Error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}