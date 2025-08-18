import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

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

    // Extract assignments from request
    const { assignments } = body;
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ 
        error: 'No domain assignments provided' 
      }, { status: 400 });
    }

    // Validate that all line items exist and are unassigned
    const lineItemIds = assignments.map(a => a.lineItemId);
    const lineItems = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, orderId),
        inArray(orderLineItems.id, lineItemIds),
        isNull(orderLineItems.assignedDomainId) // Only unassigned items
      )
    });

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

      // Get website pricing information if available
      let wholesalePrice = lineItem.wholesalePrice;
      let estimatedPrice = lineItem.estimatedPrice;

      try {
        const website = await db.query.websites.findFirst({
          where: eq(websites.domain, domain.domain)
        });

        if (website && (website as any).wholesalePrice) {
          wholesalePrice = Math.floor((website as any).wholesalePrice * 100); // Convert to cents
          estimatedPrice = wholesalePrice + 7900; // Add service fee
        }
      } catch (error) {
        console.log('Could not fetch website pricing, using defaults');
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
            assignmentMethod: 'bulk_analysis'
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

    // Get domains that are qualified and not yet assigned
    const availableDomains = await db.query.bulkAnalysisDomains.findMany({
      where: and(
        ...conditions,
        eq(bulkAnalysisDomains.qualificationStatus, 'qualified')
      )
    });

    // Get unassigned line items for this order
    const unassignedLineItems = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, orderId),
        isNull(orderLineItems.assignedDomainId)
      ),
      with: {
        client: true
      }
    });

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