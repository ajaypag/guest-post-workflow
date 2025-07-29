import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthService } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = AuthService.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Support both single and bulk add
    const domainIds = Array.isArray(data.domainIds) 
      ? data.domainIds 
      : [data.domainId];

    const items = [];
    for (const domainId of domainIds) {
      try {
        const item = await OrderService.addOrderItem({
          orderId: params.orderId,
          domainId,
        });
        items.push(item);
      } catch (error) {
        console.error(`Failed to add domain ${domainId}:`, error);
        // Continue with other domains
      }
    }

    // Get updated order
    const order = await OrderService.getOrderById(params.orderId);

    return NextResponse.json({ 
      items,
      order,
      added: items.length,
      failed: domainIds.length - items.length,
    });
  } catch (error) {
    console.error('Error adding order items:', error);
    return NextResponse.json(
      { error: 'Failed to add order items' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = AuthService.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required' },
        { status: 400 }
      );
    }

    await OrderService.removeOrderItem(params.orderId, itemId);

    // Get updated order
    const order = await OrderService.getOrderById(params.orderId);

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error removing order item:', error);
    return NextResponse.json(
      { error: 'Failed to remove order item' },
      { status: 500 }
    );
  }
}