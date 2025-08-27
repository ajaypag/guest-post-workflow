import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients, targetPages } from '@/lib/db/schema';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, or, inArray, ilike, desc, asc, isNull, isNotNull, sql } from 'drizzle-orm';
import { PricingService } from '@/lib/services/pricingService';

interface SuggestionsFilters {
  clientId?: string[];
  qualificationStatus?: string[];
  available?: boolean;
  search?: string;
  minDR?: number;
  maxDR?: number;
  minTraffic?: number;
  maxTraffic?: number;
  minPrice?: number;
  maxPrice?: number;
  expandClients?: boolean;
  projectScope?: 'current_order' | 'all_projects'; // NEW: Filter by bulk analysis project scope
  sortBy?: 'domain' | 'dr' | 'traffic' | 'price' | 'qualified_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse filters - following exact vetted sites pattern
    const filters: SuggestionsFilters = {
      clientId: searchParams.get('clientId')?.split(',').filter(Boolean),
      qualificationStatus: searchParams.get('status')?.split(',').filter(Boolean) || ['high_quality', 'good_quality', 'marginal_quality'],
      available: searchParams.get('available') !== 'false', // Default to true
      search: searchParams.get('search') || undefined,
      minDR: searchParams.get('minDR') ? parseInt(searchParams.get('minDR')!) : undefined,
      maxDR: searchParams.get('maxDR') ? parseInt(searchParams.get('maxDR')!) : undefined,
      minTraffic: searchParams.get('minTraffic') ? parseInt(searchParams.get('minTraffic')!) : undefined,
      maxTraffic: searchParams.get('maxTraffic') ? parseInt(searchParams.get('maxTraffic')!) : undefined,
      minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
      expandClients: searchParams.get('expandClients') === 'true',
      projectScope: (searchParams.get('projectScope') as 'current_order' | 'all_projects') || 'all_projects', // Default to all projects
      sortBy: (searchParams.get('sortBy') as any) || 'qualified_at',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100),
    };

    // Step 1: Verify order exists and get account context
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Step 2: Account scoping security check - CRITICAL
    if (session.userType === 'account') {
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Step 3: Get order line items for context
    const lineItems = await db.query.orderLineItems.findMany({
      where: eq(orderLineItems.orderId, orderId),
      with: {
        client: true,
      }
    });

    // Extract order context for smart defaults
    const orderClients = [...new Set(lineItems.map((item: any) => item.clientId))];
    const orderTargetUrls = [...new Set(lineItems
      .map((item: any) => item.targetPageUrl)
      .filter(Boolean))];

    // Step 4: Build conditions array (same pattern as vetted sites)
    const conditions = [];
    
    // Account scoping (CRITICAL SECURITY BOUNDARY)
    if (session.userType === 'account') {
      const accountClients = [...new Set([...orderClients, ...(session.clientId ? [session.clientId] : [])])];
      if (accountClients.length > 0) {
        conditions.push(inArray(bulkAnalysisDomains.clientId, accountClients));
      }
    }
    
    // Base qualification filter
    if (filters.qualificationStatus && filters.qualificationStatus.length > 0) {
      conditions.push(inArray(bulkAnalysisDomains.qualificationStatus, filters.qualificationStatus));
    }
    
    // Availability filter
    if (filters.available) {
      conditions.push(sql`
        NOT EXISTS (
          SELECT 1 FROM ${orderLineItems}
          WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
          AND ${orderLineItems.status} != 'cancelled'
        )
      `);
    }
    
    // Client relevance filter (smart defaults)
    if (!filters.expandClients && orderClients.length > 0) {
      conditions.push(inArray(bulkAnalysisDomains.clientId, orderClients));
    }
    
    // Project scope filter - NEW: Allow filtering by bulk analysis project scope
    if (filters.projectScope === 'current_order') {
      // Find bulk analysis project(s) associated with this order's line items
      const orderProjectIds = await db
        .select({ projectId: bulkAnalysisProjects.id })
        .from(bulkAnalysisProjects)
        .where(
          sql`${bulkAnalysisProjects.name} LIKE '%Order #' || SUBSTRING(${orderId}, 1, 8) || '%'`
        );
      
      if (orderProjectIds.length > 0) {
        conditions.push(inArray(
          bulkAnalysisDomains.projectId, 
          orderProjectIds.map(p => p.projectId)
        ));
      } else {
        // If no matching project found, return empty results for current_order scope
        conditions.push(sql`FALSE`);
      }
    }
    // For 'all_projects' scope, no additional project filtering needed
    
    // Additional filters
    if (filters.search) {
      conditions.push(ilike(bulkAnalysisDomains.domain, `%${filters.search}%`));
    }
    
    if (filters.minDR !== undefined) {
      conditions.push(sql`${websites.domainRating} >= ${filters.minDR}`);
    }
    
    if (filters.maxDR !== undefined) {
      conditions.push(sql`${websites.domainRating} <= ${filters.maxDR}`);
    }
    
    if (filters.minTraffic !== undefined) {
      conditions.push(sql`${websites.totalTraffic} >= ${filters.minTraffic}`);
    }
    
    if (filters.maxTraffic !== undefined) {
      conditions.push(sql`${websites.totalTraffic} <= ${filters.maxTraffic}`);
    }

    // Step 5: Build sort configuration (exact vetted sites pattern)
    const sortColumn = {
      'domain': bulkAnalysisDomains.domain,
      'dr': websites.domainRating,  
      'traffic': websites.totalTraffic,
      'price': websites.guestPostCost,
      'qualified_at': bulkAnalysisDomains.aiQualifiedAt,
    }[filters.sortBy || 'qualified_at'] || bulkAnalysisDomains.aiQualifiedAt;

    const sortFn = filters.sortOrder === 'asc' ? asc : desc;

    // Step 6: Build and execute single query (CORRECT PATTERN)
    const suggestions = await db
      .select({
        // Domain data
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus,
        qualifiedAt: bulkAnalysisDomains.aiQualifiedAt,
        updatedAt: bulkAnalysisDomains.updatedAt,
        
        // User curation
        userBookmarked: bulkAnalysisDomains.userBookmarked,
        userHidden: bulkAnalysisDomains.userHidden,
        userBookmarkedAt: bulkAnalysisDomains.userBookmarkedAt,
        userHiddenAt: bulkAnalysisDomains.userHiddenAt,
        
        // AI analysis data - RICH DATA for informed decisions
        overlapStatus: bulkAnalysisDomains.overlapStatus,
        authorityDirect: bulkAnalysisDomains.authorityDirect,
        authorityRelated: bulkAnalysisDomains.authorityRelated,
        evidence: bulkAnalysisDomains.evidence,
        aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
        topicScope: bulkAnalysisDomains.topicScope,
        topicReasoning: bulkAnalysisDomains.topicReasoning,
        qualificationData: bulkAnalysisDomains.qualificationData,
        targetPageIds: bulkAnalysisDomains.targetPageIds,
        
        // Target URL data
        suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
        targetMatchData: bulkAnalysisDomains.targetMatchData,
        
        // Client and project info
        clientId: bulkAnalysisDomains.clientId,
        clientName: clients.name,
        projectId: bulkAnalysisDomains.projectId,
        projectName: bulkAnalysisProjects.name,
        
        // Website metrics
        websiteId: websites.id,
        domainRating: websites.domainRating,
        traffic: websites.totalTraffic,
        categories: websites.categories,
        niche: websites.niche,
        websiteType: websites.websiteType,
        overallQuality: websites.overallQuality,
        
        // Raw guestPostCost for pricing calculation
        guestPostCost: websites.guestPostCost,
        
        // Publisher performance data
        avgResponseTimeHours: websites.avgResponseTimeHours,
        successRatePercentage: websites.successRatePercentage,
        totalPostsPublished: websites.totalPostsPublished,
        lastCampaignDate: websites.lastCampaignDate,
        internalQualityScore: websites.internalQualityScore,
        
        // Availability check
        activeLineItemsCount: sql<number>`
          COALESCE((
            SELECT COUNT(*)::int
            FROM ${orderLineItems}
            WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
            AND ${orderLineItems.status} != 'cancelled'
          ), 0)
        `,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortFn(sortColumn))
      .limit(filters.limit || 50);

    // Step 7: Integrate pricing using exact same pattern as vetted sites
    const domainsWithPricing = await Promise.all(
      suggestions.map(async (domain) => {
        let retailPrice = 0;
        let wholesalePrice = 0;
        
        if (domain.domain) {
          try {
            const priceInfo = await PricingService.getDomainPrice(domain.domain);
            retailPrice = priceInfo.retailPrice;
            wholesalePrice = priceInfo.wholesalePrice;
          } catch (error) {
            console.error(`Error getting price for ${domain.domain}:`, error);
          }
        }
        
        return {
          ...domain,
          price: retailPrice,
          wholesalePrice: wholesalePrice,
          availabilityStatus: (domain.activeLineItemsCount || 0) > 0 ? 'used' : 'available',
        };
      })
    );

    // Step 8: Build response
    return NextResponse.json({
      domains: domainsWithPricing,
      totalCount: domainsWithPricing.length,
      filters: {
        availableClients: [], // TODO: Add available clients data
        currentDefaults: {
          clientIds: orderClients,
          targetUrls: orderTargetUrls,
          projectScope: filters.projectScope,
          suggestedFilters: {
            drRange: [30, 90] as [number, number],
            priceRange: [100, 1000] as [number, number],
          }
        },
        projectScopeOptions: [
          { value: 'all_projects', label: 'All Client Projects', description: 'Show domains from all bulk analysis projects for this client' },
          { value: 'current_order', label: 'This Order Only', description: 'Show only domains from bulk analysis for this specific order' }
        ]
      },
      requestMorePresets: {
        targetUrls: orderTargetUrls,
        filters: {
          clientIds: orderClients
        }
      }
    });

  } catch (error) {
    console.error('Error fetching order suggestions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}