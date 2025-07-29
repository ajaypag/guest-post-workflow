import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const advertiserId = searchParams.get('advertiserId');

    let orders: any[] = [];
    
    if (session.userType === 'advertiser') {
      // Advertisers can only see their own orders
      orders = await OrderService.getAdvertiserOrders(session.userId);
    } else if (advertiserId && session.userType === 'internal') {
      // Internal users can filter by advertiser
      orders = await OrderService.getAdvertiserOrders(advertiserId);
    } else if (status && session.userType === 'internal') {
      // Internal users can filter by status
      orders = await OrderService.getOrdersByStatus(status);
    } else if (session.userType === 'internal') {
      // Internal users see all orders with item counts
      orders = await OrderService.getOrdersWithItemCounts();
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.clientId || !data.advertiserEmail || !data.advertiserName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = await OrderService.createOrder({
      ...data,
      createdBy: session.userId,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}