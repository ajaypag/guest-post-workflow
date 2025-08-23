import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients, bulkAnalysisProjects, bulkAnalysisDomains, accounts, targetPages } from '@/lib/db/schema';
import { guestPostItems } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, inArray, and, or, ilike, desc, asc, isNull, sql } from 'drizzle-orm';
import VettedSitesTable from './components/VettedSitesTable';
import VettedSitesFiltersCompact from './components/VettedSitesFiltersCompact';
import VettedSitesWrapper from './VettedSitesWrapper';
import DynamicStats from './components/DynamicStats';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    clientId?: string;
    projectId?: string;
    accountId?: string;
    status?: string;
    view?: string;
    available?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

async function getInitialData(session: any, searchParams: any) {
  console.log('getInitialData - session:', { userType: session?.userType, clientIds: session?.clientIds });
  console.log('getInitialData - searchParams:', searchParams);
  
  // Ensure searchParams is an object
  const params = searchParams || {};
  
  // Get available clients and accounts for filter dropdown
  let availableClients: any[] = [];
  let availableAccounts: any[] = [];
  
  try {
    if (session.userType === 'internal') {
      // Internal users see all clients
      availableClients = await db.query.clients.findMany({
        columns: {
          id: true,
          name: true,
          accountId: true,
        },
        orderBy: (clients, { asc }) => [asc(clients.name)],
      });
      
      // Internal users see all accounts
      try {
        availableAccounts = await db
          .select({
            id: accounts.id,
            name: accounts.contactName,
            email: accounts.email,
          })
          .from(accounts)
          .orderBy(asc(accounts.contactName));
        console.log('🟢 Successfully fetched accounts:', availableAccounts.length);
      } catch (accountError) {
        console.error('🔴 Error fetching accounts:', accountError);
        availableAccounts = []; // Fallback to empty array
      }
    } else if (session.userType === 'account') {
      // Account users see clients associated with their account
      availableClients = await db.query.clients.findMany({
        where: eq(clients.accountId, session.userId),
        columns: {
          id: true,
          name: true,
          accountId: true,
        },
        orderBy: (clients, { asc }) => [asc(clients.name)],
      });
    }
    console.log('Available clients:', availableClients.length, 'accounts:', availableAccounts.length, 'for userType:', session.userType);
    console.log('Sample accounts:', availableAccounts.slice(0, 2));
  } catch (err) {
    console.error('Error fetching clients/accounts:', err);
  }

  // Get available projects for filter
  let availableProjects: any[] = [];
  
  try {
    // Get all projects the user has access to
    if (session.userType === 'internal') {
      // Internal users see all projects
      availableProjects = await db.query.bulkAnalysisProjects.findMany({
        columns: {
          id: true,
          name: true,
          clientId: true,
        },
        orderBy: (projects, { asc }) => [asc(projects.name)],
      });
    } else if (session.userType === 'account' && availableClients.length > 0) {
      // Account users see projects for their clients
      const clientIds = availableClients.map(c => c.id);
      availableProjects = await db.query.bulkAnalysisProjects.findMany({
        where: inArray(bulkAnalysisProjects.clientId, clientIds),
        columns: {
          id: true,
          name: true,
          clientId: true,
        },
        orderBy: (projects, { asc }) => [asc(projects.name)],
      });
    }
    console.log('Available projects:', availableProjects.length, 'for userType:', session.userType);
  } catch (err) {
    console.error('Error fetching projects:', err);
  }

  // Parse filters with defaults (handle undefined searchParams)
  console.log('Parsing filters from searchParams:', params);
  
  const filters = {
    clientId: params.clientId ? params.clientId.split(',').filter(Boolean) : undefined,
    projectId: params.projectId,
    accountId: params.accountId ? params.accountId.split(',').filter(Boolean) : undefined,
    status: params.status ? params.status.split(',').filter(Boolean) : ['high_quality', 'good_quality'],
    view: params.view || 'all',
    search: params.search,
    page: parseInt(params.page || '1'),
    limit: Math.min(parseInt(params.limit || '50'), 100),
    sortBy: params.sortBy || 'updated_at',
    sortOrder: params.sortOrder || 'desc',
  };
  console.log('Parsed filters:', filters);

  try {
    // Build query
    let query = db
      .select({
        // Basic domain info
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
        
        // AI Qualification Intelligence - RICH DATA
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
        
        // Target URL Matching Intelligence
        suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
        targetMatchData: bulkAnalysisDomains.targetMatchData,
        targetMatchedAt: bulkAnalysisDomains.targetMatchedAt,
        
        // Data quality indicators
        hasDataForSeoResults: bulkAnalysisDomains.hasDataForSeoResults,
        dataForSeoResultsCount: bulkAnalysisDomains.dataForSeoResultsCount,
        wasManuallyQualified: bulkAnalysisDomains.wasManuallyQualified,
        wasHumanVerified: bulkAnalysisDomains.wasHumanVerified,
        
        // Project context
        clientId: bulkAnalysisDomains.clientId,
        clientName: clients.name,
        projectId: bulkAnalysisDomains.projectId,
        projectName: bulkAnalysisProjects.name,
        
        // Account context
        accountId: clients.accountId,
        // accountName: accounts.name,
        // accountEmail: accounts.email,
        
        // Website metrics
        websiteId: websites.id,
        domainRating: websites.domainRating,
        traffic: websites.totalTraffic,
        categories: websites.categories,
        niche: websites.niche,
        websiteType: websites.websiteType,
        overallQuality: websites.overallQuality,
        
        // Pricing - wholesale cost from website
        guestPostCost: websites.guestPostCost,
        
        // Publisher performance - RICH DATA
        avgResponseTimeHours: websites.avgResponseTimeHours,
        successRatePercentage: websites.successRatePercentage,
        totalPostsPublished: websites.totalPostsPublished,
        lastCampaignDate: websites.lastCampaignDate,
        internalQualityScore: websites.internalQualityScore,
        
        // Vetting context - target pages used for qualification
        targetPageIds: bulkAnalysisDomains.targetPageIds,
        
        // Calculate active line items using this domain
        activeLineItemsCount: sql<number>`(\n          SELECT COUNT(*)::int \n          FROM ${orderLineItems} \n          WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain} \n          AND ${orderLineItems.status} IN ('approved', 'in_progress', 'delivered')\n        )`
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(accounts, eq(clients.accountId, accounts.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain));

    // Apply filters
    const conditions = [];
    
    // Permission filters
    if (session.userType === 'account') {
      // Account users can only see domains for clients associated with their account
      // Get all client IDs for this account
      const accountClients = await db.query.clients.findMany({
        where: eq(clients.accountId, session.userId),
        columns: {
          id: true,
        },
      });
      
      const accountClientIds = accountClients.map(c => c.id);
      
      if (accountClientIds.length === 0) {
        console.log('Account user has no clients associated');
        return {
          domains: [],
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
          stats: { 
        totalQualified: 0, 
        available: 0, 
        used: 0, 
        bookmarked: 0, 
        hidden: 0,
        breakdown: {
          highQuality: 0,
          goodQuality: 0,
          marginal: 0,
          disqualified: 0,
        },
      },
          availableClients,
          availableAccounts,
          availableProjects,
        };
      }
      
      conditions.push(inArray(bulkAnalysisDomains.clientId, accountClientIds));
      console.log('Filtering domains for account clientIds:', accountClientIds);
    }

    // Other filters
    if (filters.clientId && filters.clientId.length > 0) {
      conditions.push(inArray(bulkAnalysisDomains.clientId, filters.clientId));
    }
    if (filters.accountId && filters.accountId.length > 0) {
      conditions.push(inArray(clients.accountId, filters.accountId));
    }
    if (filters.projectId) {
      conditions.push(eq(bulkAnalysisDomains.projectId, filters.projectId));
    }
    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(bulkAnalysisDomains.qualificationStatus, filters.status));
    }
    if (filters.view === 'bookmarked') {
      conditions.push(eq(bulkAnalysisDomains.userBookmarked, true));
    } else if (filters.view === 'hidden') {
      conditions.push(eq(bulkAnalysisDomains.userHidden, true));
    } else if (filters.view === 'all') {
      conditions.push(or(
        eq(bulkAnalysisDomains.userHidden, false),
        isNull(bulkAnalysisDomains.userHidden)
      ));
    }
    if (filters.search) {
      conditions.push(ilike(bulkAnalysisDomains.domain, `%${filters.search}%`));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Apply sorting
    const sortColumn = ({
      'domain': bulkAnalysisDomains.domain,
      'dr': websites.domainRating,
      'traffic': websites.totalTraffic,
      'price': websites.guestPostCost,
      'qualified_at': bulkAnalysisDomains.aiQualifiedAt,
      'updated_at': bulkAnalysisDomains.updatedAt,
    } as any)[filters.sortBy] || bulkAnalysisDomains.updatedAt;

    const sortFn = filters.sortOrder === 'asc' ? asc : desc;
    query = query.orderBy(sortFn(sortColumn)) as typeof query;

    // Get total count
    const totalCountQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(accounts, eq(clients.accountId, accounts.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalCountQuery[0]?.count || 0;

    // Apply pagination
    const offset = (filters.page - 1) * filters.limit;
    query = query.limit(filters.limit).offset(offset) as typeof query;

    // Execute query
    const domains = await query;

    // Calculate stats - dynamic based on current filters
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
        
        // User curation stats
        bookmarked: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userBookmarked} = true)::int`,
        hidden: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userHidden} = true)::int`,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(accounts, eq(clients.accountId, accounts.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const stats = statsQuery[0] || {};

    // Fetch target pages for all domains
    const domainTargetPages = new Map();
    if (Array.isArray(domains)) {
      for (const domain of domains) {
        if (domain?.targetPageIds && Array.isArray(domain.targetPageIds) && domain.targetPageIds.length > 0) {
          try {
            const pages = await db.query.targetPages.findMany({
              where: inArray(targetPages.id, domain.targetPageIds as string[]),
              columns: {
                id: true,
                url: true,
                keywords: true,
                description: true,
              }
            });
            domainTargetPages.set(domain.id, pages);
          } catch (pageError) {
            console.error(`Error fetching target pages for domain ${domain.id}:`, pageError);
          }
        }
      }
    }

    return {
      domains: Array.isArray(domains) ? domains.map(domain => ({
        ...domain,
        qualifiedAt: domain.qualifiedAt ? domain.qualifiedAt.toISOString() : null,
        updatedAt: domain.updatedAt ? domain.updatedAt.toISOString() : new Date().toISOString(),
        userBookmarked: domain.userBookmarked || false,
        userHidden: domain.userHidden || false,
        userBookmarkedAt: domain.userBookmarkedAt ? domain.userBookmarkedAt.toISOString() : null,
        userHiddenAt: domain.userHiddenAt ? domain.userHiddenAt.toISOString() : null,
        targetMatchedAt: domain.targetMatchedAt ? domain.targetMatchedAt.toISOString() : null,
        clientName: domain.clientName || 'Unknown Client',
        successRatePercentage: domain.successRatePercentage ? parseFloat(domain.successRatePercentage) : null,
        lastCampaignDate: domain.lastCampaignDate ? domain.lastCampaignDate.toISOString() : null,
        linkInsertionPrice: null, // Not available in current schema
        availabilityStatus: (domain?.activeLineItemsCount || 0) > 0 ? 'used' as const : 'available' as const,
        evidence: domain?.evidence ? {
          directCount: (domain.evidence as any)?.direct_count || 0,
          directMedianPosition: (domain.evidence as any)?.direct_median_position || null,
          relatedCount: (domain.evidence as any)?.related_count || 0,
          relatedMedianPosition: (domain.evidence as any)?.related_median_position || null,
        } : null,
        targetPages: domainTargetPages.get(domain?.id) || [],
      })) : [],
      total: total || 0,
      page: filters.page || 1,
      limit: filters.limit || 50,
      totalPages: Math.ceil((total || 0) / (filters.limit || 50)),
      stats: {
        totalQualified: stats?.totalInView || 0,
        available: stats?.availableInView || 0,
        used: stats?.inUseFromView || 0,
        bookmarked: stats?.bookmarked || 0,
        hidden: stats?.hidden || 0,
        breakdown: {
          highQuality: stats?.highQuality || 0,
          goodQuality: stats?.goodQuality || 0,
          marginal: stats?.marginal || 0,
          disqualified: stats?.disqualified || 0,
        },
      },
      availableClients: Array.isArray(availableClients) ? availableClients : [],
      availableAccounts: Array.isArray(availableAccounts) ? availableAccounts : [],
      availableProjects: Array.isArray(availableProjects) ? availableProjects : [],
    };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    console.error('Error stack:', (error as any).stack);
    return {
      domains: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      stats: { 
        totalQualified: 0, 
        available: 0, 
        used: 0, 
        bookmarked: 0, 
        hidden: 0,
        breakdown: {
          highQuality: 0,
          goodQuality: 0,
          marginal: 0,
          disqualified: 0,
        },
      },
      availableClients: Array.isArray(availableClients) ? availableClients : [],
      availableAccounts: Array.isArray(availableAccounts) ? availableAccounts : [],
      availableProjects: Array.isArray(availableProjects) ? availableProjects : [],
    };
  }
}

export default async function VettedSitesPage({ searchParams: searchParamsPromise }: PageProps) {
  const session = await AuthServiceServer.getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Await searchParams as required in Next.js 15
  const searchParams = await searchParamsPromise;
  console.log('VettedSites - searchParams:', searchParams);

  // Account users can now see all their associated clients, no need for redirect

  const initialData = await getInitialData(session, searchParams);

  // Wrap content in appropriate layout based on user type
  const content = (
    <div className="container mx-auto px-4 py-6 pb-32 max-w-none xl:max-w-[1600px] 2xl:max-w-[1920px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vetted Sites</h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse and manage your qualified domain inventory
            </p>
          </div>
          
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Filters Sidebar */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-2">
          <div className="sticky top-4">
            <Suspense fallback={
              <div className="bg-white rounded-lg border p-4">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            }>
              <VettedSitesFiltersCompact 
                availableClients={initialData.availableClients}
                availableAccounts={initialData.availableAccounts}
                availableProjects={initialData.availableProjects}
                currentFilters={searchParams}
                userType={session.userType}
              />
            </Suspense>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-9 xl:col-span-10">
          <div className="space-y-6">
            <DynamicStats 
              initialStats={initialData.stats} 
              total={initialData.total} 
            />
            
            <Suspense fallback={
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <div className="animate-pulse flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="animate-pulse space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            }>
              <VettedSitesTable
                initialData={initialData}
                initialFilters={searchParams}
                userType={session.userType}
              />
            </Suspense>
          </div>
        </div>
      </div>

    </div>
  );

  // Return with wrapper like orders page
  return (
    <VettedSitesWrapper>
      {content}
    </VettedSitesWrapper>
  );
}