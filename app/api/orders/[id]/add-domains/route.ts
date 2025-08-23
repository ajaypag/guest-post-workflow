import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, inArray, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { PricingService } from '@/lib/services/pricingService';

// Service fee per link (in cents)
const SERVICE_FEE_CENTS = 7900; // $79.00

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const data = await request.json();
    const { domainIds } = data;

    // Validate input
    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    // Fetch the order and validate it exists and can be modified
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        account: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate order can be modified
    if (!['draft', 'pending'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Order cannot be modified in its current status' },
        { status: 400 }
      );
    }

    // Check permissions
    if (session.userType === 'account') {
      const accountId = session.accountId || session.userId;
      if (existingOrder.accountId !== accountId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    // Internal users can modify any order

    // Fetch selected domains
    const selectedDomains = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        clientId: bulkAnalysisDomains.clientId,
        projectId: bulkAnalysisDomains.projectId,
        suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
        targetMatchData: bulkAnalysisDomains.targetMatchData,
      })
      .from(bulkAnalysisDomains)
      .where(inArray(bulkAnalysisDomains.id, domainIds));

    if (selectedDomains.length === 0) {
      return NextResponse.json(
        { error: 'No valid domains found' },
        { status: 400 }
      );
    }

    // Validate client compatibility
    // Get existing line items to check client consistency
    const existingLineItems = await db
      .select({
        clientId: orderLineItems.clientId,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    if (existingLineItems.length > 0) {
      const existingClientIds = [...new Set(existingLineItems.map(li => li.clientId))];
      const newClientIds = [...new Set(selectedDomains.map(d => d.clientId).filter(Boolean))];
      
      // Check if new domains have compatible clients
      const hasIncompatibleClients = newClientIds.some(newClientId => 
        !existingClientIds.includes(newClientId)
      );
      
      if (hasIncompatibleClients) {
        return NextResponse.json(
          { error: 'Cannot add domains from different clients to this order' },
          { status: 400 }
        );
      }
    }

    // Get the next display order
    const maxDisplayOrderResult = await db
      .select({
        maxOrder: count()
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));
    
    let nextDisplayOrder = maxDisplayOrderResult[0]?.maxOrder || 0;

    // Calculate pricing for new domains
    let additionalRetail = 0;
    let additionalWholesale = 0;
    const domainPricing: Map<string, { wholesale: number; retail: number }> = new Map();

    for (const domain of selectedDomains) {
      // Get actual pricing from website table
      const priceInfo = await PricingService.getDomainPrice(domain.domain);
      
      let wholesalePrice = 0;
      let retailPrice = 0;
      
      if (priceInfo.found && priceInfo.wholesalePrice > 0) {
        // PricingService returns prices in dollars, convert to cents
        wholesalePrice = Math.floor(priceInfo.wholesalePrice * 100);
        retailPrice = Math.floor(priceInfo.retailPrice * 100);
      } else {
        // Fallback for domains not in website table
        const dr = 50;
        wholesalePrice = dr >= 70 ? 52000 : dr >= 50 ? 42000 : dr >= 30 ? 32000 : 22000;
        retailPrice = wholesalePrice + SERVICE_FEE_CENTS;
      }
      
      domainPricing.set(domain.id, { wholesale: wholesalePrice, retail: retailPrice });
      additionalRetail += retailPrice;
      additionalWholesale += wholesalePrice;
    }

    // Get total item count after adding new domains
    const currentItemCount = await db
      .select({
        count: count()
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    const totalItemCount = (currentItemCount[0]?.count || 0) + selectedDomains.length;

    // Recalculate volume discount based on new total
    let newDiscountPercent = 0;
    if (totalItemCount >= 20) {
      newDiscountPercent = 15;
    } else if (totalItemCount >= 10) {
      newDiscountPercent = 10;
    } else if (totalItemCount >= 5) {
      newDiscountPercent = 5;
    }

    // Calculate new order totals
    const newSubtotalRetail = existingOrder.subtotalRetail + additionalRetail;
    const newSubtotalWholesale = existingOrder.totalWholesale + additionalWholesale;
    
    const newDiscountAmount = Math.floor(newSubtotalRetail * (newDiscountPercent / 100));
    let newTotalRetail = newSubtotalRetail - newDiscountAmount;
    
    // Add existing optional services
    newTotalRetail += (existingOrder.clientReviewFee || 0) + (existingOrder.rushFee || 0);
    
    const newProfitMargin = newTotalRetail - newSubtotalWholesale;

    // Start transaction
    const now = new Date();
    const batchId = uuidv4();

    // Add new line items
    for (const domain of selectedDomains) {
      const pricing = domainPricing.get(domain.id)!;
      const lineItemId = uuidv4();

      // Create line item
      const [createdLineItem] = await db.insert(orderLineItems).values({
        orderId,
        clientId: domain.clientId || existingLineItems[0]?.clientId || '',
        addedBy: session.userId,
        status: 'draft' as const,
        estimatedPrice: pricing.retail,
        wholesalePrice: pricing.wholesale,
        displayOrder: nextDisplayOrder,
        assignedDomainId: domain.id,
        assignedDomain: domain.domain,
        targetPageUrl: domain.suggestedTargetUrl,
        metadata: {
          bulkAnalysisProjectId: domain.projectId,
          targetMatchData: domain.targetMatchData,
          internalNotes: `Added from vetted sites to existing order`,
        },
      }).returning();

      // Create change log entry
      await db.insert(lineItemChanges).values({
        lineItemId: createdLineItem.id,
        orderId,
        changeType: 'created',
        newValue: {
          domain: domain.domain,
          estimatedPrice: pricing.retail,
          wholesalePrice: pricing.wholesale,
          source: 'vetted_sites_add_to_order',
        },
        changedBy: session.userId,
        changeReason: 'Domain added to existing order from vetted sites',
        batchId,
      });

      nextDisplayOrder++;
    }

    // Update order totals
    await db.update(orders)
      .set({
        subtotalRetail: newSubtotalRetail,
        totalRetail: newTotalRetail,
        totalWholesale: newSubtotalWholesale,
        profitMargin: newProfitMargin,
        discountPercent: newDiscountPercent.toString(),
        discountAmount: newDiscountAmount,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    // Fetch updated order with line items
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        account: true,
      },
    });

    const updatedLineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    return NextResponse.json({
      success: true,
      order: {
        ...updatedOrder,
        lineItems: updatedLineItems,
      },
      addedCount: selectedDomains.length,
      totalItems: totalItemCount,
      updatedTotals: {
        subtotalRetail: newSubtotalRetail,
        totalRetail: newTotalRetail,
        discountPercent: newDiscountPercent,
        discountAmount: newDiscountAmount,
      },
    });

  } catch (error: any) {
    console.error('Error adding domains to order:', error);
    return NextResponse.json(
      { error: 'Failed to add domains to order', details: error.message },
      { status: 500 }
    );
  }
}