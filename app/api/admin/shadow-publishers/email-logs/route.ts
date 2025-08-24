import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recent email logs
    const logs = await db
      .select()
      .from(emailProcessingLogs)
      .orderBy(desc(emailProcessingLogs.receivedAt))
      .limit(100);

    // Transform the data
    const transformedLogs = logs.map(log => ({
      id: log.id,
      webhookId: log.webhookId,
      campaignId: log.campaignId,
      campaignName: log.campaignName,
      campaignType: log.campaignType,
      emailFrom: log.emailFrom,
      emailTo: log.emailTo,
      emailSubject: log.emailSubject,
      emailMessageId: log.emailMessageId,
      receivedAt: log.receivedAt,
      status: log.status,
      confidenceScore: log.confidenceScore,
      parsedData: log.parsedData ? (typeof log.parsedData === 'string' ? JSON.parse(log.parsedData) : log.parsedData) : null,
      parsingErrors: log.parsingErrors ? (typeof log.parsingErrors === 'string' ? JSON.parse(log.parsingErrors) : log.parsingErrors) : null,
      errorMessage: log.errorMessage,
      processedAt: log.processedAt,
      processingDurationMs: log.processingDurationMs,
      threadId: log.threadId,
      replyCount: log.replyCount,
      isAutoReply: log.isAutoReply,
    }));

    // Calculate stats
    const stats = {
      total: transformedLogs.length,
      pending: transformedLogs.filter(l => l.status === 'pending').length,
      parsed: transformedLogs.filter(l => l.status === 'parsed').length,
      processed: transformedLogs.filter(l => l.status === 'processed').length,
      failed: transformedLogs.filter(l => l.status === 'failed').length,
      retrying: transformedLogs.filter(l => l.status === 'retrying').length,
    };

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      stats: stats,
    });

  } catch (error) {
    console.error('Failed to fetch email logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}