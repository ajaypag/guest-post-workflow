import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { lt, gt, and, isNotNull } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

// POST - Cleanup expired share tokens (internal users only)
export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can cleanup expired shares' }, { status: 403 });
    }

    // Find and clear expired share tokens
    const now = new Date();
    const expiredOrders = await db.update(orders)
      .set({
        shareToken: null,
        shareExpiresAt: null,
        updatedAt: now
      })
      .where(
        and(
          isNotNull(orders.shareToken),
          lt(orders.shareExpiresAt, now)
        )
      )
      .returning({ id: orders.id });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${expiredOrders.length} expired share tokens`,
      cleanedOrders: expiredOrders.length
    });

  } catch (error: any) {
    console.error('Error cleaning up expired shares:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup expired shares' },
      { status: 500 }
    );
  }
}

// GET - Check how many expired tokens exist (internal users only)
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can view expired shares' }, { status: 403 });
    }

    // Count expired share tokens
    const now = new Date();
    const expiredOrders = await db.select({ id: orders.id })
      .from(orders)
      .where(
        and(
          isNotNull(orders.shareToken),
          lt(orders.shareExpiresAt, now)
        )
      );

    // Count active share tokens
    const activeOrders = await db.select({ id: orders.id })
      .from(orders)
      .where(
        and(
          isNotNull(orders.shareToken),
          gt(orders.shareExpiresAt, now)
        )
      );

    return NextResponse.json({
      success: true,
      expiredTokens: expiredOrders.length,
      activeTokens: activeOrders.length,
      totalTokens: expiredOrders.length + activeOrders.length
    });

  } catch (error: any) {
    console.error('Error checking expired shares:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check expired shares' },
      { status: 500 }
    );
  }
}