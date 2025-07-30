import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders, orderGroups, clients, bulkAnalysisProjects, bulkAnalysisDomains, orderSiteSelections } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
    groupId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId, groupId } = params;

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderGroups: {
          where: eq(orderGroups.id, groupId),
          with: {
            client: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderGroup = order.orderGroups[0];
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Get analyzed domains from the bulk analysis project
    let analyzedDomainsList: any[] = [];
    
    if (orderGroup.bulkAnalysisProjectId) {
      // Get all analyzed domains from the bulk analysis project
      analyzedDomainsList = await db.query.bulkAnalysisDomains.findMany({
        where: eq(bulkAnalysisDomains.projectId, orderGroup.bulkAnalysisProjectId)
      });
    }

    // Transform bulk analysis domains to the expected format
    const transformedDomains = analyzedDomainsList.map(domain => ({
      id: domain.id,
      domain: domain.domain,
      dr: 70, // TODO: Get from DataForSEO or other metrics
      traffic: 10000, // TODO: Get from DataForSEO or other metrics
      niche: domain.client?.niche || 'General',
      status: domain.qualificationStatus === 'high_quality' ? 'high_quality' : 
              domain.qualificationStatus === 'good_quality' ? 'good' :
              domain.qualificationStatus === 'marginal_quality' ? 'marginal' : 'disqualified',
      price: 100, // TODO: Calculate based on metrics
      projectId: domain.projectId,
      notes: domain.notes
    }));

    // Get suggested sites based on client requirements
    const suggestedSites = transformedDomains.filter(domain => {
      // Apply client requirements as filters
      const reqs = orderGroup.requirements || {};
      
      if (reqs.minDR && domain.dr < reqs.minDR) return false;
      if (reqs.minTraffic && domain.traffic < reqs.minTraffic) return false;
      if (reqs.niches && reqs.niches.length > 0 && !reqs.niches.includes(domain.niche)) return false;
      
      // Only suggest high quality and good sites
      return domain.status === 'high_quality' || domain.status === 'good';
    });

    // Get current selections for this order group
    const currentSelections = await db.query.orderSiteSelections.findMany({
      where: eq(orderSiteSelections.orderGroupId, groupId),
      with: {
        domain: true
      }
    });

    // Transform selections to expected format
    const transformedSelections = currentSelections.map(selection => ({
      id: selection.id,
      domainId: selection.domainId,
      domain: {
        id: selection.domain.id,
        domain: selection.domain.domain,
        dr: 70, // TODO: Get from DataForSEO or other metrics
        traffic: 10000, // TODO: Get from DataForSEO or other metrics
        niche: 'General',
        status: selection.domain.qualificationStatus === 'high_quality' ? 'high_quality' : 
                selection.domain.qualificationStatus === 'good_quality' ? 'good' :
                selection.domain.qualificationStatus === 'marginal_quality' ? 'marginal' : 'disqualified',
        price: 100,
        projectId: selection.domain.projectId,
        notes: selection.domain.notes
      },
      targetPageUrl: selection.targetPageUrl,
      anchorText: selection.anchorText,
      status: selection.status
    }));

    return NextResponse.json({
      suggested: suggestedSites,
      all: transformedDomains,
      currentSelections: transformedSelections
    });

  } catch (error) {
    console.error('Error fetching site selections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site selections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId, groupId } = params;
    const body = await request.json();

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderGroups: {
          where: eq(orderGroups.id, groupId),
          with: {
            client: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderGroup = order.orderGroups[0];
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Start a transaction to update selections
    await db.transaction(async (tx) => {
      // Delete existing selections for this order group
      await tx.delete(orderSiteSelections).where(eq(orderSiteSelections.orderGroupId, groupId));

      // Insert new selections
      if (body.selections && body.selections.length > 0) {
        const newSelections = body.selections.map((selection: any) => ({
          id: crypto.randomUUID(),
          orderGroupId: groupId,
          domainId: selection.domainId,
          targetPageUrl: selection.targetPageUrl,
          anchorText: selection.anchorText,
          status: selection.status || 'approved',
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await tx.insert(orderSiteSelections).values(newSelections);
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating site selections:', error);
    return NextResponse.json(
      { error: 'Failed to update site selections' },
      { status: 500 }
    );
  }
}