import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/orderSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the order first to check permissions
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canEdit = 
      session.userType === 'internal' ||
      (order.status === 'draft' && (
        order.createdBy === session.userId ||
        (session.userType === 'advertiser' && order.advertiserId === session.userId)
      ));

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this order' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      clientId,
      domains: domainIds,
      advertiserEmail,
      advertiserName,
      advertiserCompany,
      includesClientReview,
      rushDelivery,
      internalNotes,
    } = data;

    // Validate required fields
    if (!clientId || !domainIds || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'Client and at least one domain are required' },
        { status: 400 }
      );
    }

    if (!advertiserEmail || !advertiserName) {
      return NextResponse.json(
        { error: 'Advertiser email and name are required' },
        { status: 400 }
      );
    }

    // Fetch selected domains
    const selectedDomains = await db.query.bulkAnalysisDomains.findMany({
      where: inArray(bulkAnalysisDomains.id, domainIds),
    });

    if (selectedDomains.length === 0) {
      return NextResponse.json(
        { error: 'No valid domains found' },
        { status: 400 }
      );
    }

    // Calculate pricing
    let subtotalRetail = 0;
    let subtotalWholesale = 0;

    // Calculate base prices
    for (const domain of selectedDomains) {
      // For now, use a default DR of 50 since bulk analysis domains don't have DR
      const dr = 50;
      const retailPrice = dr >= 70 ? 59900 : dr >= 50 ? 49900 : dr >= 30 ? 39900 : 29900;
      const wholesalePrice = Math.floor(retailPrice * 0.6);
      
      subtotalRetail += retailPrice;
      subtotalWholesale += wholesalePrice;
    }

    // Apply volume discount
    let discountPercent = 0;
    if (selectedDomains.length >= 20) {
      discountPercent = 15;
    } else if (selectedDomains.length >= 10) {
      discountPercent = 10;
    } else if (selectedDomains.length >= 5) {
      discountPercent = 5;
    }

    const discountAmount = Math.floor(subtotalRetail * (discountPercent / 100));
    let totalRetail = subtotalRetail - discountAmount;

    // Add optional services
    const clientReviewFee = includesClientReview ? 5000 : 0;
    const rushFee = rushDelivery ? Math.floor(totalRetail * 0.25) : 0;

    totalRetail += clientReviewFee + rushFee;
    const totalWholesale = subtotalWholesale;
    const profitMargin = totalRetail - totalWholesale;

    const now = new Date();

    // Update the order
    await db.update(orders)
      .set({
        clientId,
        advertiserEmail: advertiserEmail.toLowerCase(),
        advertiserName,
        advertiserCompany,
        subtotalRetail,
        discountPercent: discountPercent.toString(),
        discountAmount,
        totalRetail,
        totalWholesale,
        profitMargin,
        includesClientReview: includesClientReview || false,
        clientReviewFee,
        rushDelivery: rushDelivery || false,
        rushFee,
        internalNotes: session.userType === 'internal' ? internalNotes : order.internalNotes,
        updatedAt: now,
      })
      .where(eq(orders.id, id));

    // Delete existing order items
    await db.delete(orderItems).where(eq(orderItems.orderId, id));

    // Create new order items
    for (const domain of selectedDomains) {
      // For now, use a default DR of 50 since bulk analysis domains don't have DR
      const dr = 50;
      const retailPrice = dr >= 70 ? 59900 : dr >= 50 ? 49900 : dr >= 30 ? 39900 : 29900;
      const wholesalePrice = Math.floor(retailPrice * 0.6);

      await db.insert(orderItems).values({
        id: uuidv4(),
        orderId: id,
        domainId: domain.id,
        domain: domain.domain,
        domainRating: dr,
        traffic: null,
        retailPrice,
        wholesalePrice,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Fetch the updated order with items
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
        client: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}