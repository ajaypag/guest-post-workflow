import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Generate share link with optional video and message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shareToken, videoUrl, customMessage, expirationDays = 30 } = await request.json();

    if (!shareToken) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Update order with share token and proposal fields
    const [updatedOrder] = await db
      .update(orders)
      .set({
        shareToken,
        shareExpiresAt: expiresAt,
        proposalVideoUrl: videoUrl || null,
        proposalMessage: customMessage || null,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate the full share URL
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/orders/claim/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken,
      expiresAt,
      hasVideo: !!videoUrl,
      hasMessage: !!customMessage
    });

  } catch (error: any) {
    console.error('Error generating share link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate share link' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove share token and proposal fields
    const [updatedOrder] = await db
      .update(orders)
      .set({
        shareToken: null,
        shareExpiresAt: null,
        proposalVideoUrl: null,
        proposalMessage: null,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully'
    });

  } catch (error: any) {
    console.error('Error revoking share link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}