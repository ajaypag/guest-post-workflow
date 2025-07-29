import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { Pool } from 'pg';
import { AirtableService } from '@/lib/services/airtableService';
import { AirtableSyncService } from '@/lib/services/airtableSyncService';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

// Verify webhook signature (if Airtable implements this in the future)
function verifyWebhook(request: NextRequest): boolean {
  // For now, we'll verify by checking a secret token
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.AIRTABLE_WEBHOOK_SECRET;
  
  if (!expectedToken) {
    console.warn('⚠️ AIRTABLE_WEBHOOK_SECRET not configured');
    return true; // Allow in dev, but log warning
  }
  
  return authHeader === `Bearer ${expectedToken}`;
}

export async function POST(request: NextRequest) {
  console.log('🪝 Airtable webhook received');
  
  // Verify webhook
  if (!verifyWebhook(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const payload = await request.json();
    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2));
    
    // Store webhook event
    const eventResult = await pool.query(`
      INSERT INTO airtable_webhook_events (
        webhook_id, event_type, table_id, record_id, payload
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      payload.webhook?.id || 'unknown',
      payload.type || 'unknown',
      payload.base?.table?.id || payload.tableId,
      payload.record?.id || payload.recordId,
      payload
    ]);
    
    const eventId = eventResult.rows[0].id;
    
    // Process the webhook based on type
    try {
      if (payload.type === 'table.record.created' || payload.type === 'table.record.updated') {
        await processRecordChange(payload);
      } else if (payload.type === 'table.record.deleted') {
        await processRecordDeletion(payload);
      }
      
      // Mark as processed
      await pool.query(`
        UPDATE airtable_webhook_events 
        SET processed = true, processed_at = NOW()
        WHERE id = $1
      `, [eventId]);
      
    } catch (error: any) {
      // Log error but don't fail the webhook
      console.error('Error processing webhook:', error);
      
      await pool.query(`
        UPDATE airtable_webhook_events 
        SET processed = true, processed_at = NOW(), error = $1
        WHERE id = $2
      `, [error.message, eventId]);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processRecordChange(payload: any) {
  const recordId = payload.record?.id || payload.recordId;
  const tableId = payload.base?.table?.id || payload.tableId;
  
  console.log(`🔄 Processing record change: ${recordId} in table ${tableId}`);
  
  // Check if this is the Website table
  if (tableId === 'tblT8P0fPHV5fdrT5') {
    // Fetch the updated record from Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${tableId}/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      
      // Convert to our format and sync
      const website = AirtableService['processWebsiteRecord'](data);
      await AirtableSyncService.syncWebsite(website);
      
      console.log(`✅ Synced website: ${website.domain}`);
    }
  }
  // Add handling for Link Price table if needed
}

async function processRecordDeletion(payload: any) {
  const recordId = payload.record?.id || payload.recordId;
  const tableId = payload.base?.table?.id || payload.tableId;
  
  console.log(`🗑️ Processing record deletion: ${recordId} in table ${tableId}`);
  
  // Check if this is the Website table
  if (tableId === 'tblT8P0fPHV5fdrT5') {
    // Soft delete or mark as inactive
    await pool.query(`
      UPDATE websites 
      SET status = 'Deleted', updated_at = NOW()
      WHERE airtable_id = $1
    `, [recordId]);
    
    console.log(`✅ Marked website as deleted: ${recordId}`);
  }
}

// GET endpoint to check webhook health
export async function GET(request: NextRequest) {
  try {
    // Get recent webhook events
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed,
        COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as errors,
        MAX(received_at) as last_received
      FROM airtable_webhook_events
      WHERE received_at > NOW() - INTERVAL '24 hours'
    `);
    
    return NextResponse.json({
      status: 'ok',
      stats: result.rows[0],
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/airtable/webhook`
    });
  } catch (error) {
    console.error('Webhook health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}