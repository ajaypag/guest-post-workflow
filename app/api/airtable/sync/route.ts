import { NextRequest, NextResponse } from 'next/server';
import { AirtableSyncService } from '@/lib/services/airtableSyncService';
import { db } from '@/lib/db/connection';
import { Pool } from 'pg';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

export async function POST(request: NextRequest) {
  console.log('🔄 Airtable sync API called');
  
  try {
    // TODO: Add proper authentication check here
    // For now, allow all requests (will be protected by auth middleware later)
    
    const { syncType = 'full' } = await request.json();
    
    console.log(`📊 Starting ${syncType} sync...`);
    
    const stats = await AirtableSyncService.fullSync();
    
    return NextResponse.json({
      success: true,
      stats,
      message: `Sync completed: ${stats.created} created, ${stats.updated} updated, ${stats.errors} errors`
    });
  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    // Get sync history
    const result = await pool.query(`
      SELECT 
        sync_type,
        action,
        status,
        started_at,
        completed_at,
        records_processed,
        error,
        EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
      FROM website_sync_logs
      WHERE started_at > NOW() - CAST($1 AS INTERVAL)
      ORDER BY started_at DESC
      LIMIT 20
    `, [`${days} days`]);
    
    // Get current database stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM websites) as total_websites,
        (SELECT COUNT(*) FROM website_contacts) as total_contacts,
        (SELECT COUNT(*) FROM website_qualifications) as total_qualifications,
        (SELECT MAX(last_synced_at) FROM websites) as last_sync
    `);
    
    return NextResponse.json({
      syncHistory: result.rows,
      currentStats: statsResult.rows[0],
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/airtable/webhook`
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}