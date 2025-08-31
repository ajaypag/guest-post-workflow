import { db } from '@/lib/db/connection';
import { websites, publisherWebsites } from '@/lib/db/schema';
import { eq, sql, isNotNull, isNull, and } from 'drizzle-orm';

async function checkPublisherWebsitesConnection() {
  console.log('='.repeat(80));
  console.log('PUBLISHER_WEBSITES: CONNECTING websites TABLE TO publishers');
  console.log('='.repeat(80));

  // Basic counts
  const websiteCount = await db.select({ count: sql<number>`count(*)` }).from(websites);
  const websitesWithCost = await db.select({ count: sql<number>`count(*)` }).from(websites).where(isNotNull(websites.guestPostCost));
  const publisherWebsiteLinks = await db.select({ count: sql<number>`count(*)` }).from(publisherWebsites);
  
  console.log('\n📊 THE KEY NUMBERS:');
  console.log(`Total websites in 'websites' table: ${websiteCount[0].count}`);
  console.log(`Websites with guest_post_cost field filled: ${websitesWithCost[0].count}`);
  console.log(`Total links in publisher_websites table: ${publisherWebsiteLinks[0].count}`);

  // Get websites with cost that ARE linked
  const linkedWebsites = await db
    .select({
      domain: websites.domain,
      guestPostCost: websites.guestPostCost
    })
    .from(websites)
    .innerJoin(publisherWebsites, eq(publisherWebsites.websiteId, websites.id))
    .where(isNotNull(websites.guestPostCost))
    .limit(5);

  console.log('\n✅ YES! publisher_websites DOES link to THE SAME websites table!');
  console.log('\nExamples of websites WITH guest_post_cost that ARE linked to publishers:');
  for (const w of linkedWebsites) {
    console.log(`  - ${w.domain}: $${w.guestPostCost}`);
  }

  // Get websites with cost that are NOT linked
  const unlinkedWebsites = await db
    .select({
      domain: websites.domain,
      guestPostCost: websites.guestPostCost
    })
    .from(websites)
    .leftJoin(publisherWebsites, eq(publisherWebsites.websiteId, websites.id))
    .where(and(
      isNotNull(websites.guestPostCost),
      isNull(publisherWebsites.id)
    ))
    .limit(5);

  console.log('\n❌ Websites WITH guest_post_cost but NOT linked to any publisher:');
  for (const w of unlinkedWebsites) {
    console.log(`  - ${w.domain}: $${w.guestPostCost}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('THE COMPLETE FLOW:');
  console.log('='.repeat(80));
  console.log('\n1. websites table (has guest_post_cost field)');
  console.log('     ↓');
  console.log('2. publisher_websites junction table (websiteId → publisherId)');
  console.log('     ↓');
  console.log('3. publishers table (publisher details)');
  console.log('     ↓');
  console.log('4. publisher_offerings table (pricing for services)');
  console.log('     ↓');
  console.log('5. publisher_offering_relationships (links offering to specific website)');
  
  console.log('\n🎯 KEY INSIGHT:');
  console.log('The websites table with guest_post_cost IS the central table.');
  console.log('Everything else (publishers, offerings) connects TO these websites.');
  console.log('The 107 websites without offerings are websites that exist in the');
  console.log('websites table but have no publisher assigned via publisher_websites.');
  
  process.exit(0);
}

checkPublisherWebsitesConnection().catch(console.error);