import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/orderSchema';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { shouldUseLineItemsForNewOrders } from '@/lib/config/featureFlags';
import { PricingService } from '@/lib/services/pricingService';

// Service fee per link (in cents)
const SERVICE_FEE_CENTS = 7900; // $79.00

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const accountId = searchParams.get('accountId');
    const clientId = searchParams.get('clientId');
    const projectId = searchParams.get('projectId');

    let orders: any[] = [];
    
    // Special handling for project-associated orders
    if (projectId && session.userType === 'internal') {
      const result = await OrderService.getOrdersForProject(projectId);
      return NextResponse.json({ 
        orders: result.draftOrders,
        associatedOrders: result.associatedOrders,
        defaultOrderId: result.defaultOrderId 
      });
    }
    
    if (session.userType === 'account') {
      // Accounts can only see their own orders
      // For account users, session.userId is their account ID
      const accountId = session.accountId || session.userId;
      orders = await OrderService.getAccountOrders(accountId);
    } else if (accountId && session.userType === 'internal') {
      // Internal users can filter by account
      orders = await OrderService.getAccountOrders(accountId);
    } else if (clientId && status && session.userType === 'internal') {
      // Internal users can filter by client and status
      orders = await OrderService.getClientOrdersByStatus(clientId, status);
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
    
    // Check if this is a simple draft order creation (new flow)
    if (data.status === 'draft' && !data.clientId && !data.domains && !data.domainMappings) {
      // Simple draft order creation
      const orderId = uuidv4();
      const now = new Date();
      
      // Prepare order values based on user type
      let orderValues: any = {
        id: orderId,
        status: 'draft',
        state: data.state || 'configuring',
        orderType: data.orderType || 'guest_post',
        subtotalRetail: 0,
        discountPercent: '0',
        discountAmount: 0,
        totalRetail: 0,
        totalWholesale: 0,
        profitMargin: 0,
        includesClientReview: false,
        clientReviewFee: 0,
        rushDelivery: false,
        rushFee: 0,
        expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
        createdAt: now,
        updatedAt: now,
      };
      
      // Set account info and createdBy based on user type
      if (session.userType === 'account') {
        // Account users creating their own orders
        orderValues.accountId = session.accountId || session.userId;
        orderValues.createdBy = '00000000-0000-0000-0000-000000000000'; // System user ID
      } else if (session.userType === 'internal') {
        // Internal users creating orders - they'll need to select account later
        orderValues.createdBy = session.userId;
        orderValues.accountId = data.accountId || null;
      }
      
      // Create the order
      await db.insert(orders).values(orderValues);
      
      return NextResponse.json({
        success: true,
        orderId: orderId,
        order: orderValues
      });
    }
    
    // Original bulk analysis order creation logic
    const {
      clientId,
      domains: domainIds, // Legacy support
      domainMappings, // New format with target page mappings
      accountId,
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

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
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

    // Calculate base prices using actual website data
    for (const domain of selectedDomains) {
      // Get actual pricing from website table
      const priceInfo = await PricingService.getDomainPrice(domain.domain);
      
      let wholesalePrice = 0;
      let retailPrice = 0;
      
      if (priceInfo.found && priceInfo.wholesalePrice > 0) {
        // PricingService now correctly returns wholesale as publisher cost
        // and retail as wholesale + $79
        wholesalePrice = Math.floor(priceInfo.wholesalePrice * 100); // Convert to cents
        retailPrice = Math.floor(priceInfo.retailPrice * 100); // Convert to cents
      } else {
        // Fallback for domains not in website table
        const dr = 50;
        // Set wholesale based on DR tier
        wholesalePrice = dr >= 70 ? 52000 : dr >= 50 ? 42000 : dr >= 30 ? 32000 : 22000;
        retailPrice = wholesalePrice + 7900; // Add $79 service fee
      }
      
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
      expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      createdBy: session.userType === 'account' ? '00000000-0000-0000-0000-000000000000' : session.userId,
      internalNotes: session.userType === 'internal' ? internalNotes : null,
      createdAt: now,
      updatedAt: now,
    });

    // Check if we should use line items instead of orderItems
    if (shouldUseLineItemsForNewOrders()) {
      // Create line items (new system)
      let displayOrder = 0;
      const batchId = uuidv4();
      
      for (const domain of selectedDomains) {
        // Get actual pricing from website table
        const priceInfo = await PricingService.getDomainPrice(domain.domain);
        
        let wholesalePrice = 0;
        let retailPrice = 0;
        
        if (priceInfo.found && priceInfo.wholesalePrice > 0) {
          // PricingService now correctly returns wholesale as publisher cost
          // and retail as wholesale + $79
          wholesalePrice = Math.floor(priceInfo.wholesalePrice * 100); // Convert to cents
          retailPrice = Math.floor(priceInfo.retailPrice * 100); // Convert to cents
        } else {
          // Fallback for domains not in website table
          const dr = 50;
          // Set wholesale based on DR tier
          wholesalePrice = dr >= 70 ? 52000 : dr >= 50 ? 42000 : dr >= 30 ? 32000 : 22000;
          retailPrice = wholesalePrice + 7900; // Add $79 service fee
        }
        
        const targetPageId = domainTargetPageMap.get(domain.id) || null;
        const lineItemId = uuidv4();
        
        // Create line item with both wholesale and retail prices
        const lineItemData = {
          orderId,
          clientId,
          addedBy: session.userId,
          status: 'draft' as const,
          estimatedPrice: retailPrice,
          wholesalePrice: wholesalePrice,
          displayOrder: displayOrder,
          ...(targetPageId ? { targetPageId } : {}),
          ...(domain.id ? { assignedDomainId: domain.id } : {}),
          ...(domain.domain ? { assignedDomain: domain.domain } : {})
        };
        
        await db.insert(orderLineItems).values(lineItemData);
        displayOrder++;

        // Create change log entry
        await db.insert(lineItemChanges).values({
          lineItemId,
          orderId,
          changeType: 'created',
          newValue: {
            domain: domain.domain,
            estimatedPrice: retailPrice,
            source: 'order_creation'
          },
          changedBy: session.userId,
          changeReason: 'Line item created during order creation',
          batchId
        });
      }
      
      // Skip orderItems creation - we're using line items instead
    } else {
      // Create order items (legacy system)
      for (const domain of selectedDomains) {
      // For now, use a default DR of 50 since bulk analysis domains don't have DR
      const dr = 50;
      // Set wholesale based on DR tier
      const wholesalePrice = dr >= 70 ? 52000 : dr >= 50 ? 42000 : dr >= 30 ? 32000 : 22000;
      const retailPrice = wholesalePrice + 7900; // Add $79 service fee

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
    } // End of else block for legacy orderItems

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