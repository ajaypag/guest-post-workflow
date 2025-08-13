import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

// POST - Add video URL to an existing share token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoUrl, message } = await request.json();

    // Update order with video URL and optional message
    const [updatedOrder] = await db
      .update(orders)
      .set({
        proposalVideoUrl: videoUrl || null,
        proposalMessage: message || null,
        updatedAt: new Date()
      })
      .where(eq(orders.shareToken, token))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Share token not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: videoUrl ? 'Video added to proposal' : 'Video removed from proposal'
    });

  } catch (error: any) {
    console.error('Error updating share token video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update video' },
      { status: 500 }
    );
  }
}