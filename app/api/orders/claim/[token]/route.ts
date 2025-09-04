import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites, clients } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
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

    // Get line items with all necessary relationships for display
    const lineItemsData = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, order.id),
        sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
        sql`${orderLineItems.cancelledAt} IS NULL`
      ),
      with: {
        client: {
          columns: {
            id: true,
            name: true,
            website: true,
            description: true
          }
        },
        targetPage: {
          columns: {
            id: true,
            url: true,
            description: true
          }
        },
        assignedDomain: {
          columns: {
            id: true,
            domain: true,
            qualificationStatus: true,
            overlapStatus: true,
            authorityDirect: true,
            authorityRelated: true,
            topicScope: true,
            aiQualificationReasoning: true,
            topicReasoning: true,
            evidence: true,
            notes: true,
            // Target URL matching fields
            suggestedTargetUrl: true,
            targetMatchData: true,
            targetMatchedAt: true,
            selectedTargetPageId: true,
            // Additional rich data
            keywordCount: true,
            dataForSeoResultsCount: true,
            qualificationData: true
          }
        }
      }
    });
    
    // Group line items by client for better display
    const lineItemsByClient: Record<string, typeof lineItemsData> = {};
    lineItemsData.forEach(item => {
      if (!lineItemsByClient[item.clientId]) {
        lineItemsByClient[item.clientId] = [];
      }
      lineItemsByClient[item.clientId].push(item);
    });
    
    // Get available domains for these line items
    const availableDomains: Record<string, any[]> = {};
    
    // Fetch available domains using the same logic as the available-domains API
    if (lineItemsData.length > 0) {
      const clientIds = [...new Set(lineItemsData.map(item => item.clientId))];
      
      // Find bulk analysis projects associated with this order
      const projectsQuery = await db.execute(sql`
        SELECT * FROM bulk_analysis_projects 
        WHERE client_id::text = ANY(ARRAY[${sql.join(clientIds.map(id => sql`${id}::text`), sql`,`)}])
        AND tags @> ${JSON.stringify([`order:${order.id}`])}
      `);
      
      let projectIds = projectsQuery.rows.map((p: any) => p.id);
      
      // If no projects found with order tag, try fallback approach
      if (projectIds.length === 0) {
        console.log(`[CLAIM-API] No projects found with order:${order.id} tag, trying fallback`);
        
        // Fallback: Find projects for these clients created around order time
        const orderDate = new Date(order.createdAt);
        const dayBefore = new Date(orderDate.getTime() - 24 * 60 * 60 * 1000);
        const weekAfter = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const clientProjectsQuery = await db.execute(sql`
          SELECT * FROM bulk_analysis_projects 
          WHERE client_id::text = ANY(ARRAY[${sql.join(clientIds.map(id => sql`${id}::text`), sql`,`)}])
          AND created_at >= ${dayBefore.toISOString()}
          AND created_at <= ${weekAfter.toISOString()}
        `);
        
        projectIds = clientProjectsQuery.rows.map((p: any) => p.id);
      }
      
      if (projectIds.length > 0) {
        // Fetch qualified domains from these projects (exclude disqualified)
        const domains = await db.query.bulkAnalysisDomains.findMany({
          where: and(
            inArray(bulkAnalysisDomains.projectId, projectIds),
            sql`${bulkAnalysisDomains.qualificationStatus} IN ('good_quality', 'high_quality', 'marginal_quality', 'qualified')`
          )
        });
        
        // Get website data for pricing and metrics
        const domainNames = domains.map(d => d.domain.toLowerCase());
        const websiteData = domainNames.length > 0
          ? await db.query.websites.findMany({
              where: sql`LOWER(${websites.domain}) = ANY(ARRAY[${sql.join(domainNames.map(d => sql`${d}`), sql`,`)}])`
            })
          : [];
        
        const websiteMap = new Map(websiteData.map(w => [w.domain.toLowerCase(), w]));
        
        // Format domains for display, grouped by client
        for (const clientId of clientIds) {
          const clientDomains = domains.filter(d => {
            // Find which project this domain belongs to
            const projectRow = projectsQuery.rows.find((p: any) => p.id === d.projectId);
            return projectRow?.client_id === clientId;
          });
          
          availableDomains[clientId] = clientDomains.map(domain => {
            const website = websiteMap.get(domain.domain.toLowerCase());
            const guestPostCost = website?.guestPostCost ? website.guestPostCost : 30000;
            
            // Check if this domain is already assigned to a line item
            const assignedLineItem = lineItemsData.find(li => li.assignedDomainId === domain.id);
            
            return {
              id: domain.id,
              domain: domain.domain,
              url: `https://${domain.domain}`,
              domainRating: website?.domainRating || null,
              traffic: website?.totalTraffic || null,
              categories: website?.categories || [],
              price: guestPostCost,
              wholesalePrice: guestPostCost * 0.7, // Approximate wholesale
              retailPrice: guestPostCost,
              
              // AI qualification data
              qualificationStatus: domain.qualificationStatus,
              overlapStatus: domain.overlapStatus as 'direct' | 'related' | 'both' | 'none' | undefined,
              authorityDirect: domain.authorityDirect as 'strong' | 'moderate' | 'weak' | 'n/a' | undefined,
              authorityRelated: domain.authorityRelated as 'strong' | 'moderate' | 'weak' | 'n/a' | undefined,
              topicScope: domain.topicScope as 'short_tail' | 'long_tail' | 'ultra_long_tail' | undefined,
              aiQualificationReasoning: domain.aiQualificationReasoning,
              topicReasoning: domain.topicReasoning,
              evidence: domain.evidence,
              notes: domain.notes,
              
              // Assignment status
              isAssigned: !!assignedLineItem,
              assignedToLineItemId: assignedLineItem?.id,
              inclusionStatus: assignedLineItem ? 'included' : 'excluded',
              
              // Line item specific data if assigned
              targetPageUrl: assignedLineItem?.targetPageUrl || domain.suggestedTargetUrl || '',
              anchorText: assignedLineItem?.anchorText || '',
              specialInstructions: (assignedLineItem?.metadata as any)?.specialInstructions || '',
              
              // For table display
              qualificationReasoning: domain.aiQualificationReasoning || domain.notes || '',
              topicScopeAnalysis: domain.qualificationStatus || '',
              qualityScore: website?.domainRating || 0
            };
          });
        }
      }
    }

    // Format response - convert line items to orderGroups format for compatibility
    // Each client becomes an "orderGroup" for display purposes
    const orderGroups = Object.entries(lineItemsByClient).map(([clientId, items]) => {
      const client = (items[0] as any)?.client; // Get client from first item
      return {
        id: `client-${clientId}`, // Synthetic ID for display
        clientId: clientId,
        linkCount: items.length,
        targetPages: items.map(item => item.targetPageUrl).filter(Boolean),
        client: client ? {
          id: client.id,
          name: client.name,
          website: client.website
        } : null
      };
    });
    
    // Format site submissions to match expected structure
    const siteSubmissions: Record<string, any[]> = {};
    Object.entries(availableDomains).forEach(([clientId, domains]) => {
      siteSubmissions[`client-${clientId}`] = domains;
    });
    
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
      orderGroups: orderGroups,
      lineItems: lineItemsData // Include line items with all relationships
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