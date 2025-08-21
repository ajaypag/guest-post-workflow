import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';
import { EnhancedOrderPricingService } from '@/lib/services/enhancedOrderPricingService';

/**
 * Assign domains from bulk analysis to line items
 * This endpoint handles the connection between bulk analysis and order line items
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account' && order.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract assignments and projectId from request
    const { assignments, projectId } = body;
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ 
        error: 'No domain assignments provided' 
      }, { status: 400 });
    }

    // Validate that all line items exist, are unassigned, and not cancelled
    const lineItemIds = assignments.map(a => a.lineItemId);
    const allLineItems = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, orderId),
        inArray(orderLineItems.id, lineItemIds),
        isNull(orderLineItems.assignedDomainId) // Only unassigned items
      )
    });
    
    // Filter out cancelled and refunded items
    const lineItems = allLineItems.filter(item => 
      !['cancelled', 'refunded'].includes(item.status)
    );

    if (lineItems.length !== assignments.length) {
      return NextResponse.json({ 
        error: 'Some line items are invalid or already assigned' 
      }, { status: 400 });
    }

    // Validate that all domains exist
    const domainIds = assignments.map(a => a.domainId);
    const validDomains = await db.query.bulkAnalysisDomains.findMany({
      where: inArray(bulkAnalysisDomains.id, domainIds)
    });

    if (validDomains.length !== domainIds.length) {
      return NextResponse.json({ 
        error: 'Some domains are invalid' 
      }, { status: 400 });
    }

    // Create a map for quick lookup
    const domainMap = new Map(validDomains.map(d => [d.id, d]));
    const batchId = uuidv4();
    const now = new Date();
    const updatedLineItems = [];
    const changeRecords = [];

    // Process each assignment
    for (const assignment of assignments) {
      const { lineItemId, domainId, targetPageUrl, anchorText } = assignment;
      const domain = domainMap.get(domainId);
      const lineItem = lineItems.find(li => li.id === lineItemId);

      if (!domain || !lineItem) continue;

      // Get website pricing and metrics information
      let wholesalePrice = lineItem.wholesalePrice;
      let estimatedPrice = lineItem.estimatedPrice;
      let domainRating: number | null = null;
      let traffic: number | null = null;

      try {
        // Always fetch the website to get latest DR/traffic data
        const website = await db.query.websites.findFirst({
          where: sql`${websites.domain} = ${domain.domain} 
                    OR ${websites.domain} = CONCAT('www.', ${domain.domain})
                    OR CONCAT('www.', ${websites.domain}) = ${domain.domain}`
        });

        if (website) {
          // Get DR and traffic from websites table (source of truth)
          domainRating = website.domainRating || null;
          traffic = website.totalTraffic || null;
          
          // Use the enhanced pricing service for pricing logic
          const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
            website.id, // Pass the website ID now that we have it
            domain.domain,
            {
              quantity: 1,
              clientType: 'standard',
              urgency: 'standard'
            }
          );

          if (pricingResult.wholesalePrice > 0) {
            wholesalePrice = pricingResult.wholesalePrice;
            estimatedPrice = pricingResult.retailPrice;
          } else if (website.guestPostCost) {
            // Fallback to direct calculation if enhanced service returns 0
            wholesalePrice = Math.floor(Number(website.guestPostCost) * 100);
            estimatedPrice = wholesalePrice + 7900; // $79 in cents
          }
        } else {
          // Try enhanced pricing service without website record
          const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
            null,
            domain.domain,
            {
              quantity: 1,
              clientType: 'standard',
              urgency: 'standard'
            }
          );

          if (pricingResult.wholesalePrice > 0) {
            wholesalePrice = pricingResult.wholesalePrice;
            estimatedPrice = pricingResult.retailPrice;
          }
        }
      } catch (error) {
        console.log('Could not fetch website data, using defaults:', error);
      }

      // Update line item
      await db
        .update(orderLineItems)
        .set({
          assignedDomainId: domainId,
          assignedDomain: domain.domain,
          assignedAt: now,
          assignedBy: session.userId,
          targetPageUrl: targetPageUrl || lineItem.targetPageUrl,
          anchorText: anchorText || lineItem.anchorText,
          wholesalePrice: wholesalePrice,
          estimatedPrice: estimatedPrice,
          status: 'assigned',
          modifiedAt: now,
          modifiedBy: session.userId,
          metadata: {
            ...((lineItem.metadata as any) || {}),
            domainQualificationStatus: domain.qualificationStatus,
            domainProjectId: domain.projectId,
            bulkAnalysisProjectId: projectId || domain.projectId,
            assignmentMethod: 'bulk_analysis',
            // Store DR and traffic from websites table (source of truth)
            domainRating: domainRating,
            traffic: traffic,
            // Store rich qualification analysis data
            aiQualificationReasoning: domain.aiQualificationReasoning,
            overlapStatus: domain.overlapStatus,
            authorityDirect: domain.authorityDirect,
            authorityRelated: domain.authorityRelated,
            topicScope: domain.topicScope,
            keywordCount: domain.keywordCount,
            dataForSeoResultsCount: domain.dataForSeoResultsCount,
            hasDataForSeoResults: domain.hasDataForSeoResults,
            evidence: domain.evidence,
            notes: domain.notes,
            // Store target URL analysis data
            suggestedTargetUrl: domain.suggestedTargetUrl,
            targetMatchData: domain.targetMatchData,
            targetMatchedAt: domain.targetMatchedAt
          }
        })
        .where(eq(orderLineItems.id, lineItemId));

      updatedLineItems.push({
        lineItemId,
        domainId,
        domain: domain.domain
      });

      // Create change record
      changeRecords.push({
        lineItemId,
        orderId,
        changeType: 'domain_assigned',
        previousValue: null,
        newValue: {
          domainId,
          domain: domain.domain,
          wholesalePrice,
          estimatedPrice
        },
        changedBy: session.userId,
        changeReason: 'Domain assigned from bulk analysis',
        batchId
      });
    }

    // Insert all change records
    if (changeRecords.length > 0) {
      await db.insert(lineItemChanges).values(changeRecords);
    }

    // Update order metadata to track bulk analysis usage
    await db
      .update(orders)
      .set({
        updatedAt: now,
        // metadata: sql`
        //   COALESCE(metadata, '{}'::jsonb) || 
        //   jsonb_build_object(
        //     'lastBulkAssignment', ${now.toISOString()},
        //     'bulkAssignmentCount', COALESCE((metadata->>'bulkAssignmentCount')::int, 0) + ${updatedLineItems.length}
        //   )
        // `
      })
      .where(eq(orders.id, orderId));

    // Update the order benchmark to reflect the new assignments
    try {
      const { createOrderBenchmark } = await import('@/lib/orders/benchmarkUtils');
      await createOrderBenchmark(
        orderId,
        session.userId,
        'manual_update' // This will create a new benchmark snapshot with current data
      );
    } catch (benchmarkError) {
      // Don't fail the whole operation if benchmark update fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${updatedLineItems.length} domains to line items`,
      assignments: updatedLineItems,
      batchId
    });

  } catch (error: any) {
    console.error('Error assigning domains to line items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign domains' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch available domains for assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const projectId = searchParams.get('projectId');

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query for available domains
    const conditions = [];
    if (clientId) {
      conditions.push(eq(bulkAnalysisDomains.clientId, clientId));
    }
    if (projectId) {
      conditions.push(eq(bulkAnalysisDomains.projectId, projectId));
    }

    // Get domains that are qualified (any positive qualification status)
    const allDomains = await db.query.bulkAnalysisDomains.findMany({
      where: and(...conditions)
    });
    
    // Filter for qualified domains (multiple statuses count as qualified)
    const availableDomains = allDomains.filter(d => 
      ['qualified', 'high_quality', 'good_quality', 'marginal_quality'].includes(d.qualificationStatus || '')
    );

    // Get unassigned line items for this order (exclude cancelled/refunded)
    const allUnassignedLineItems = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, orderId),
        isNull(orderLineItems.assignedDomainId)
      ),
      with: {
        client: true
      }
    });
    
    // Filter out cancelled and refunded items
    const unassignedLineItems = allUnassignedLineItems.filter(item => 
      !['cancelled', 'refunded'].includes(item.status)
    );

    return NextResponse.json({
      availableDomains,
      unassignedLineItems,
      summary: {
        totalDomains: availableDomains.length,
        totalUnassignedItems: unassignedLineItems.length,
        canAssign: Math.min(availableDomains.length, unassignedLineItems.length)
      }
    });

  } catch (error: any) {
    console.error('Error fetching available domains:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch available domains' },
      { status: 500 }
    );
  }
}