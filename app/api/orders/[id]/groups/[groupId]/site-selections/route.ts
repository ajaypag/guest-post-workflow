import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisProjects, bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { orderSiteSelections } from '@/lib/db/schema';
import { projectOrderAssociations, orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id: orderId, groupId } = await params;

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the order exists and user has access
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check access - both internal and account users allowed with different permissions
    if (session.userType === 'internal') {
      // Internal users: Full access to any order
    } else if (session.userType === 'account') {
      // Account users: Only access orders they own
      if (order.accountId !== session.accountId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Now get the specific order group
    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(eq(orderGroups.orderId, orderId), eq(orderGroups.id, groupId)),
      with: {
        client: true
      }
    });

    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Get analyzed domains through flexible project associations
    let analyzedDomainsList: any[] = [];
    
    // Find associated projects for this order group
    const associations = await db.query.projectOrderAssociations.findMany({
      where: and(
        eq(projectOrderAssociations.orderGroupId, groupId),
        eq(projectOrderAssociations.orderId, orderId)
      ),
      with: {
        project: true
      }
    });
    
    if (associations.length > 0) {
      // Get all analyzed domains from associated projects
      // Note: If multiple projects are associated, this gets domains from all of them
      const projectIds = associations.map(a => a.projectId);
      analyzedDomainsList = await db.query.bulkAnalysisDomains.findMany({
        where: inArray(bulkAnalysisDomains.projectId, projectIds)
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
      const reqs = orderGroup.requirementOverrides || {};
      
      if (reqs.minDR && domain.dr < reqs.minDR) return false;
      if (reqs.minTraffic && domain.traffic < reqs.minTraffic) return false;
      if (reqs.niches && reqs.niches.length > 0 && !reqs.niches.includes(domain.niche)) return false;
      
      // Only suggest high quality and good sites
      return domain.status === 'high_quality' || domain.status === 'good';
    });

    // Get current submissions for this order group
    const currentSubmissions = await db.query.orderSiteSubmissions.findMany({
      where: eq(orderSiteSubmissions.orderGroupId, groupId)
    });
    
    // Get domain details for submissions
    const domainIds = currentSubmissions.map(s => s.domainId);
    const domainsWithSubmissions = domainIds.length > 0 
      ? await db.query.bulkAnalysisDomains.findMany({
          where: inArray(bulkAnalysisDomains.id, domainIds)
        })
      : [];
    
    // Create a map for easy lookup
    const domainMap = new Map(domainsWithSubmissions.map(d => [d.id, d]));

    // Transform submissions to expected format
    const transformedSelections = currentSubmissions.map(submission => {
      const domain = domainMap.get(submission.domainId);
      return {
        id: submission.id,
        domainId: submission.domainId,
        domain: domain ? {
          id: domain.id,
          domain: domain.domain,
          dr: 70, // TODO: Get from DataForSEO or other metrics
          traffic: 10000, // TODO: Get from DataForSEO or other metrics
          niche: 'General',
          status: domain.qualificationStatus === 'high_quality' ? 'high_quality' : 
                  domain.qualificationStatus === 'good_quality' ? 'good' :
                  domain.qualificationStatus === 'marginal_quality' ? 'marginal' : 'disqualified',
          price: 100,
          projectId: domain.projectId,
          notes: domain.notes
        } : null,
        targetPageUrl: submission.metadata?.targetPageUrl,
        anchorText: submission.metadata?.anchorText,
        submissionStatus: submission.submissionStatus,
        clientReviewedAt: submission.clientReviewedAt,
        clientReviewNotes: submission.clientReviewNotes
      };
    }).filter(s => s.domain !== null);

    return NextResponse.json({
      suggested: suggestedSites,
      all: transformedDomains,
      currentSelections: transformedSelections,
      userCapabilities: {
        canCreateSelections: session.userType === 'internal',
        canModifySelections: session.userType === 'internal' || session.userType === 'account',
        userType: session.userType
      }
    });

  } catch (error) {
    console.error('Error fetching site selections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site selections' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id: orderId, groupId } = await params;
    const body = await request.json();

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the order exists and user has access
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check access - both internal and account users allowed with different permissions
    if (session.userType === 'internal') {
      // Internal users: Full access to any order
    } else if (session.userType === 'account') {
      // Account users: Only access orders they own
      if (order.accountId !== session.accountId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Now get the specific order group
    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(eq(orderGroups.orderId, orderId), eq(orderGroups.id, groupId)),
      with: {
        client: true
      }
    });

    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Get associated projects to check if any sites have been suggested
    const associations = await db.query.projectOrderAssociations.findMany({
      where: and(
        eq(projectOrderAssociations.orderGroupId, groupId),
        eq(projectOrderAssociations.orderId, orderId)
      )
    });
    
    // Check if this is a new selection creation (no associated projects yet)
    if (session.userType === 'account' && associations.length === 0) {
      // Account users can only modify existing suggestions, not create new ones
      return NextResponse.json({ 
        error: 'Forbidden - Account users cannot create new site selections. Please wait for site suggestions from the team.' 
      }, { status: 403 });
    }

    // Start a transaction to update submissions
    await db.transaction(async (tx) => {
      // For account users, validate they're only modifying suggested sites
      if (session.userType === 'account' && body.selections) {
        // Get all valid domains from associated projects
        if (associations.length > 0) {
          const projectIds = associations.map(a => a.projectId);
          const validDomainIds = await tx.query.bulkAnalysisDomains.findMany({
            where: inArray(bulkAnalysisDomains.projectId, projectIds),
            columns: { id: true }
          });
          
          const validIds = new Set(validDomainIds.map(d => d.id));
          const invalidSelections = body.selections.filter((s: any) => !validIds.has(s.domainId));
          
          if (invalidSelections.length > 0) {
            throw new Error('Account users can only select from analyzed domains');
          }
        }
      }

      // Delete existing submissions for this order group
      await tx.delete(orderSiteSubmissions).where(eq(orderSiteSubmissions.orderGroupId, groupId));

      // Insert new submissions
      if (body.selections && body.selections.length > 0) {
        const newSubmissions = body.selections.map((selection: any) => ({
          orderGroupId: groupId,
          domainId: selection.domainId,
          submissionStatus: selection.status === 'approved' ? 'client_approved' : 
                           selection.status === 'rejected' ? 'client_rejected' : 'pending',
          metadata: {
            targetPageUrl: selection.targetPageUrl,
            anchorText: selection.anchorText,
            specialInstructions: selection.specialInstructions
          },
          clientReviewedAt: selection.status === 'approved' || selection.status === 'rejected' ? new Date() : null,
          clientReviewNotes: selection.reviewNotes,
          clientReviewedBy: (selection.status === 'approved' || selection.status === 'rejected') && session.userType === 'account' ? session.userId : null,
          submittedBy: session.userType === 'internal' ? session.userId : null,
          submittedAt: session.userType === 'internal' ? new Date() : null
        }));

        await tx.insert(orderSiteSubmissions).values(newSubmissions);
      }
    });

    // Check if any selections were approved
    const approvedCount = body.selections?.filter((s: any) => s.status === 'approved').length || 0;
    
    // NOTE: Workflow generation is now manual or triggered after payment
    // We don't automatically generate workflows on approval anymore
    // Use the /generate-workflows endpoint after payment is confirmed

    return NextResponse.json({ 
      success: true,
      approvedCount,
      message: approvedCount > 0 
        ? `${approvedCount} sites approved. Workflows will be generated after payment is confirmed.`
        : 'Site selections updated successfully'
    });

  } catch (error) {
    console.error('Error updating site selections:', error);
    return NextResponse.json(
      { error: 'Failed to update site selections' },
      { status: 500 }
    );
  }
}