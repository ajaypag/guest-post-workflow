import { NextResponse } from 'next/server';
import { ManyReachPollingService } from '@/lib/services/manyReachPollingService';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('🧪 Testing polling service with V2 qualification...');
    
    // Create a test email log entry for rejection
    const [logEntry] = await db.insert(emailProcessingLogs).values({
      emailFrom: 'rejection-test@example.com',
      rawContent: "I'm sorry but I'm not interested in an exchange",
      status: 'pending',
      campaignId: 'test-campaign-polling',
      campaignName: 'Polling Test'
    }).returning();
    
    console.log('📝 Created test email log:', logEntry.id);
    
    // Simulate the polling service processing
    const pollingService = new ManyReachPollingService();
    
    // Use reflection to access private method for testing
    const result = await (pollingService as any).processReplyMessage(
      { email: 'rejection-test@example.com', company: 'Test Company' },
      { emailBody: "I'm sorry but I'm not interested in an exchange", type: 'REPLY' },
      logEntry
    );
    
    console.log('📊 Processing result:', result);
    
    // Check what was saved to the database
    const [updatedLog] = await db
      .select()
      .from(emailProcessingLogs)
      .where(eq(emailProcessingLogs.id, logEntry.id))
      .limit(1);
    
    return NextResponse.json({
      success: true,
      logId: logEntry.id,
      result: result,
      qualificationStatus: updatedLog.qualificationStatus,
      disqualificationReason: updatedLog.disqualificationReason,
      publisherCreated: result?.publisherId !== null
    });
    
  } catch (error) {
    console.error('❌ Polling test failed:', error);
    return NextResponse.json(
      { 
        error: 'Polling test failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}