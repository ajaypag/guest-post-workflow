import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/orderSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check permissions
    if (session.userType !== 'internal' && session.userType !== 'advertiser') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    const orderId = uuidv4();
    const now = new Date();

    // Create the order
    await db.insert(orders).values({
      id: orderId,
      clientId,
      advertiserId: session.userType === 'advertiser' ? session.userId : null,
      advertiserEmail: advertiserEmail.toLowerCase(),
      advertiserName,
      advertiserCompany,
      status: 'draft',
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
      createdBy: session.userId,
      internalNotes: session.userType === 'internal' ? internalNotes : null,
      createdAt: now,
      updatedAt: now,
    });

    // Create order items
    for (const domain of selectedDomains) {
      // For now, use a default DR of 50 since bulk analysis domains don't have DR
      const dr = 50;
      const retailPrice = dr >= 70 ? 59900 : dr >= 50 ? 49900 : dr >= 30 ? 39900 : 29900;
      const wholesalePrice = Math.floor(retailPrice * 0.6);

      await db.insert(orderItems).values({
        id: uuidv4(),
        orderId,
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

    // Return the order ID without fetching relationships to avoid the error
    // We'll fix the relationship query later
    const createdOrder = {
      id: orderId,
      clientId,
      status: 'draft',
    };

    return NextResponse.json({
      success: true,
      order: createdOrder,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}