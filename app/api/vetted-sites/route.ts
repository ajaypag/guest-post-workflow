import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients, targetPages } from '@/lib/db/schema';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { eq, and, or, inArray, ilike, desc, asc, isNull, isNotNull, sql } from 'drizzle-orm';
import { PricingService } from '@/lib/services/pricingService';

interface VettedSitesFilters {
  clientId?: string[];
  projectId?: string;
  qualificationStatus?: string[];
  view?: 'all' | 'bookmarked' | 'hidden';
  available: boolean;  // Always has a value (defaults to true)
  search?: string;
  targetUrls?: string[];
  minDR?: number;
  maxDR?: number;
  minTraffic?: number;
  maxTraffic?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'domain' | 'dr' | 'traffic' | 'price' | 'qualified_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: VettedSitesFilters = {
      clientId: searchParams.get('clientId')?.split(',').filter(Boolean),
      projectId: searchParams.get('projectId') || undefined,
      qualificationStatus: searchParams.get('status')?.split(',').filter(Boolean) || ['high_quality', 'good_quality'],
      view: (searchParams.get('view') as any) || 'all',
      available: searchParams.get('available') === 'false' ? false : true,  // Default to true
      search: searchParams.get('search') || undefined,
      targetUrls: searchParams.get('targetUrls')?.split(',').filter(Boolean),
      minDR: searchParams.get('minDR') ? parseInt(searchParams.get('minDR')!) : undefined,
      maxDR: searchParams.get('maxDR') ? parseInt(searchParams.get('maxDR')!) : undefined,
      minTraffic: searchParams.get('minTraffic') ? parseInt(searchParams.get('minTraffic')!) : undefined,
      maxTraffic: searchParams.get('maxTraffic') ? parseInt(searchParams.get('maxTraffic')!) : undefined,
      minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'updated_at',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100), // Max 100 per page
    };

    // Build the base query with joins
    let query = db
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
        
        // AI analysis data
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
        
        // Website metrics (from websites table)
        websiteId: websites.id,
        domainRating: websites.domainRating,
        traffic: websites.totalTraffic,
        categories: websites.categories,
        
        // Raw guestPostCost for pricing service calculation
        guestPostCost: websites.guestPostCost,
        
        // Availability check (count of active line items using this domain)
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
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain));

    // Apply filters
    const conditions = [];
    
    // Apply permission filters based on user type
    if (session.userType === 'account') {
      // Account users can only see domains from their clients
      const userClientIds = session.clientId ? [session.clientId] : [];
      if (userClientIds.length === 0) {
        return NextResponse.json({ domains: [], total: 0, stats: {} });
      }
      conditions.push(inArray(bulkAnalysisDomains.clientId, userClientIds));
    }
    // Internal users can see all domains - no filter needed

    // Client filter
    if (filters.clientId && filters.clientId.length > 0) {
      conditions.push(inArray(bulkAnalysisDomains.clientId, filters.clientId));
    }

    // Project filter
    if (filters.projectId) {
      conditions.push(eq(bulkAnalysisDomains.projectId, filters.projectId));
    }

    // Qualification status filter
    if (filters.qualificationStatus && filters.qualificationStatus.length > 0) {
      conditions.push(inArray(bulkAnalysisDomains.qualificationStatus, filters.qualificationStatus));
    }

    // User curation view filter
    if (filters.view === 'bookmarked') {
      conditions.push(eq(bulkAnalysisDomains.userBookmarked, true));
    } else if (filters.view === 'hidden') {
      conditions.push(eq(bulkAnalysisDomains.userHidden, true));
    } else if (filters.view === 'all') {
      // Show all except hidden by default
      conditions.push(or(
        eq(bulkAnalysisDomains.userHidden, false),
        isNull(bulkAnalysisDomains.userHidden)
      ));
    }

    // Search filter
    if (filters.search) {
      conditions.push(ilike(bulkAnalysisDomains.domain, `%${filters.search}%`));
    }

    // Target URLs filter
    if (filters.targetUrls && filters.targetUrls.length > 0) {
      // Filter domains that have these target URLs in their targetPageIds OR suggestedTargetUrl
      const targetUrlConditions = filters.targetUrls.map(url => {
        // Check both original target pages and AI suggested targets
        return or(
          // Check if this URL exists in the targetPageIds array (original vetting targets)
          sql`EXISTS (
            SELECT 1 FROM ${targetPages}
            WHERE ${bulkAnalysisDomains.targetPageIds}::jsonb ? ${targetPages.id}::text
            AND ${targetPages.url} = ${url}
          )`,
          // Check if this URL matches the AI suggested target
          eq(bulkAnalysisDomains.suggestedTargetUrl, url),
          // Check if this URL is contained within the AI analysis data
          sql`${bulkAnalysisDomains.targetMatchData}->>'target_analysis' LIKE '%' || ${url} || '%'`
        );
      });
      
      // At least one of the target URLs must match
      conditions.push(or(...targetUrlConditions));
    }

    // Metrics filters
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
    // Price filters need to account for the +$79 markup
    if (filters.minPrice !== undefined) {
      // Convert retail price back to wholesale for database filtering
      const minWholesale = Math.max(0, filters.minPrice - 79);
      conditions.push(sql`COALESCE(${websites.guestPostCost}, 0) >= ${minWholesale}`);
    }
    if (filters.maxPrice !== undefined) {
      // Convert retail price back to wholesale for database filtering  
      const maxWholesale = Math.max(0, filters.maxPrice - 79);
      conditions.push(sql`COALESCE(${websites.guestPostCost}, 0) <= ${maxWholesale}`);
    }

    // Availability filter
    if (filters.available === true) {
      // Only show domains not currently in active orders
      conditions.push(sql`
        NOT EXISTS (
          SELECT 1 FROM ${orderLineItems}
          WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
          AND ${orderLineItems.status} != 'cancelled'
        )
      `);
    }

    // Apply all conditions
    console.log(`Total conditions to apply: ${conditions.length}`);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Apply sorting
    const sortColumn = {
      'domain': bulkAnalysisDomains.domain,
      'dr': websites.domainRating,
      'traffic': websites.totalTraffic,
      'price': websites.guestPostCost, // Sorting by wholesale price since retail will be +$79 for all
      'qualified_at': bulkAnalysisDomains.aiQualifiedAt,
      'updated_at': bulkAnalysisDomains.updatedAt,
    }[filters.sortBy || 'updated_at'] || bulkAnalysisDomains.updatedAt;

    if (sortColumn) {
      const sortFn = filters.sortOrder === 'asc' ? asc : desc;
      query = query.orderBy(sortFn(sortColumn)) as typeof query;
    }

    // Get total count for pagination (before applying limit/offset)
    const totalCountQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalCountQuery[0]?.count || 0;

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    console.log(`Pagination: page ${page}, limit ${limit}, offset ${offset}`);
    query = query.limit(limit).offset(offset) as typeof query;

    // Execute the query
    console.log('About to execute main query...');
    let domains;
    try {
      domains = await query;
      console.log(`Found ${domains.length} domains for page ${filters.page}`);
    } catch (queryError) {
      console.error('Query execution error:', queryError);
      throw queryError;
    }

    // Calculate summary stats - dynamic based on current filters
    const statsQuery = await db
      .select({
        // Total in current view (respects all filters)
        totalInView: sql<number>`COUNT(*)::int`,
        
        // Available in current view (not hidden, not in use)
        availableInView: sql<number>`
          COUNT(*) FILTER (
            WHERE ${bulkAnalysisDomains.userHidden} != true
            AND NOT EXISTS (
              SELECT 1 FROM ${orderLineItems}
              WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
              AND ${orderLineItems.status} != 'cancelled'
            )
          )::int
        `,
        
        // In use from current view
        inUseFromView: sql<number>`
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM ${orderLineItems}
              WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
              AND ${orderLineItems.status} != 'cancelled'
            )
          )::int
        `,
        
        // Quality breakdown of current view
        highQuality: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.qualificationStatus} = 'high_quality')::int`,
        goodQuality: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.qualificationStatus} = 'good_quality')::int`,
        marginal: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.qualificationStatus} = 'marginal')::int`,
        disqualified: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.qualificationStatus} = 'disqualified')::int`,
        
        // User curation stats (always show these)
        bookmarked: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userBookmarked} = true)::int`,
        hidden: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userHidden} = true)::int`,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const stats = statsQuery[0] || {};

    // Fetch target pages for domains that have targetPageIds
    const domainsWithTargetPageIds = domains.filter(domain => 
      domain?.targetPageIds && Array.isArray(domain.targetPageIds) && domain.targetPageIds.length > 0
    );

    let targetPagesMap: Record<string, any[]> = {};
    
    if (domainsWithTargetPageIds.length > 0) {
      try {
        // Get all unique target page IDs
        const allTargetPageIds = Array.from(new Set(
          domainsWithTargetPageIds.flatMap(domain => domain.targetPageIds as string[])
        ));

        if (allTargetPageIds.length > 0) {
          // Fetch target pages data
          const targetPagesData = await db
            .select({
              id: targetPages.id,
              url: targetPages.url,
              keywords: targetPages.keywords,
              description: targetPages.description,
            })
            .from(targetPages)
            .where(inArray(targetPages.id, allTargetPageIds));

          // Create lookup map for easy access
          const targetPagesLookup = new Map(
            targetPagesData.map(tp => [tp.id, tp])
          );

          // Build target pages map by domain ID
          domainsWithTargetPageIds.forEach(domain => {
            if (domain.targetPageIds) {
              targetPagesMap[domain.id] = (domain.targetPageIds as string[])
                .map(id => targetPagesLookup.get(id))
                .filter(Boolean); // Remove any null/undefined entries
            }
          });
        }
      } catch (error) {
        console.error('Error fetching target pages:', error);
        // Continue without target pages data if there's an error
      }
    }

    // Calculate proper retail pricing using PricingService for all domains
    console.log('🔍 DEBUG: About to calculate prices for domains...');
    const domainsWithPricing = await Promise.all(
      (Array.isArray(domains) ? domains : []).map(async (domain) => {
        if (!domain) {
          console.error('Null domain in results');
          return null;
        }

        // Use PricingService to get proper retail price (guestPostCost + $79)
        let retailPrice = 0;
        let wholesalePrice = 0;
        
        if (domain.domain) {
          try {
            const priceInfo = await PricingService.getDomainPrice(domain.domain);
            retailPrice = priceInfo.retailPrice;
            wholesalePrice = priceInfo.wholesalePrice;
            console.log(`💰 DEBUG: ${domain.domain} - wholesale: $${wholesalePrice}, retail: $${retailPrice}, found: ${priceInfo.found}`);
          } catch (error) {
            console.error(`Error getting price for ${domain.domain}:`, error);
          }
        }

        return {
          ...domain,
          // Use calculated retail price instead of raw guestPostCost
          price: retailPrice,
          wholesalePrice: wholesalePrice,
          // Calculate availability status
          availabilityStatus: (domain.activeLineItemsCount || 0) > 0 ? 'used' : 'available',
          // Format evidence data if it exists
          evidence: domain.evidence ? {
            directCount: (domain.evidence as any)?.direct_count || 0,
            directMedianPosition: (domain.evidence as any)?.direct_median_position || null,
            relatedCount: (domain.evidence as any)?.related_count || 0,
            relatedMedianPosition: (domain.evidence as any)?.related_median_position || null,
          } : null,
          // Include target pages data
          targetPages: targetPagesMap[domain.id] || [],
          // Add original vetted target URL (first target page URL if no AI suggestion)
          originalTargetUrl: targetPagesMap[domain.id]?.[0]?.url || null,
        };
      })
    );

    return NextResponse.json({
      domains: domainsWithPricing.filter(Boolean),
      total: total || 0,
      page: page || 1,
      limit: limit || 50,
      totalPages: Math.ceil((total || 0) / (limit || 50)),
      stats: {
        // Dynamic stats based on current filter view
        totalQualified: stats?.totalInView || 0,  // Total matching current filters
        available: stats?.availableInView || 0,   // Available from current view
        used: stats?.inUseFromView || 0,          // In use from current view
        bookmarked: stats?.bookmarked || 0,
        hidden: stats?.hidden || 0,
        
        // Quality breakdown for context
        breakdown: {
          highQuality: stats?.highQuality || 0,
          goodQuality: stats?.goodQuality || 0,
          marginal: stats?.marginal || 0,
          disqualified: stats?.disqualified || 0,
        },
      },
    });

  } catch (error: any) {
    console.error('Vetted Sites API Error:', error);
    console.error('Stack trace:', error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}