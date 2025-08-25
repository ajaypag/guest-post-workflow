import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, inArray, isNull, or, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/orders/[id]/line-items/available-domains
 * 
 * This endpoint provides available domains for line items in an order.
 * It replaces the old order_groups/submissions workflow by:
 * 1. Finding bulk analysis projects associated with the order
 * 2. Fetching qualified domains from those projects
 * 3. Returning them in a format compatible with the existing UI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the order
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

    // Get active line items with client info (exclude cancelled items from domain assignment)
    const lineItems = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, orderId),
        sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
        sql`${orderLineItems.cancelledAt} IS NULL`
      ),
      with: {
        client: true
      }
    });

    if (lineItems.length === 0) {
      return NextResponse.json({ 
        domains: [],
        lineItems: [],
        message: 'No line items found for this order'
      });
    }

    // Get unique client IDs
    const clientIds = [...new Set(lineItems.map(item => item.clientId))];

    // Find bulk analysis projects associated with this order
    // In the new line items system, projects are associated via tags: `order:${orderId}`
    
    const projectsForOrder = await db.query.bulkAnalysisProjects.findMany({
      where: and(
        inArray(bulkAnalysisProjects.clientId, clientIds),
        sql`tags @> ${JSON.stringify([`order:${orderId}`])}`
      )
    });

    let projectIds: string[] = projectsForOrder.map(p => p.id);

    // If no projects found with order tag, try fallback approach
    if (projectIds.length === 0) {
      console.log(`[AVAILABLE-DOMAINS] No projects found with order:${orderId} tag, trying fallback`);
      
      // Fallback: Find projects for these clients created around order time
      const orderDate = new Date(order.createdAt);
      const dayBefore = new Date(orderDate.getTime() - 24 * 60 * 60 * 1000);
      const weekAfter = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const clientProjects = await db.query.bulkAnalysisProjects.findMany({
        where: inArray(bulkAnalysisProjects.clientId, clientIds)
      });

      // Filter to projects created around order time
      projectIds = clientProjects
        .filter(p => {
          const projectDate = new Date(p.createdAt);
          return projectDate >= dayBefore && projectDate <= weekAfter;
        })
        .map(p => p.id);
        
      console.log(`[AVAILABLE-DOMAINS] Fallback found ${projectIds.length} projects for clients`);
    } else {
      console.log(`[AVAILABLE-DOMAINS] Found ${projectIds.length} projects with order tag`);
    }

    if (projectIds.length === 0) {
      return NextResponse.json({ 
        domains: [],
        lineItems: lineItems,
        message: 'No bulk analysis projects found for this order'
      });
    }

    // Fetch qualified domains from these projects
    const domains = await db.query.bulkAnalysisDomains.findMany({
      where: and(
        inArray(bulkAnalysisDomains.projectId, projectIds),
        eq(bulkAnalysisDomains.qualificationStatus, 'qualified')
      ),
      with: {
        project: {
          with: {
            client: true
          }
        }
      }
    });

    // Transform domains to submission-like format for UI compatibility
    // Group domains by client for easy matching with line items
    const domainsByClient: Record<string, any[]> = {};

    domains.forEach(domain => {
      const clientId = domain.project?.clientId;
      if (!clientId) return;

      if (!domainsByClient[clientId]) {
        domainsByClient[clientId] = [];
      }

      // Check if this domain is already assigned to a line item
      const assignedLineItem = lineItems.find(li => li.assignedDomainId === domain.id);

      domainsByClient[clientId].push({
        id: domain.id,
        domain: domain.domain,
        domainRating: null, // These fields don't exist on bulkAnalysisDomains
        traffic: null,
        price: 30000, // Default price - would need to join with websites table for actual price
        wholesalePrice: 20000, // Default wholesale
        qualificationStatus: domain.qualificationStatus,
        
        // AI qualification data
        overlapStatus: domain.overlapStatus,
        authorityDirect: domain.authorityDirect,
        authorityRelated: domain.authorityRelated,
        topicScope: domain.topicScope,
        topicReasoning: domain.topicReasoning,
        aiQualificationReasoning: domain.aiQualificationReasoning,
        evidence: domain.evidence,
        
        // Assignment status
        isAssigned: !!assignedLineItem,
        assignedToLineItemId: assignedLineItem?.id,
        
        // Metadata
        projectId: domain.projectId,
        projectName: domain.project?.name,
        clientId: clientId,
        clientName: domain.project?.client?.name,
        
        // For UI compatibility - transform to submission-like structure
        status: assignedLineItem ? 'assigned' : 'available',
        inclusionStatus: assignedLineItem ? 'included' : 'excluded'
      });
    });

    // Also return line items grouped by client for easy matching
    const lineItemsByClient: Record<string, any[]> = {};
    lineItems.forEach(item => {
      if (!lineItemsByClient[item.clientId]) {
        lineItemsByClient[item.clientId] = [];
      }
      lineItemsByClient[item.clientId].push({
        ...item,
        needsDomain: !item.assignedDomainId,
        clientName: item.client?.name
      });
    });

    return NextResponse.json({
      domains: domainsByClient,
      lineItems: lineItemsByClient,
      summary: {
        totalDomains: domains.length,
        totalLineItems: lineItems.length,
        clientCount: clientIds.length,
        assignedCount: lineItems.filter(li => li.assignedDomainId).length,
        unassignedCount: lineItems.filter(li => !li.assignedDomainId).length
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