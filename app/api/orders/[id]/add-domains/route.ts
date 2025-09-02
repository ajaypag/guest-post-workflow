import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems, lineItemChanges, type NewOrderLineItem } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { targetPages } from '@/lib/db/schema';
import { eq, inArray, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { PricingService } from '@/lib/services/pricingService';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15
    const awaitedParams = await params;
    const orderId = awaitedParams.id;
    const data = await request.json();
    const { domainIds, domainTargets } = data;

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

    // Validate order can be modified - same as edit functionality
    // Orders are editable until payment is ACTUALLY received (not just invoiced)
    const editableStatuses = [
      'draft',                  // Creating order
      'pending_confirmation',   // Submitted but not confirmed
      'confirmed',             // Internal confirmed, analyzing
      'sites_ready',           // Sites selected for review
      'client_reviewing',      // Client reviewing sites
      'client_approved',       // Client approved sites
      'invoiced'               // Invoice sent but not paid - user can still edit
    ];
    
    if (!editableStatuses.includes(existingOrder.status)) {
      return NextResponse.json(
        { error: `Order cannot be modified in status: ${existingOrder.status}` },
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
        targetPageIds: bulkAnalysisDomains.targetPageIds,
      })
      .from(bulkAnalysisDomains)
      .where(inArray(bulkAnalysisDomains.id, domainIds));

    if (selectedDomains.length === 0) {
      return NextResponse.json(
        { error: 'No valid domains found' },
        { status: 400 }
      );
    }

    // Fetch target pages for domains that have targetPageIds (to get vetted URLs)
    const domainsWithTargetPageIds = selectedDomains.filter(domain => 
      domain?.targetPageIds && Array.isArray(domain.targetPageIds) && domain.targetPageIds.length > 0
    );

    let targetPagesMap: Record<string, any[]> = {};
    
    if (domainsWithTargetPageIds.length > 0) {
      try {
        // Get all unique target page IDs
        const allTargetPageIds = Array.from(new Set(
          domainsWithTargetPageIds.flatMap(domain => domain.targetPageIds as string[])
        ));

        if (allTargetPageIds.length > 0) {
          // Fetch target pages
          const targetPagesResults = await db
            .select()
            .from(targetPages)
            .where(inArray(targetPages.id, allTargetPageIds));

          // Build lookup map for target pages
          const targetPagesLookup = new Map(
            targetPagesResults.map(page => [page.id, page])
          );

          // Build target pages map by domain ID
          domainsWithTargetPageIds.forEach(domain => {
            if (domain.targetPageIds) {
              targetPagesMap[domain.id] = (domain.targetPageIds as string[])
                .map(id => targetPagesLookup.get(id))
                .filter(Boolean); // Remove any null/undefined entries
            }
          });
        }
      } catch (targetPagesError) {
        console.error('Error fetching target pages:', targetPagesError);
        // Continue without failing - target pages are optional for fallback
      }
    }

    // Validate client compatibility
    // Get existing line items to check client consistency
    const existingLineItems = await db
      .select({
        clientId: orderLineItems.clientId,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    console.log('[AddDomains] Order status:', existingOrder.status);
    console.log('[AddDomains] Existing line items count:', existingLineItems.length);

    // For orders that can have multiple clients, skip the client compatibility check
    // This allows adding domains from any client within the same account
    const allowMultipleClients = session.userType === 'internal' || session.userType === 'account';
    
    if (existingLineItems.length > 0 && !allowMultipleClients) {
      const existingClientIds = [...new Set(existingLineItems.map(li => li.clientId))];
      const newClientIds = [...new Set(selectedDomains.map(d => d.clientId).filter(Boolean))];
      
      console.log('[AddDomains] Existing client IDs:', existingClientIds);
      console.log('[AddDomains] New client IDs:', newClientIds);
      
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
    const domainAttribution: Map<string, { 
      publisherId?: string; 
      offeringId?: string;
      pricingStrategy?: string;
      attributionSource?: string;
      attributionError?: string;
    }> = new Map();

    for (const domain of selectedDomains) {
      // Get actual pricing from website table with publisher attribution
      const priceInfo = await PricingService.getDomainPrice(domain.domain);
      
      // Log attribution for debugging
      if (priceInfo.selectedPublisherId) {
        console.log(`[AddDomains] Publisher attribution for ${domain.domain}:`, {
          publisherId: priceInfo.selectedPublisherId,
          offeringId: priceInfo.selectedOfferingId,
          publisherName: priceInfo.selectedPublisherName,
          strategy: priceInfo.pricingStrategy,
          source: priceInfo.attributionSource
        });
      } else if (priceInfo.found) {
        console.warn(`[AddDomains] No publisher attribution for ${domain.domain}:`, {
          error: priceInfo.attributionError,
          source: priceInfo.attributionSource
        });
      }
      
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
      
      // Store publisher attribution
      domainAttribution.set(domain.id, {
        publisherId: priceInfo.selectedPublisherId,
        offeringId: priceInfo.selectedOfferingId,
        pricingStrategy: priceInfo.pricingStrategy,
        attributionSource: priceInfo.attributionSource,
        attributionError: priceInfo.attributionError
      });
      
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

    // Create a map of domain targets for easy lookup
    const targetMap = new Map<string, { targetUrl: string; anchorText: string }>();
    if (domainTargets && Array.isArray(domainTargets)) {
      domainTargets.forEach((target: any) => {
        targetMap.set(target.domainId, {
          targetUrl: target.targetUrl || '',
          anchorText: target.anchorText || ''
        });
      });
    }

    // Add new line items
    for (const domain of selectedDomains) {
      const pricing = domainPricing.get(domain.id)!;
      const attribution = domainAttribution.get(domain.id);
      const lineItemId = uuidv4();
      
      // Get target configuration for this domain
      const targetConfig = targetMap.get(domain.id);
      // Use proper fallback: explicit user selection → AI suggested target → vetted target URL → empty string
      const vettedTargetUrl = targetPagesMap[domain.id]?.[0]?.url || null;
      const targetUrl = targetConfig?.targetUrl || domain.suggestedTargetUrl || vettedTargetUrl || '';
      const anchorText = targetConfig?.anchorText || '';

      // Create line item with publisher attribution
      const lineItemData: NewOrderLineItem = {
        orderId,
        clientId: (domain.clientId || existingLineItems[0]?.clientId || existingOrder.accountId) as string,
        addedBy: session.userId,
        status: 'draft' as const,
        estimatedPrice: pricing.retail,
        wholesalePrice: pricing.wholesale,
        // Publisher attribution fields
        publisherId: attribution?.publisherId || null,
        publisherOfferingId: attribution?.offeringId || null,
        publisherPrice: pricing.wholesale, // Lock in the publisher price
        displayOrder: nextDisplayOrder,
        assignedDomainId: domain.id as string,
        assignedDomain: domain.domain as string,
        targetPageUrl: targetUrl as string,
        anchorText: anchorText as string,
        metadata: {
          bulkAnalysisProjectId: domain.projectId || undefined,
          internalNotes: `Added from vetted sites to existing order`,
          pricingStrategy: attribution?.pricingStrategy,
          attributionSource: attribution?.attributionSource,
          attributionError: attribution?.attributionError,
        },
      };

      const [createdLineItem] = await db.insert(orderLineItems).values(lineItemData).returning();

      // Create change log entry
      try {
        // For account users, use system user ID for change log
        // For internal users, use their actual user ID
        let changeLogUserId = session.userId;
        
        if (session.userType === 'account') {
          // Use system user for account actions
          changeLogUserId = '00000000-0000-0000-0000-000000000000'; // System User ID
        }

        await db.insert(lineItemChanges).values({
          lineItemId: createdLineItem.id,
          orderId,
          changeType: 'created',
          newValue: {
            domain: domain.domain,
            estimatedPrice: pricing.retail,
            wholesalePrice: pricing.wholesale,
            targetPageUrl: targetUrl,
            anchorText: anchorText,
            source: 'vetted_sites_add_to_order',
            actualUser: session.userType === 'account' ? session.userId : undefined,
            actualUserEmail: session.userType === 'account' ? session.email : undefined,
          },
          changedBy: changeLogUserId,
          changeReason: `Domain added to existing order from vetted sites with pre-selected targets${session.userType === 'account' ? ` by ${session.email}` : ''}`,
          batchId,
        });
      } catch (changeLogError) {
        console.error('Failed to create change log entry:', changeLogError);
        // Continue without failing the main operation
      }

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