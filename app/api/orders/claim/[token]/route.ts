import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { claimViewRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';

// GET - Get order details by share token (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Rate limiting by IP to prevent abuse
    const clientIp = getClientIp(request);
    const rateLimitResult = claimViewRateLimiter.check(`view:${clientIp}`);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.` 
      }, { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 300)
        }
      });
    }

    // Find order by share token
    const order = await db.query.orders.findFirst({
      where: eq(orders.shareToken, token),
      with: {
        account: {
          columns: {
            companyName: true,
            contactName: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Check if token is expired
    if (order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Get order groups with client info
    const orderGroupsData = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, order.id),
      with: {
        client: {
          columns: {
            id: true,
            name: true,
            website: true,
            description: true
          }
        }
      }
    });
    
    // Get site submissions for each order group to show analysis data
    const siteSubmissions: Record<string, any[]> = {};
    
    for (const orderGroup of orderGroupsData) {
      const submissions = await db.query.orderSiteSubmissions.findMany({
        where: eq(orderSiteSubmissions.orderGroupId, orderGroup.id),
        orderBy: (submissions, { desc }) => [desc(submissions.submittedAt)]
      });
      
      if (submissions.length > 0) {
        // Get domain details for submissions
        const domainIds = submissions.map(s => s.domainId);
        const domainsWithSubmissions = await db.query.bulkAnalysisDomains.findMany({
          where: inArray(bulkAnalysisDomains.id, domainIds)
        });
        
        // Create a map for easy lookup
        const domainMap = new Map(domainsWithSubmissions.map(d => [d.id, d]));
        
        // Get website data for DR and traffic
        const submissionDomainNames = domainsWithSubmissions.map(d => d.domain.toLowerCase());
        const submissionWebsiteData = submissionDomainNames.length > 0
          ? await db.query.websites.findMany({
              where: sql`LOWER(${websites.domain}) = ANY(ARRAY[${sql.join(submissionDomainNames.map(d => sql`${d}`), sql`,`)}])`
            })
          : [];
        
        // Create a map for submission website data
        const submissionWebsiteMap = new Map(submissionWebsiteData.map(w => [w.domain.toLowerCase(), w]));
        
        // Format submissions with proper domain data and expanded details
        const formattedSubmissions = submissions.map(submission => {
          const domain = domainMap.get(submission.domainId);
          if (!domain) return null;
          
          const website = submissionWebsiteMap.get(domain.domain.toLowerCase());
          const guestPostCost = website?.guestPostCost ? parseFloat(website.guestPostCost) : 0;
          
          return {
            id: submission.id,
            domainId: submission.domainId,
            domain: {
              id: domain.id,
              domain: domain.domain,
              domainRating: website?.domainRating || null,
              traffic: website?.totalTraffic || null,
              // AI analysis data for DomainCell tags
              qualificationStatus: domain.qualificationStatus,
              overlapStatus: domain.overlapStatus as 'direct' | 'related' | 'both' | 'none' | undefined,
              authorityDirect: domain.authorityDirect as 'strong' | 'moderate' | 'weak' | 'n/a' | undefined,
              authorityRelated: domain.authorityRelated as 'strong' | 'moderate' | 'weak' | 'n/a' | undefined,
              topicScope: domain.topicScope as 'short_tail' | 'long_tail' | 'ultra_long_tail' | undefined,
              keywordCount: domain.keywordCount,
              hasDataForSeoResults: domain.hasDataForSeoResults,
              // AI analysis data for expanded details
              aiQualificationReasoning: domain.aiQualificationReasoning,
              topicReasoning: domain.topicReasoning,
              evidence: domain.evidence,
              notes: domain.notes
            },
            // Table display fields (use component's expected field names)
            url: `https://${domain.domain}`,
            domainRating: website?.domainRating || null,
            traffic: website?.totalTraffic || null,
            categories: website?.categories || [],
            qualificationReasoning: domain.aiQualificationReasoning || domain.notes || '',
            price: submission.retailPriceSnapshot || guestPostCost,
            wholesalePrice: submission.wholesalePriceSnapshot || 0,
            retailPrice: submission.retailPriceSnapshot || guestPostCost,
            targetPageUrl: submission.metadata?.targetPageUrl || '',
            anchorText: submission.metadata?.anchorText || '',
            specialInstructions: submission.metadata?.specialInstructions || '',
            submissionStatus: submission.submissionStatus,
            inclusionStatus: submission.inclusionStatus,
            exclusionReason: submission.exclusionReason,
            submittedAt: submission.submittedAt,
            clientReviewNotes: submission.clientReviewNotes,
            // Enhanced metadata for expanded details
            metadata: {
              ...submission.metadata,
              internalNotes: submission.metadata?.notes,
              statusHistory: submission.metadata?.statusHistory || [],
              reviewHistory: submission.metadata?.reviewHistory || []
            },
            // Add analysis fields that OrderSiteReviewTableV2 expects
            topicScopeAnalysis: domain.qualificationStatus || '',
            qualityScore: website?.domainRating || 0,
            notes: submission.metadata?.notes || domain.notes || ''
          };
        }).filter(Boolean); // Remove null entries
        
        siteSubmissions[orderGroup.id] = formattedSubmissions;
      } else {
        siteSubmissions[orderGroup.id] = [];
      }
    }

    // Format response with rich analysis data for OrderSiteReviewTableV2
    const publicOrder = {
      id: order.id,
      status: order.status,
      state: order.state,
      totalPrice: order.totalRetail,
      totalWholesale: order.totalWholesale,
      includesClientReview: order.includesClientReview,
      rushDelivery: order.rushDelivery,
      shareExpiresAt: order.shareExpiresAt,
      proposalVideoUrl: order.proposalVideoUrl,
      proposalMessage: order.proposalMessage,
      account: order.account ? {
        companyName: order.account.companyName,
        contactName: order.account.contactName
      } : null,
      orderGroups: orderGroupsData.map(orderGroup => ({
        id: orderGroup.id,
        clientId: orderGroup.clientId,
        linkCount: orderGroup.linkCount,
        targetPages: orderGroup.targetPages,
        client: orderGroup.client ? {
          id: orderGroup.client.id,
          name: orderGroup.client.name,
          website: orderGroup.client.website
        } : null
      }))
    };

    return NextResponse.json({ 
      success: true,
      order: publicOrder,
      siteSubmissions
    });

  } catch (error: any) {
    console.error('Error fetching order by token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load order' },
      { status: 500 }
    );
  }
}