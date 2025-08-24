import { Suspense } from 'react';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, sql, desc, ilike, and } from 'drizzle-orm';
import PublishersClient from './PublishersClient';

async function getPublishers(search?: string) {
  const baseQuery = db
    .select({
      id: publishers.id,
      companyName: publishers.companyName,
      email: publishers.email,
      contactName: publishers.contactName,
      phone: publishers.phone,
      emailVerified: publishers.emailVerified,
      createdAt: publishers.createdAt,
      websiteCount: sql<number>`
        (SELECT COUNT(DISTINCT website_id) 
         FROM ${publisherOfferingRelationships} 
         WHERE publisher_id = ${publishers}.id)
      `.as('websiteCount'),
      verifiedWebsites: sql<number>`
        (SELECT COUNT(DISTINCT website_id) 
         FROM ${publisherOfferingRelationships} 
         WHERE publisher_id = ${publishers}.id
         AND verification_status = 'verified')
      `.as('verifiedWebsites'),
    })
    .from(publishers)
    .orderBy(sql`"websiteCount" DESC NULLS LAST, ${desc(publishers.createdAt)}`);

  if (search) {
    // Sanitize search input to prevent SQL injection
    const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
    const results = await baseQuery.where(
      sql`${ilike(publishers.companyName, `%${sanitizedSearch}%`)} 
           OR ${ilike(publishers.email, `%${sanitizedSearch}%`)}
           OR ${ilike(publishers.contactName, `%${sanitizedSearch}%`)}`
    );
    return results;
  }

  const results = await baseQuery;
  
  // DIAGNOSTIC: Log publishers with suspicious website counts and check data types
  results.forEach((publisher, i) => {
    if (Number(publisher.websiteCount) > 10) {
      console.log(`🔍 HIGH COUNT: ${publisher.companyName} (${publisher.email}) has ${publisher.websiteCount} websites (type: ${typeof publisher.websiteCount})`);
    }
  });
  
  const totalWebsites = results.reduce((sum, p) => sum + Number(p.websiteCount || 0), 0);
  console.log(`🔍 PUBLISHERS PAGE: ${results.length} publishers, ${totalWebsites} total websites (fixed with Number conversion)`);
  
  return results;
}

export default async function PublishersPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string }> 
}) {
  const params = await searchParams;
  const publishersList = await getPublishers(params.search);

  return (
    <PublishersClient 
      publishers={publishersList} 
      searchQuery={params.search}
    />
  );
}