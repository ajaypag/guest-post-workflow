import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { emailReviewQueue, emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { eq, desc, or, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch review queue items with related email logs
    const queueItems = await db
      .select({
        queue: emailReviewQueue,
        emailLog: emailProcessingLogs,
      })
      .from(emailReviewQueue)
      .leftJoin(emailProcessingLogs, eq(emailProcessingLogs.id, emailReviewQueue.logId))
      .orderBy(desc(emailReviewQueue.priority), desc(emailReviewQueue.createdAt));

    // Transform the data
    const items = queueItems.map(item => ({
      id: item.queue.id,
      logId: item.queue.logId,
      priority: item.queue.priority,
      status: item.queue.status,
      queueReason: item.queue.queueReason,
      suggestedActions: item.queue.suggestedActions ? JSON.parse(item.queue.suggestedActions) : null,
      missingFields: item.queue.missingFields ? JSON.parse(item.queue.missingFields) : null,
      autoApproveAt: item.queue.autoApproveAt,
      reviewedAt: item.queue.reviewedAt,
      reviewedBy: item.queue.reviewedBy,
      reviewNotes: item.queue.reviewNotes,
      createdAt: item.queue.createdAt,
      emailLog: item.emailLog ? {
        id: item.emailLog.id,
        emailFrom: item.emailLog.emailFrom,
        emailSubject: item.emailLog.emailSubject,
        receivedAt: item.emailLog.receivedAt,
        status: item.emailLog.status,
        confidenceScore: item.emailLog.confidenceScore,
        parsedData: item.emailLog.parsedData ? JSON.parse(item.emailLog.parsedData) : null,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      items: items,
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      approved: items.filter(i => i.status === 'approved').length,
      rejected: items.filter(i => i.status === 'rejected').length,
    });

  } catch (error) {
    console.error('Failed to fetch review queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}