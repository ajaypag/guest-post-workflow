import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains, clients, bulkAnalysisProjects } from '@/lib/db/schema';
import { websites } from '@/lib/db/websiteSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { eq, and, or, inArray, ilike, desc, asc, isNull, isNotNull, sql } from 'drizzle-orm';

interface VettedSitesFilters {
  clientId?: string[];
  projectId?: string;
  qualificationStatus?: string[];
  view?: 'all' | 'bookmarked' | 'hidden';
  available?: boolean;
  search?: string;
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
      available: searchParams.get('available') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
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
        
        // Target URL data
        suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
        
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
        
        // Pricing from websites
        guestPostPrice: websites.guestPostCost,
        // linkInsertionPrice doesn't exist in websites schema
        
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
    if (filters.minPrice !== undefined) {
      conditions.push(sql`COALESCE(${websites.guestPostCost}, 0) >= ${filters.minPrice}`);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(sql`COALESCE(${websites.guestPostCost}, 0) <= ${filters.maxPrice}`);
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
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = {
      'domain': bulkAnalysisDomains.domain,
      'dr': websites.domainRating,
      'traffic': websites.totalTraffic,
      'price': websites.guestPostCost,
      'qualified_at': bulkAnalysisDomains.aiQualifiedAt,
      'updated_at': bulkAnalysisDomains.updatedAt,
    }[filters.sortBy] || bulkAnalysisDomains.updatedAt;

    const sortFn = filters.sortOrder === 'asc' ? asc : desc;
    query = query.orderBy(sortFn(sortColumn));

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
    const offset = (filters.page - 1) * filters.limit;
    query = query.limit(filters.limit).offset(offset);

    // Execute the query
    const domains = await query;

    // Calculate summary stats
    const statsQuery = await db
      .select({
        totalQualified: sql<number>`COUNT(*)::int`,
        available: sql<number>`
          COUNT(*) FILTER (
            WHERE NOT EXISTS (
              SELECT 1 FROM ${orderLineItems}
              WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
              AND ${orderLineItems.status} != 'cancelled'
            )
          )::int
        `,
        bookmarked: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userBookmarked} = true)::int`,
        hidden: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userHidden} = true)::int`,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const stats = statsQuery[0] || { totalQualified: 0, available: 0, bookmarked: 0, hidden: 0 };

    return NextResponse.json({
      domains: domains.map(domain => ({
        ...domain,
        // Calculate availability status
        availabilityStatus: domain.activeLineItemsCount > 0 ? 'used' : 'available',
        // Format evidence data if it exists
        evidence: domain.evidence ? {
          directCount: (domain.evidence as any)?.direct_count || 0,
          directMedianPosition: (domain.evidence as any)?.direct_median_position || null,
          relatedCount: (domain.evidence as any)?.related_count || 0,
          relatedMedianPosition: (domain.evidence as any)?.related_median_position || null,
        } : null,
      })),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      stats: {
        totalQualified: stats.totalQualified,
        available: stats.available,
        used: stats.totalQualified - stats.available,
        bookmarked: stats.bookmarked,
        hidden: stats.hidden,
      },
    });

  } catch (error) {
    console.error('Vetted Sites API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}