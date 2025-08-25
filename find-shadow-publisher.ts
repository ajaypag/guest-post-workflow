import { db } from './lib/db/connection';
import { publishers } from './lib/db/accountSchema';
import { shadowPublisherWebsites } from './lib/db/emailProcessingSchema';
import { websites } from './lib/db/websiteSchema';
import { publisherOfferings } from './lib/db/publisherSchemaActual';
import { eq, and, sql, ne, isNull, or } from 'drizzle-orm';

async function findShadowPublisher() {
  console.log('Finding shadow publishers with multiple websites...\n');
  
  // Get all shadow publishers with their website counts
  const shadowData = await db
    .select({
      publisherId: shadowPublisherWebsites.publisherId,
      publisherEmail: publishers.email,
      status: publishers.accountStatus,
      websiteCount: sql<number>`COUNT(DISTINCT ${shadowPublisherWebsites.websiteId})`,
      domains: sql<string>`STRING_AGG(DISTINCT ${websites.domain}, ', ')`,
      migrationStatus: sql<string>`STRING_AGG(DISTINCT ${shadowPublisherWebsites.migrationStatus}, ', ')`
    })
    .from(shadowPublisherWebsites)
    .innerJoin(publishers, eq(publishers.id, shadowPublisherWebsites.publisherId))
    .innerJoin(websites, eq(websites.id, shadowPublisherWebsites.websiteId))
    .where(
      and(
        ne(publishers.email, 'info@coinlib.io'),
        ne(publishers.email, 'test-publisher@example.com'),
        ne(publishers.email, 'info@malemodelscene.net')
      )
    )
    .groupBy(shadowPublisherWebsites.publisherId, publishers.email, publishers.accountStatus)
    .having(sql`COUNT(DISTINCT ${shadowPublisherWebsites.websiteId}) >= 3`)
    .orderBy(sql`COUNT(DISTINCT ${shadowPublisherWebsites.websiteId}) DESC`)
    .limit(10);
  
  console.log('Shadow publishers with 3+ websites:');
  console.log('=' .repeat(80));
  
  for (const row of shadowData) {
    // Check if they have offerings already
    const offeringCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(publisherOfferings)
      .where(eq(publisherOfferings.publisherId, row.publisherId));
    
    console.log(`\nEmail: ${row.publisherEmail}`);
    console.log(`Publisher ID: ${row.publisherId}`);
    console.log(`Account Status: ${row.status}`);
    console.log(`Website count: ${row.websiteCount}`);
    console.log(`Existing offerings: ${offeringCount[0].count}`);
    console.log(`Migration status: ${row.migrationStatus}`);
    console.log(`Domains: ${row.domains}`);
    
    if (offeringCount[0].count === 0) {
      console.log('⭐ GOOD CANDIDATE - No offerings yet!');
    }
  }
  
  process.exit(0);
}

findShadowPublisher().catch(console.error);
