import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems, lineItemChanges, type NewOrderLineItem } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { accounts, clients, targetPages } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { PricingService } from '@/lib/services/pricingService';

// Service fee per link (in cents)
const SERVICE_FEE_CENTS = 7900; // $79.00

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { domainIds, accountId: requestAccountId, domainTargets } = data;

    // Validate domain IDs
    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    // Determine account ID
    let accountId: string;
    if (session.userType === 'account') {
      // Account users can only create orders for themselves
      accountId = session.accountId || session.userId;
    } else if (session.userType === 'internal') {
      // Internal users must specify an account
      if (!requestAccountId) {
        return NextResponse.json(
          { error: 'Account ID is required for internal users' },
          { status: 400 }
        );
      }
      accountId = requestAccountId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch selected domains with their data
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

    // Get unique client IDs from selected domains
    const clientIds = [...new Set(selectedDomains.map(d => d.clientId).filter(Boolean))];
    
    // For quick orders, we'll use the first client ID or require one to be specified
    let clientId = clientIds[0];
    
    if (!clientId) {
      // If no client ID is found, try to get from account
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
      });
      
      // For accounts, we'll need to determine the client differently
      // since accounts table doesn't have clientId directly
      if (account) {
        // Get the first client ID from the domains 
        clientId = clientIds[0];
      }
      
      if (!clientId) {
        return NextResponse.json(
          { error: 'Unable to determine client for order. Please ensure domains have an associated client.' },
          { status: 400 }
        );
      }
    }

    // Calculate pricing
    let subtotalRetail = 0;
    let subtotalWholesale = 0;
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
        // Use a default DR of 50 for now
        const dr = 50;
        wholesalePrice = dr >= 70 ? 52000 : dr >= 50 ? 42000 : dr >= 30 ? 32000 : 22000;
        retailPrice = wholesalePrice + SERVICE_FEE_CENTS;
      }
      
      domainPricing.set(domain.id, { wholesale: wholesalePrice, retail: retailPrice });
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

    // No optional services for now
    const totalWholesale = subtotalWholesale;
    const profitMargin = totalRetail - totalWholesale;

    // Create the order
    const orderId = uuidv4();
    const now = new Date();

    await db.insert(orders).values({
      id: orderId,
      accountId,
      status: 'draft',
      state: 'configuring',
      orderType: 'guest_post',
      subtotalRetail,
      discountPercent: discountPercent.toString(),
      discountAmount,
      totalRetail,
      totalWholesale,
      profitMargin,
      includesClientReview: false,
      clientReviewFee: 0,
      rushDelivery: false,
      rushFee: 0,
      createdBy: session.userType === 'account' ? '00000000-0000-0000-0000-000000000000' : session.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Create line items for each domain
    const batchId = uuidv4();
    let displayOrder = 0;

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

    for (const domain of selectedDomains) {
      const pricing = domainPricing.get(domain.id)!;
      const lineItemId = uuidv4();
      
      // Get target configuration for this domain
      const targetConfig = targetMap.get(domain.id);
      // Use proper fallback: explicit user selection → AI suggested target → vetted target URL → empty string
      const vettedTargetUrl = targetPagesMap[domain.id]?.[0]?.url || null;
      const targetUrl = targetConfig?.targetUrl || domain.suggestedTargetUrl || vettedTargetUrl || '';
      const anchorText = targetConfig?.anchorText || '';

      // Create line item
      const lineItemData: NewOrderLineItem = {
        orderId,
        clientId: clientId as string,
        addedBy: session.userId,
        status: 'draft' as const,
        estimatedPrice: pricing.retail,
        wholesalePrice: pricing.wholesale,
        displayOrder,
        assignedDomainId: domain.id as string,
        assignedDomain: domain.domain as string,
        targetPageUrl: targetUrl as string,
        anchorText: anchorText as string,
        metadata: {
          bulkAnalysisProjectId: domain.projectId || undefined,
          internalNotes: `Quick order from vetted sites`,
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
            source: 'vetted_sites_quick_order',
            actualUser: session.userType === 'account' ? session.userId : undefined,
            actualUserEmail: session.userType === 'account' ? session.email : undefined,
          },
          changedBy: changeLogUserId,
          changeReason: `Line item created from vetted sites quick order with pre-selected targets${session.userType === 'account' ? ` by ${session.email}` : ''}`,
          batchId,
        });
      } catch (changeLogError) {
        console.error('Failed to create change log entry:', changeLogError);
        // Continue without failing the main operation
      }

      displayOrder++;
    }

    // Fetch the created order with details
    const createdOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        account: true,
      },
    });
    
    // Fetch line items separately
    const createdLineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    return NextResponse.json({
      success: true,
      order: {
        ...createdOrder,
        lineItems: createdLineItems,
      },
      orderId,
      itemCount: selectedDomains.length,
      totalAmount: totalRetail,
    });

  } catch (error: any) {
    console.error('Error creating quick order:', error);
    return NextResponse.json(
      { error: 'Failed to create order', details: error.message },
      { status: 500 }
    );
  }
}