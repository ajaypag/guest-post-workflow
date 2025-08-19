import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { emailReviewQueue, emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
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
    
    // Get request body for optional rejection reason
    const body = await request.json().catch(() => ({}));
    const rejectionReason = body.reason || 'Rejected by admin';

    // Get queue item
    const [queueItem] = await db
      .select()
      .from(emailReviewQueue)
      .where(eq(emailReviewQueue.id, queueItemId))
      .limit(1);

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    if (queueItem.status !== 'pending') {
      return NextResponse.json(
        { error: 'Item already processed' },
        { status: 400 }
      );
    }

    // Update queue status
    await db.update(emailReviewQueue)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: session.userId,
        reviewNotes: rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(emailReviewQueue.id, queueItemId));

    // Update email log status
    await db.update(emailProcessingLogs)
      .set({
        status: 'rejected',
        errorMessage: rejectionReason,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailProcessingLogs.id, queueItem.logId));

    return NextResponse.json({
      success: true,
      message: 'Queue item rejected',
    });

  } catch (error) {
    console.error('Failed to reject queue item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}