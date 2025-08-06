import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { randomBytes } from 'crypto';

// POST - Generate or regenerate share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can generate share links' }, { status: 403 });
    }

    const { id: orderId } = await params;
    const { expiresInDays = 7 } = await request.json().catch(() => ({}));

    // Verify order exists
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate cryptographically secure share token
    // 32 bytes = 256 bits of entropy, URL-safe base64 encoded
    const shareToken = randomBytes(32).toString('base64url');
    const shareExpiresAt = new Date();
    shareExpiresAt.setDate(shareExpiresAt.getDate() + expiresInDays);

    // Update order with share token
    const [updatedOrder] = await db.update(orders)
      .set({
        shareToken,
        shareExpiresAt,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    // Build the share URL
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/orders/claim/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken,
      expiresAt: shareExpiresAt.toISOString(),
      message: `Share link generated. Valid for ${expiresInDays} days.`
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can revoke share links' }, { status: 403 });
    }

    const { id: orderId } = await params;

    // Remove share token
    const [updatedOrder] = await db.update(orders)
      .set({
        shareToken: null,
        shareExpiresAt: null,
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