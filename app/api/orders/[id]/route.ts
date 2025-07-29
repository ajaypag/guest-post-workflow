import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await OrderService.getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'advertiser') {
      // Advertisers can only see their own orders
      if (order.advertiserId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Filter sensitive data for advertisers
      const filteredOrder = { ...order };
      delete (filteredOrder as any).totalWholesale;
      delete (filteredOrder as any).profitMargin;
      delete (filteredOrder as any).internalNotes;
      
      filteredOrder.items = filteredOrder.items.map((item: any) => {
        const filteredItem = { ...item };
        delete filteredItem.wholesalePrice;
        return filteredItem;
      });
      
      return NextResponse.json({ order: filteredOrder });
    }

    // Internal users can see all orders
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { action } = data;

    switch (action) {
      case 'updateStatus':
        await OrderService.updateOrderStatus(
          id,
          data.status,
          session.userId,
          data.notes
        );
        break;

      case 'generateShareToken':
        const token = await OrderService.generateShareToken(
          id,
          data.expiresInDays || 7
        );
        return NextResponse.json({ token });

      case 'createWorkflows':
        await OrderService.createWorkflowsForOrder(id, session.userId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedOrder = await OrderService.getOrderById(id);
    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}