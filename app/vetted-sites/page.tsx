import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients, bulkAnalysisProjects, bulkAnalysisDomains, accounts } from '@/lib/db/schema';
import { guestPostItems } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, inArray, and, or, ilike, desc, asc, isNull, sql } from 'drizzle-orm';
import VettedSitesTable from './components/VettedSitesTable';
import VettedSitesFilters from './components/VettedSitesFilters';
import VettedSitesWrapper from './VettedSitesWrapper';

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
        },
        orderBy: (clients, { asc }) => [asc(clients.name)],
      });
    }
    console.log('Available clients:', availableClients.length, 'accounts:', availableAccounts.length, 'for userType:', session.userType);
    console.log('Sample accounts:', availableAccounts.slice(0, 2));
  } catch (err) {
    console.error('Error fetching clients/accounts:', err);
  }

  // Get available projects for filter (if client is selected)
  let availableProjects: any[] = [];
  const selectedClientIds = params.clientId ? params.clientId.split(',') : [];
  
  if (selectedClientIds.length > 0) {
    availableProjects = await db.query.bulkAnalysisProjects.findMany({
      where: inArray(bulkAnalysisProjects.clientId, selectedClientIds),
      columns: {
        id: true,
        name: true,
        clientId: true,
      },
      orderBy: (projects, { asc }) => [asc(projects.name)],
    });
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
        
        // Publishing capabilities - RICH DATA
        hasGuestPost: websites.hasGuestPost,
        hasLinkInsert: websites.hasLinkInsert,
        guestPostPrice: websites.guestPostCost,
        publisherTier: websites.publisherTier,
        typicalTurnaroundDays: websites.typicalTurnaroundDays,
        acceptsDoFollow: websites.acceptsDoFollow,
        maxLinksPerPost: websites.maxLinksPerPost,
        publishedOpportunities: websites.publishedOpportunities,
        
        // Publisher performance - RICH DATA
        avgResponseTimeHours: websites.avgResponseTimeHours,
        successRatePercentage: websites.successRatePercentage,
        totalPostsPublished: websites.totalPostsPublished,
        lastCampaignDate: websites.lastCampaignDate,
        internalQualityScore: websites.internalQualityScore,
        
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
          stats: { totalQualified: 0, available: 0, used: 0, bookmarked: 0, hidden: 0 },
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
    query = query.limit(filters.limit).offset(offset);

    // Execute query
    const domains = await query;

    // Calculate stats
    const statsQuery = await db
      .select({
        totalQualified: sql<number>`COUNT(*)::int`,
        // Temporarily comment out to debug
        // available: sql<number>`
        //   COUNT(*) FILTER (
        //     WHERE NOT EXISTS (
        //       SELECT 1 FROM ${guestPostItems}
        //       WHERE ${guestPostItems.domain} = ${bulkAnalysisDomains.domain}
        //       AND ${guestPostItems.status} != 'cancelled'
        //     )
        //   )::int
        // `,
        available: sql<number>`COUNT(*)::int`,
        bookmarked: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userBookmarked} = true)::int`,
        hidden: sql<number>`COUNT(*) FILTER (WHERE ${bulkAnalysisDomains.userHidden} = true)::int`,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(accounts, eq(clients.accountId, accounts.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const stats = statsQuery[0] || { totalQualified: 0, available: 0, bookmarked: 0, hidden: 0 };

    return {
      domains: domains.map(domain => ({
        ...domain,
        linkInsertionPrice: null, // Not available in current schema
        availabilityStatus: domain.activeLineItemsCount > 0 ? 'used' : 'available',
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
      availableClients,
      availableAccounts,
      availableProjects,
    };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    console.error('Error stack:', (error as any).stack);
    return {
      domains: [],
      total: 0,
      stats: { totalQualified: 0, available: 0, used: 0, bookmarked: 0, hidden: 0 },
      availableClients,
      availableAccounts,
      availableProjects,
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
    <div className="container mx-auto px-4 py-6 max-w-none xl:max-w-[1600px] 2xl:max-w-[1920px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vetted Sites</h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse and manage your qualified domain inventory
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{initialData.stats.totalQualified}</div>
              <div className="text-gray-500">Qualified</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{initialData.stats.available}</div>
              <div className="text-gray-500">Available</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-600">{initialData.stats.used}</div>
              <div className="text-gray-500">In Use</div>
            </div>
            {initialData.stats.bookmarked > 0 && (
              <div className="text-center">
                <div className="font-semibold text-blue-600">{initialData.stats.bookmarked}</div>
                <div className="text-gray-500">Bookmarked</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Filters Sidebar */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-2">
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
            <VettedSitesFilters 
              availableClients={initialData.availableClients}
              availableAccounts={initialData.availableAccounts}
              availableProjects={initialData.availableProjects}
              currentFilters={searchParams}
              userType={session.userType}
            />
          </Suspense>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-9 xl:col-span-10">
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

      {/* Mobile Stats - shown on small screens */}
      <div className="md:hidden mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="font-semibold text-gray-900">{initialData.stats.totalQualified}</div>
          <div className="text-xs text-gray-500">Qualified</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="font-semibold text-green-600">{initialData.stats.available}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
        {initialData.stats.used > 0 && (
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="font-semibold text-yellow-600">{initialData.stats.used}</div>
            <div className="text-xs text-gray-500">In Use</div>
          </div>
        )}
        {initialData.stats.bookmarked > 0 && (
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="font-semibold text-blue-600">{initialData.stats.bookmarked}</div>
            <div className="text-xs text-gray-500">Bookmarked</div>
          </div>
        )}
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