import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    // Validate token and get order
    const order = await OrderService.getOrderByShareToken(token);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Invalid or expired share token' },
        { status: 404 }
      );
    }

    // Check if token has expired
    if (order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Share token has expired' },
        { status: 404 }
      );
    }

    // Get order with items
    const fullOrder = await OrderService.getOrderById(order.id);
    if (!fullOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data for public view
    const publicOrder = {
      ...fullOrder,
      totalWholesale: undefined,
      profitMargin: undefined,
      internalNotes: undefined,
      items: fullOrder.items.map((item: any) => ({
        ...item,
        wholesalePrice: undefined,
      })),
    };

    // Track token usage
    await OrderService.trackShareTokenUsage(token);

    return NextResponse.json({ order: publicOrder });
  } catch (error) {
    console.error('Error validating share token:', error);
    return NextResponse.json(
      { error: 'Failed to validate share token' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    // This endpoint will handle approval
    const order = await OrderService.getOrderByShareToken(token);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Invalid or expired share token' },
        { status: 404 }
      );
    }

    if (order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Share token has expired' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Order is not pending approval' },
        { status: 400 }
      );
    }

    // Update order status to approved
    await OrderService.updateOrderStatus(
      order.id,
      'approved',
      order.accountId || 'system',
      'Approved via share link'
    );

    // Invalidate the share token after use
    await OrderService.invalidateShareToken(order.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving order:', error);
    return NextResponse.json(
      { error: 'Failed to approve order' },
      { status: 500 }
    );
  }
}