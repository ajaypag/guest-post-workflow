import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { RefundCalculationService } from '@/lib/services/refundCalculationService';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only internal users can see refund calculations
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can access refund calculations' }, { status: 403 });
    }

    const { id: orderId } = await params;

    // Validate order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate suggested refund
    const calculation = await RefundCalculationService.calculateSuggestedRefund(orderId);

    // Get refund policy
    const orderAge = Date.now() - new Date(order.createdAt).getTime();
    const daysOld = Math.floor(orderAge / (1000 * 60 * 60 * 24));
    // const policy = RefundCalculationService.getRefundPolicy(order.orderType, daysOld);

    return NextResponse.json({
      orderId,
      orderTotal: order.totalRetail,
      paidAmount: order.state === 'payment_received' || order.state === 'in_progress' || order.state === 'completed' ? order.totalRetail : 0,
      calculation,
      // policy,
      orderAge: daysOld,
      canProcess: order.state === 'payment_received' || order.state === 'in_progress' || order.state === 'completed',
      message: calculation.completionPercentage === 100 
        ? 'Order is fully completed. Refund only if quality issues reported.'
        : `Suggested refund: $${(calculation.suggestedAmount / 100).toFixed(2)}`
    });

  } catch (error: any) {
    console.error('Error calculating refund:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate refund' },
      { status: 500 }
    );
  }
}