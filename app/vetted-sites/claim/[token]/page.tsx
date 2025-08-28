import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestProjects, vettedRequestClients } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisDomains, bulkAnalysisProjects, clients, accounts, targetPages, websites } from '@/lib/db/schema';
import { eq, and, sql, inArray, or, desc } from 'drizzle-orm';
import LinkioHeader from '@/components/LinkioHeader';
import VettedSitesTable from '@/app/vetted-sites/components/VettedSitesTable';
import ClaimForm from './ClaimForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

async function getRequestData(token: string) {
  try {
    console.log('Fetching request with token:', token);
    
    // Get the vetted sites request by share token
    const requestQuery = await db
      .select()
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.shareToken, token));
    
    const request = requestQuery[0];
    
    if (!request) {
      console.log('Request not found for token');
      return null;
    }
    
    console.log('Found request:', request.id);
  
  // Check if already claimed
  if (request.claimedAt) {
    return { error: 'already_claimed' };
  }
  
  // Check if expired (30 days)
  if (request.shareExpiresAt && new Date() > new Date(request.shareExpiresAt)) {
    return { error: 'expired' };
  }
  
  // Get linked projects
  const linkedProjects = await db
    .select({
      projectId: vettedRequestProjects.projectId,
      project: bulkAnalysisProjects,
    })
    .from(vettedRequestProjects)
    .leftJoin(bulkAnalysisProjects, eq(vettedRequestProjects.projectId, bulkAnalysisProjects.id))
    .where(eq(vettedRequestProjects.requestId, request.id));
  
  console.log('Linked projects:', linkedProjects.map(p => p.projectId));
  
  // Get project IDs
  const linkedProjectIds = linkedProjects.map(p => p.projectId);
  
  // If no linked projects, return empty domains
  if (linkedProjectIds.length === 0) {
    console.log('No linked projects found for request');
  }
  
  // Get domains associated with this request - either through sourceRequestId OR through linked projects
  const domainsQuery = linkedProjectIds.length > 0 ? await db
    .select({
      // Bulk analysis domain fields
      id: bulkAnalysisDomains.id,
      domain: bulkAnalysisDomains.domain,
      qualificationStatus: bulkAnalysisDomains.qualificationStatus,
      aiQualifiedAt: bulkAnalysisDomains.aiQualifiedAt,
      updatedAt: bulkAnalysisDomains.updatedAt,
      userBookmarked: bulkAnalysisDomains.userBookmarked,
      userHidden: bulkAnalysisDomains.userHidden,
      userBookmarkedAt: bulkAnalysisDomains.userBookmarkedAt,
      userHiddenAt: bulkAnalysisDomains.userHiddenAt,
      overlapStatus: bulkAnalysisDomains.overlapStatus,
      authorityDirect: bulkAnalysisDomains.authorityDirect,
      authorityRelated: bulkAnalysisDomains.authorityRelated,
      topicScope: bulkAnalysisDomains.topicScope,
      topicReasoning: bulkAnalysisDomains.topicReasoning,
      evidence: bulkAnalysisDomains.evidence,
      aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
      keywordCount: bulkAnalysisDomains.keywordCount,
      notes: bulkAnalysisDomains.notes,
      hasWorkflow: bulkAnalysisDomains.hasWorkflow,
      suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
      targetMatchData: bulkAnalysisDomains.targetMatchData,
      targetMatchedAt: bulkAnalysisDomains.targetMatchedAt,
      hasDataForSeoResults: bulkAnalysisDomains.hasDataForSeoResults,
      dataForSeoResultsCount: bulkAnalysisDomains.dataForSeoResultsCount,
      wasManuallyQualified: bulkAnalysisDomains.wasManuallyQualified,
      wasHumanVerified: bulkAnalysisDomains.wasHumanVerified,
      clientId: bulkAnalysisDomains.clientId,
      projectId: bulkAnalysisDomains.projectId,
      
      // Website pricing and metadata
      guestPostCost: websites.guestPostCost,
      domainRating: websites.domainRating,
      totalTraffic: websites.totalTraffic,
    })
    .from(bulkAnalysisDomains)
    .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
    .where(
      and(
        // Query domains from linked projects OR with sourceRequestId
        or(
          inArray(bulkAnalysisDomains.projectId, linkedProjectIds),
          eq(bulkAnalysisDomains.sourceRequestId, request.id)
        ),
        inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality'])
      )
    )
    .orderBy(desc(bulkAnalysisDomains.aiQualifiedAt)) : [];
  
  // Transform to match the expected format
  const domains = domainsQuery.map(d => ({
    id: d.id,
    domain: d.domain,
    qualificationStatus: d.qualificationStatus,
    qualifiedAt: d.aiQualifiedAt?.toISOString() || null,
    updatedAt: d.updatedAt.toISOString(),
    userBookmarked: d.userBookmarked || false,
    userHidden: d.userHidden || false,
    userBookmarkedAt: d.userBookmarkedAt?.toISOString() || null,
    userHiddenAt: d.userHiddenAt?.toISOString() || null,
    overlapStatus: d.overlapStatus,
    authorityDirect: d.authorityDirect,
    authorityRelated: d.authorityRelated,
    topicScope: d.topicScope,
    topicReasoning: d.topicReasoning,
    evidence: d.evidence ? {
      directCount: (d.evidence as any)?.direct_count || 0,
      directMedianPosition: (d.evidence as any)?.direct_median_position || null,
      relatedCount: (d.evidence as any)?.related_count || 0,
      relatedMedianPosition: (d.evidence as any)?.related_median_position || null,
    } : null,
    aiQualificationReasoning: d.aiQualificationReasoning,
    keywordCount: d.keywordCount,
    notes: d.notes,
    hasWorkflow: d.hasWorkflow || false,
    suggestedTargetUrl: d.suggestedTargetUrl,
    targetMatchData: d.targetMatchData as any,
    targetMatchedAt: d.targetMatchedAt?.toISOString() || null,
    hasDataForSeoResults: d.hasDataForSeoResults || false,
    dataForSeoResultsCount: d.dataForSeoResultsCount || 0,
    wasManuallyQualified: d.wasManuallyQualified || false,
    wasHumanVerified: d.wasHumanVerified || false,
    clientId: d.clientId,
    clientName: null,
    projectId: d.projectId,
    projectName: null,
    accountId: null,
    websiteId: null,
    domainRating: d.domainRating,
    traffic: d.totalTraffic,
    categories: null,
    niche: null,
    websiteType: null,
    overallQuality: null,
    guestPostCost: d.guestPostCost,
    avgResponseTimeHours: null,
    successRatePercentage: null,
    totalPostsPublished: 0,
    lastCampaignDate: null,
    internalQualityScore: null,
    targetPageIds: [],
    activeLineItemsCount: 0,
    availabilityStatus: 'available' as const
  }));
  
  // Calculate stats
  const totalDomains = domains.length;
  const highQualityCount = domains.filter(d => d.qualificationStatus === 'high_quality').length;
  const goodQualityCount = domains.filter(d => d.qualificationStatus === 'good_quality').length;
  
  // Get target URLs from the request
  const targetUrls = Array.isArray(request.targetUrls) ? request.targetUrls : [];
  
  return {
    request,
    domains,
    stats: {
      totalQualified: totalDomains,
      highQuality: highQualityCount,
      goodQuality: goodQualityCount,
      targetUrls: targetUrls.length,
    },
    proposalMessage: request.proposalMessage,
    proposalVideoUrl: request.proposalVideoUrl,
  };
  } catch (error) {
    console.error('Error in getRequestData:', error);
    return null;
  }
}

