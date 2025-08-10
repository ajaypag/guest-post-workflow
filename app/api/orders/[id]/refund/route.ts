import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { RefundService } from '@/lib/services/refundService';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only internal users can process refunds
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can process refunds' }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { amount, reason, notes } = body;

    // Validate order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Process refund
    const result = await RefundService.processRefund({
      orderId,
      amount,
      reason,
      notes,
      initiatedBy: session.userId
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to process refund' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      stripeRefundId: result.stripeRefundId,
      amount: result.amount,
      status: result.status,
      message: `Refund of $${(result.amount! / 100).toFixed(2)} processed successfully`
    });

  } catch (error: any) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Validate order access
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account' && order.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get refund history
    const refunds = await RefundService.getRefundHistory(orderId);

    return NextResponse.json({
      refunds,
      totalRefunded: refunds.reduce((sum, r) => sum + r.amount, 0)
    });

  } catch (error: any) {
    console.error('Error fetching refund history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch refund history' },
      { status: 500 }
    );
  }
}