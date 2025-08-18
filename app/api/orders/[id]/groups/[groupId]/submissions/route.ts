import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orders } from '@/lib/db/orderSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, inArray } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  const params = await context.params;
  
  // MIGRATION: Return empty submissions during lineItems migration
  if (true) {
    return NextResponse.json({ 
      submissions: [],
      message: 'Order uses lineItems system instead of submissions'
    });
  }
  
  try {
    // Get user session
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    
    // Get the order to check permissions
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, params.id)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions - TypeScript needs explicit non-null assertion
    if (session!.userType === 'account') {
      if (order!.accountId !== session!.userId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    }
    
    // Verify the order group exists and matches the order
    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(
        eq(orderGroups.id, params.groupId),
        eq(orderGroups.orderId, params.id)
      )
    });
    
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }
    
    // Build query conditions
    const conditions = [eq(orderSiteSubmissions.orderGroupId, params.groupId)];
    
    if (status) {
      conditions.push(eq(orderSiteSubmissions.submissionStatus, status as string));
    }
    
    // For account users, by default don't show completed unless requested
    if (session!.userType === 'account' && !includeCompleted) {
      conditions.push(eq(orderSiteSubmissions.submissionStatus, 'pending'));
    }
    
    // Debug logging
    console.log('[SUBMISSIONS API] Query conditions:', {
      orderGroupId: params.groupId,
      userType: session!.userType,
      sessionUserId: session!.userId,
      orderAccountId: order!.accountId,
      status: status,
      includeCompleted: includeCompleted,
      conditions: conditions.length
    });

    // Get submissions
    const submissions = await db.query.orderSiteSubmissions.findMany({
      where: and(...conditions),
      orderBy: (submissions, { desc }) => [desc(submissions.createdAt)]
    });

    console.log('[SUBMISSIONS API] Found submissions:', submissions.length);
    
    // Get domain details for all submissions
    const domainIds = submissions.map(s => s.domainId);
    const domains = domainIds.length > 0 
      ? await db.query.bulkAnalysisDomains.findMany({
          where: inArray(bulkAnalysisDomains.id, domainIds)
        })
      : [];
    
    // Create domain lookup map
    const domainMap = new Map(domains.map(d => [d.id, d]));
    
    // Get website pricing data for domains without price snapshots
    const domainNames = domains.map(d => d.domain);
    const websitePrices = domainNames.length > 0
      ? await db.query.websites.findMany({
          where: inArray(websites.domain, domainNames),
          columns: {
            domain: true,
            guestPostCost: true,
            domainRating: true,
            totalTraffic: true
          }
        })
      : [];
    
    // Create website price lookup map
    const websiteMap = new Map(websitePrices.map(w => [w.domain, w]));
    
    // Transform submissions with domain data
    const enrichedSubmissions = submissions.map(submission => {
      const domain = domainMap.get(submission.domainId);
      const websiteData = domain ? websiteMap.get(domain.domain) : null;
      
      // Calculate price - use snapshot if available, otherwise from website data
      let price = 0;
      let wholesalePrice = 0;
      const serviceFee = submission.serviceFeeSnapshot || 7900;
      
      if (submission.retailPriceSnapshot) {
        price = submission.retailPriceSnapshot;
        wholesalePrice = submission.wholesalePriceSnapshot || (price - serviceFee);
      } else if (submission.wholesalePriceSnapshot) {
        wholesalePrice = submission.wholesalePriceSnapshot;
        price = wholesalePrice + serviceFee;
      } else if (websiteData?.guestPostCost) {
        // Convert from decimal dollars to cents
        wholesalePrice = Math.round(parseFloat(websiteData.guestPostCost.toString()) * 100);
        price = wholesalePrice + serviceFee;
      }
      
      return {
        id: submission.id,
        domainId: submission.domainId,
        domain: domain ? {
          id: domain.id,
          domain: domain.domain,
          qualificationStatus: domain.qualificationStatus,
          notes: domain.notes,
          // Include bulk analysis data for mini-table
          overlapStatus: domain.overlapStatus,
          authorityDirect: domain.authorityDirect,
          authorityRelated: domain.authorityRelated,
          topicScope: domain.topicScope,
          topicReasoning: domain.topicReasoning,
          aiQualificationReasoning: domain.aiQualificationReasoning,
          evidence: domain.evidence,
          keywordCount: domain.keywordCount,
          hasDataForSeoResults: domain.hasDataForSeoResults,
          dataForSeoResultsCount: domain.dataForSeoResultsCount
        } : null,
        domainRating: submission.metadata?.domainRating || websiteData?.domainRating || undefined,
        traffic: submission.metadata?.traffic || websiteData?.totalTraffic || undefined,
        status: submission.submissionStatus,
        price: price,
        wholesalePrice: wholesalePrice,
        serviceFee: serviceFee,
        targetPageUrl: submission.metadata?.targetPageUrl,
        anchorText: submission.metadata?.anchorText,
        specialInstructions: submission.metadata?.specialInstructions,
        clientReviewedAt: submission.clientReviewedAt,
        clientReviewNotes: submission.clientReviewNotes,
        submittedAt: submission.submittedAt,
        completedAt: submission.completedAt,
        createdAt: submission.createdAt,
        // Pool information (deprecated)
        selectionPool: submission.selectionPool,
        poolRank: submission.poolRank,
        // NEW: Status-based system
        inclusionStatus: submission.inclusionStatus || 
          (submission.selectionPool === 'primary' ? 'included' : 'saved_for_later'),
        inclusionOrder: submission.inclusionOrder || submission.poolRank,
        exclusionReason: submission.exclusionReason,
        canReview: session.userType === 'account' && 
                   submission.submissionStatus === 'pending' &&
                   submission.submittedAt !== null,
        canViewDetails: true
      };
    });
    
    // Calculate summary stats
    const summary = {
      total: enrichedSubmissions.length,
      pending: enrichedSubmissions.filter(s => s.status === 'pending').length,
      submitted: enrichedSubmissions.filter(s => s.status === 'submitted').length,
      inProgress: enrichedSubmissions.filter(s => s.status === 'in_progress').length,
      completed: enrichedSubmissions.filter(s => s.status === 'completed').length,
      clientApproved: enrichedSubmissions.filter(s => s.status === 'client_approved').length,
      clientRejected: enrichedSubmissions.filter(s => s.status === 'client_rejected').length
    };
    
    return NextResponse.json({ 
      submissions: enrichedSubmissions,
      summary,
      userCapabilities: {
        canReview: session.userType === 'account' || session.userType === 'internal',
        canUpdateStatus: session.userType === 'internal',
        userType: session.userType
      }
    });
    
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}