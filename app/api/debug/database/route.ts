import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Basic query
    const timeResult = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Basic query works:', timeResult);
    
    // Test 2: Insert and rollback test  
    console.log('🔍 Testing email_processing_logs insert...');
    
    const [logEntry] = await db.insert(emailProcessingLogs).values({
      webhookId: 'debug-test-' + Date.now(),
      campaignId: 'debug-campaign',
      campaignName: 'Debug Test Campaign', 
      campaignType: 'outreach',
      emailFrom: 'debug@test.com',
      emailTo: 'debug@recipient.com',
      emailSubject: 'Debug Test Subject',
      emailMessageId: 'debug-message-id',
      receivedAt: new Date(),
      rawContent: 'Debug test content',
      htmlContent: null,
      threadId: null,
      replyCount: 0,
      status: 'processing',
      processingDurationMs: null,
    }).returning();
    
    console.log('✅ Insert successful:', {
      id: logEntry.id,
      emailFrom: logEntry.emailFrom,
      status: logEntry.status
    });
    
    // Test 3: Verify the record exists
    const verifyResult = await db.execute(
      sql`SELECT id, email_from, status FROM email_processing_logs WHERE id = ${logEntry.id}`
    );
    console.log('✅ Verification query result:', verifyResult);
    
    // Test 4: Clean up
    await db.execute(
      sql`DELETE FROM email_processing_logs WHERE id = ${logEntry.id}`
    );
    console.log('✅ Cleanup completed');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test passed',
      testResults: {
        basicQuery: 'success',
        insertTest: 'success',
        verifyTest: 'success',
        cleanupTest: 'success'
      }
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Full error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}