export default async function VettedSitesClaimPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getRequestData(token);
  
  if (!data) {
    redirect('/404');
  }
  
  if (data && 'error' in data && data.error === 'already_claimed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <LinkioHeader />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Already Claimed</h1>
            <p className="text-gray-600 mb-6">
              These results have already been claimed. Please contact your sales representative for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (data && 'error' in data && data.error === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50">
        <LinkioHeader />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Link Expired</h1>
            <p className="text-gray-600 mb-6">
              This share link has expired. Please contact your sales representative for a new link.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader />
      
      {/* Hero Section with Stats */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Your Strategic Guest Post Matches
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            We found {data.stats?.totalQualified || 0} sites that already rank for topics similar to yours—boosting your visibility in ChatGPT, Claude, AI Overviews, and AI Mode while improving your traditional search rankings.
          </p>
          
          {/* Stats Bar */}
          <div className="flex items-center space-x-8 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">Wholesale + $79</div>
              <div className="text-gray-500">Fair Pricing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Clear Justifications</div>
              <div className="text-gray-500">Exact Reason Why</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">We Handle Everything</div>
              <div className="text-gray-500">Full Concierge</div>
            </div>
          </div>
          
          {/* Proposal Message */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-700">Each site below has been strategically selected based on topical overlap with your content—not just high domain authority.</p>
          </div>
          {data.proposalMessage && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{data.proposalMessage}</p>
            </div>
          )}
          
          {/* Video Embed */}
          {data.proposalVideoUrl && (
            <div className="mt-6">
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src={data.proposalVideoUrl}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-[400px] rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Signup Form */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Claim These Results
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Create your free account to access these guest posting opportunities and start building high-quality backlinks.
              </p>
              <ClaimForm token={token} requestId={data.request?.id || ''} />
            </div>
          </div>
          
          {/* Right Content - Table */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Strategic Site Matches
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  These aren't random high-authority sites. Each one already ranks for searches related to your business, making them strategic choices for AI visibility. Click any row to see exactly why we picked them and what content will work best.
                </p>
              </div>
              <VettedSitesTable
                initialData={{
                  domains: data.domains || [],
                  total: data.stats?.totalQualified || 0,
                  page: 1,
                  limit: 50,
                  totalPages: 1,
                  stats: {
                    totalQualified: data.stats?.totalQualified || 0,
                    available: data.stats?.totalQualified || 0,
                    used: 0,
                    bookmarked: 0,
                    hidden: 0,
                  }
                }}
                isPublicView={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}