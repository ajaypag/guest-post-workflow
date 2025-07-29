import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthService } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = AuthService.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await OrderService.getOrderById(params.orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check access
    if (session.userType === 'advertiser' && order.advertiserId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Filter sensitive data for advertisers
    if (session.userType === 'advertiser') {
      // Remove wholesale pricing and internal notes
      delete order.totalWholesale;
      delete order.profitMargin;
      delete order.internalNotes;
      
      order.items.forEach(item => {
        delete item.wholesalePrice;
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = AuthService.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { action } = data;

    switch (action) {
      case 'updateStatus':
        await OrderService.updateOrderStatus(
          params.orderId,
          data.status,
          session.userId,
          data.notes
        );
        break;

      case 'generateShareToken':
        const token = await OrderService.generateShareToken(
          params.orderId,
          data.expiresInDays || 7
        );
        return NextResponse.json({ token });

      case 'createWorkflows':
        await OrderService.createWorkflowsForOrder(params.orderId, session.userId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedOrder = await OrderService.getOrderById(params.orderId);
    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}