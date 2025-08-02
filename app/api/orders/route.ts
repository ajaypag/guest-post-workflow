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
    const accountId = searchParams.get('accountId');

    let orders: any[] = [];
    
    if (session.userType === 'account') {
      // Accounts can only see their own orders
      // For account users, session.userId is their account ID
      const accountId = session.accountId || session.userId;
      orders = await OrderService.getAccountOrders(accountId);
    } else if (accountId && session.userType === 'internal') {
      // Internal users can filter by account
      orders = await OrderService.getAccountOrders(accountId);
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
      domains: domainIds, // Legacy support
      domainMappings, // New format with target page mappings
      accountId,
      accountEmail,
      accountName,
      accountCompany,
      includesClientReview,
      rushDelivery,
      internalNotes,
    } = data;

    // Extract domain IDs from either format
    let domainData: Array<{ bulkAnalysisDomainId: string; targetPageId?: string }> = [];
    
    if (domainMappings && Array.isArray(domainMappings)) {
      // New format with target page mappings
      domainData = domainMappings;
    } else if (domainIds && Array.isArray(domainIds)) {
      // Legacy format - just domain IDs
      domainData = domainIds.map(id => ({ bulkAnalysisDomainId: id }));
    }

    // Validate required fields
    if (!clientId || domainData.length === 0) {
      return NextResponse.json(
        { error: 'Client and at least one domain are required' },
        { status: 400 }
      );
    }

    if (!accountEmail || !accountName) {
      return NextResponse.json(
        { error: 'Account email and name are required' },
        { status: 400 }
      );
    }

    // Check permissions
    if (session.userType !== 'internal' && session.userType !== 'account') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract just the domain IDs for querying
    const domainIdsToQuery = domainData.map(d => d.bulkAnalysisDomainId);

    // Fetch selected domains
    const selectedDomains = await db.query.bulkAnalysisDomains.findMany({
      where: inArray(bulkAnalysisDomains.id, domainIdsToQuery),
    });

    if (selectedDomains.length === 0) {
      return NextResponse.json(
        { error: 'No valid domains found' },
        { status: 400 }
      );
    }

    // Create a map for quick lookup of target pages
    const domainTargetPageMap = new Map(
      domainData.map(d => [d.bulkAnalysisDomainId, d.targetPageId])
    );

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
      accountId: accountId || (session.userType === 'account' ? (session.accountId || session.userId) : null),
      accountEmail: accountEmail.toLowerCase(),
      accountName: accountName,
      accountCompany: accountCompany,
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
      createdBy: session.userType === 'account' ? '00000000-0000-0000-0000-000000000000' : session.userId,
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

      // Get the target page ID for this domain
      const targetPageId = domainTargetPageMap.get(domain.id) || null;

      await db.insert(orderItems).values({
        id: uuidv4(),
        orderId,
        domainId: domain.id,
        targetPageId, // Include target page mapping
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

    // Fetch the created order with items
    const createdOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
        account: true,
      },
    });

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