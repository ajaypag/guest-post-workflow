import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestProjects } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisProjects, bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, or } from 'drizzle-orm';

// GET /api/vetted-sites/shared/[token] - Public access to shared results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: shareToken } = await params;

    if (!shareToken) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }

    // Find the request by share token
    const [requestData] = await db
      .select({
        id: vettedSitesRequests.id,
        targetUrls: vettedSitesRequests.targetUrls,
        filters: vettedSitesRequests.filters,
        notes: vettedSitesRequests.notes,
        status: vettedSitesRequests.status,
        prospectName: vettedSitesRequests.prospectName,
        prospectEmail: vettedSitesRequests.prospectEmail,
        prospectCompany: vettedSitesRequests.prospectCompany,
        shareToken: vettedSitesRequests.shareToken,
        shareExpiresAt: vettedSitesRequests.shareExpiresAt,
        domainCount: vettedSitesRequests.domainCount,
        qualifiedDomainCount: vettedSitesRequests.qualifiedDomainCount,
        createdAt: vettedSitesRequests.createdAt,
        fulfilledAt: vettedSitesRequests.fulfilledAt,
        claimToken: vettedSitesRequests.claimToken,
        claimedByAccount: vettedSitesRequests.claimedByAccount,
        claimedAt: vettedSitesRequests.claimedAt,
      })
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.shareToken, shareToken))
      .limit(1);

    if (!requestData) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    // Check if share link has expired
    if (requestData.shareExpiresAt && requestData.shareExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Only show results if request has been fulfilled
    if (requestData.status !== 'fulfilled') {
      return NextResponse.json({ 
        request: {
          id: requestData.id,
          targetUrls: requestData.targetUrls,
          prospectName: requestData.prospectName,
          prospectCompany: requestData.prospectCompany,
          status: requestData.status,
          createdAt: requestData.createdAt,
        },
        message: 'Analysis is still in progress. You will receive an email when results are ready.',
        status: requestData.status
      });
    }

    // Get linked projects and their domains
    const linkedProjects = await db
      .select({
        projectId: bulkAnalysisProjects.id,
        projectName: bulkAnalysisProjects.name,
        projectDomainCount: bulkAnalysisProjects.domainCount,
        projectQualifiedCount: bulkAnalysisProjects.qualifiedCount,
        projectCreatedAt: bulkAnalysisProjects.createdAt,
      })
      .from(vettedRequestProjects)
      .innerJoin(bulkAnalysisProjects, eq(vettedRequestProjects.projectId, bulkAnalysisProjects.id))
      .where(eq(vettedRequestProjects.requestId, requestData.id));

    let domains: any[] = [];

    if (linkedProjects.length > 0) {
      // Get domains from the linked projects
      const projectIds = linkedProjects.map(p => p.projectId);
      
      domains = await db
        .select({
          id: bulkAnalysisDomains.id,
          domain: bulkAnalysisDomains.domain,
          qualificationStatus: bulkAnalysisDomains.qualificationStatus,
          // Only show limited fields for public access
          aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
          overlapStatus: bulkAnalysisDomains.overlapStatus,
          authorityDirect: bulkAnalysisDomains.authorityDirect,
          authorityRelated: bulkAnalysisDomains.authorityRelated,
          topicScope: bulkAnalysisDomains.topicScope,
          evidence: bulkAnalysisDomains.evidence,
          suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
          // User curation for bookmark/hide (null for public access)
          userBookmarked: bulkAnalysisDomains.userBookmarked,
          userHidden: bulkAnalysisDomains.userHidden,
        })
        .from(bulkAnalysisDomains)
        .where(
          and(
            eq(bulkAnalysisDomains.sourceRequestId, requestData.id),
            or(
              eq(bulkAnalysisDomains.qualificationStatus, 'high_quality'),
              eq(bulkAnalysisDomains.qualificationStatus, 'good_quality')
            )
          )
        );
    }

    // Construct claim URL if not already claimed
    let claimUrl = null;
    if (requestData.claimToken && !requestData.claimedByAccount) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      claimUrl = `${baseUrl}/account/claim-analysis/${requestData.claimToken}`;
    }

    const response = {
      request: {
        id: requestData.id,
        targetUrls: requestData.targetUrls,
        filters: requestData.filters,
        notes: requestData.notes,
        status: requestData.status,
        prospectName: requestData.prospectName,
        prospectCompany: requestData.prospectCompany,
        domainCount: requestData.domainCount,
        qualifiedDomainCount: requestData.qualifiedDomainCount,
        createdAt: requestData.createdAt,
        fulfilledAt: requestData.fulfilledAt,
        isClaimed: !!requestData.claimedByAccount,
        claimedAt: requestData.claimedAt,
      },
      projects: linkedProjects,
      domains: domains,
      claimUrl: claimUrl,
      totalDomains: domains.length,
      qualifiedDomains: domains.filter(d => 
        d.qualificationStatus === 'high_quality' || d.qualificationStatus === 'good_quality'
      ).length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching shared vetted sites results:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}