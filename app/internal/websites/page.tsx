import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { websites, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { sql, desc, asc, ilike, and, gte, lte, eq } from 'drizzle-orm';
import InternalWebsitesList from '@/components/internal/InternalWebsitesList';

interface SearchParams {
  search?: string;
  sort?: string;
  minDR?: string;
  maxDR?: string;
  hasPublisher?: string;
  verified?: string;
  page?: string;
}

export default async function InternalWebsitesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  // Parse search params
  const search = searchParams.search || '';
  const sort = searchParams.sort || 'created_desc';
  const minDR = searchParams.minDR ? parseInt(searchParams.minDR) : undefined;
  const maxDR = searchParams.maxDR ? parseInt(searchParams.maxDR) : undefined;
  const hasPublisher = searchParams.hasPublisher;
  const verified = searchParams.verified;
  const page = parseInt(searchParams.page || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  
  if (search) {
    conditions.push(ilike(websites.domain, `%${search}%`));
  }
  
  if (minDR !== undefined) {
    conditions.push(gte(websites.domainRating, minDR));
  }
  
  if (maxDR !== undefined) {
    conditions.push(lte(websites.domainRating, maxDR));
  }
  
  if (verified === 'true') {
    conditions.push(eq(websites.qualityVerified, true));
  } else if (verified === 'false') {
    conditions.push(eq(websites.qualityVerified, false));
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

  // Get websites with publisher count
  const websitesQuery = db
    .select({
      website: websites,
      publisherCount: sql<number>`(
        SELECT COUNT(DISTINCT por.publisher_id)
        FROM ${publisherOfferingRelationships} por
        WHERE por.website_id = ${websites.id}
      )`,
      offeringCount: sql<number>`(
        SELECT COUNT(*)
        FROM publisher_offerings po
        JOIN ${publisherOfferingRelationships} por ON po.publisher_relationship_id = por.id
        WHERE por.website_id = ${websites.id}
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
      searchParams={searchParams}
    />
  );
}