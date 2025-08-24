import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { websites, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { shadowPublisherWebsites } from '@/lib/db/emailProcessingSchema';
import { sql, desc, asc, ilike, and, gte, lte, eq } from 'drizzle-orm';
import InternalWebsitesList from '@/components/internal/InternalWebsitesList';

interface SearchParams {
  search?: string;
  sort?: string;
  minDR?: string;
  maxDR?: string;
  hasPublisher?: string;
  verified?: string;
  status?: string;
  source?: string;
  page?: string;
}

export default async function InternalWebsitesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  // Await search params for Next.js 15 compatibility
  const params = await searchParams;

  // Parse search params
  const search = params.search || '';
  const sort = params.sort || 'created_desc';
  const minDR = params.minDR ? parseInt(params.minDR) : undefined;
  const maxDR = params.maxDR ? parseInt(params.maxDR) : undefined;
  const hasPublisher = params.hasPublisher;
  const verified = params.verified;
  const status = params.status;
  const source = params.source;
  const page = parseInt(params.page || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  
  if (search) {
    // Sanitize search input to prevent SQL injection
    const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
    conditions.push(ilike(websites.domain, `%${sanitizedSearch}%`));
  }
  
  if (minDR !== undefined) {
    conditions.push(gte(websites.domainRating, minDR));
  }
  
  if (maxDR !== undefined) {
    conditions.push(lte(websites.domainRating, maxDR));
  }
  
  if (verified === 'true') {
    conditions.push(sql`${websites.internalQualityScore} IS NOT NULL`);
  } else if (verified === 'false') {
    conditions.push(sql`${websites.internalQualityScore} IS NULL`);
  }
  
  if (status) {
    conditions.push(eq(websites.status, status));
  }
  
  if (source) {
    conditions.push(eq(websites.source, source));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build order by
  let orderBy;
  switch (sort) {
    case 'domain_asc':
      orderBy = asc(websites.domain);
      break;
    case 'domain_desc':
      orderBy = desc(websites.domain);
      break;
    case 'dr_asc':
      orderBy = asc(websites.domainRating);
      break;
    case 'dr_desc':
      orderBy = desc(websites.domainRating);
      break;
    case 'traffic_desc':
      orderBy = desc(websites.totalTraffic);
      break;
    case 'created_asc':
      orderBy = asc(websites.createdAt);
      break;
    default:
      orderBy = desc(websites.createdAt);
  }

  // Get websites with publisher count from BOTH offering relationships AND shadow publishers
  const websitesQuery = db
    .select({
      website: websites,
      publisherCount: sql<number>`(
        SELECT COUNT(DISTINCT publisher_id)
        FROM (
          SELECT publisher_id
          FROM ${publisherOfferingRelationships}
          WHERE website_id = websites.id
          UNION
          SELECT publisher_id
          FROM ${shadowPublisherWebsites}
          WHERE website_id = websites.id
        ) combined
      )`,
      offeringCount: sql<number>`(
        SELECT COUNT(*)
        FROM publisher_offerings po
        JOIN ${publisherOfferingRelationships} por ON po.id = por.offering_id
        WHERE por.website_id = websites.id
      )`
    })
    .from(websites)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Apply hasPublisher filter if needed (can't be in WHERE clause due to aggregation)
  let websitesList = await websitesQuery;
  
  if (hasPublisher === 'yes') {
    websitesList = websitesList.filter(w => w.publisherCount > 0);
  } else if (hasPublisher === 'no') {
    websitesList = websitesList.filter(w => w.publisherCount === 0);
  }

  // Get total count for pagination
  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(websites)
    .where(whereClause)
    .then(r => r[0].count);

  return (
    <InternalWebsitesList
      websites={websitesList}
      totalCount={totalCount}
      currentPage={page}
      itemsPerPage={limit}
      searchParams={params}
    />
  );
}