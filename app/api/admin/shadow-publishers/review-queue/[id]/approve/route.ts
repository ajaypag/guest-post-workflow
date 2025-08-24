import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { emailReviewQueue, emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { ShadowPublisherService } from '@/lib/services/shadowPublisherService';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: queueItemId } = await params;

    // Get queue item with email log
    const [queueItem] = await db
      .select({
        queue: emailReviewQueue,
        emailLog: emailProcessingLogs,
      })
      .from(emailReviewQueue)
      .leftJoin(emailProcessingLogs, eq(emailProcessingLogs.id, emailReviewQueue.logId))
      .where(eq(emailReviewQueue.id, queueItemId))
      .limit(1);

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    if (queueItem.queue.status !== 'pending') {
      return NextResponse.json(
        { error: 'Item already processed' },
        { status: 400 }
      );
    }

    // Update queue status
    await db.update(emailReviewQueue)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(emailReviewQueue.id, queueItemId));

    // Process the publisher if we have parsed data
    if (queueItem.emailLog && queueItem.emailLog.parsedData) {
      const shadowPublisher = new ShadowPublisherService();
      const parsedData = JSON.parse(queueItem.emailLog.parsedData);
      
      await shadowPublisher.processPublisherFromEmail(
        queueItem.queue.logId,
        parsedData,
        queueItem.emailLog.campaignType as 'outreach' | 'follow_up' | 'bulk'
      );

      // Update email log status
      await db.update(emailProcessingLogs)
        .set({
          status: 'processed',
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(emailProcessingLogs.id, queueItem.queue.logId));
    }

    return NextResponse.json({
      success: true,
      message: 'Queue item approved and processed',
    });

  } catch (error) {
    console.error('Failed to approve queue item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}