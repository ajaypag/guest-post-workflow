import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Clearing all drafts and email logs...');
    
    // Clear drafts
    await db.execute(sql`DELETE FROM publisher_drafts`);
    console.log('✅ Cleared publisher_drafts');
    
    // Clear email logs for LI campaign
    await db.execute(sql`DELETE FROM email_processing_logs WHERE campaign_name = 'LI for BB (countrybrook)'`);
    console.log('✅ Cleared email_processing_logs');
    
    return NextResponse.json({
      success: true,
      message: 'All data cleared successfully'
    });
    
  } catch (error) {
    console.error('Clear error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Clear failed' },
      { status: 500 }
    );
  }
}