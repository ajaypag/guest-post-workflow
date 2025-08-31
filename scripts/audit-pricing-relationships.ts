import { db } from '@/lib/db/connection';
import { websites, publisherOfferings, publisherWebsites } from '@/lib/db/schema';
import { eq, sql, isNotNull, and } from 'drizzle-orm';

async function auditPricingRelationships() {
  console.log('='.repeat(80));
  console.log('PUBLISHER OFFERINGS vs GUEST_POST_COST AUDIT');
  console.log('='.repeat(80));

  // 1. Count websites with guest_post_cost
  const websitesWithCost = await db
    .select({
      count: sql<number>`count(*)`,
      uniquePrices: sql<number>`count(distinct ${websites.guestPostCost})`
    })
    .from(websites)
    .where(isNotNull(websites.guestPostCost));

  console.log('\n📊 WEBSITES WITH PRICING:');
  console.log(`- Total websites with guest_post_cost: ${websitesWithCost[0].count}`);
  console.log(`- Unique price points: ${websitesWithCost[0].uniquePrices}`);

  // 2. Count publisher offerings
  const offeringsCount = await db
    .select({
      count: sql<number>`count(*)`,
      uniquePrices: sql<number>`count(distinct ${publisherOfferings.basePrice})`
    })
    .from(publisherOfferings);

  console.log('\n📦 PUBLISHER OFFERINGS:');
  console.log(`- Total offerings: ${offeringsCount[0].count}`);
  console.log(`- Unique price points: ${offeringsCount[0].uniquePrices}`);

  // 3. Get websites with their offerings
  const websitesWithOfferings = await db
    .select({
      websiteId: websites.id,
      domain: websites.domain,
      guestPostCost: websites.guestPostCost,
      publisherId: publisherWebsites.publisherId,
      offeringId: publisherOfferings.id,
      offeringName: publisherOfferings.offeringName,
      basePrice: publisherOfferings.basePrice,
      offeringType: publisherOfferings.offeringType
    })
    .from(websites)
    .leftJoin(publisherWebsites, eq(publisherWebsites.websiteId, websites.id))
    .leftJoin(publisherOfferings, eq(publisherOfferings.publisherId, publisherWebsites.publisherId))
    .where(isNotNull(websites.guestPostCost))
    .orderBy(websites.guestPostCost);

  // Analyze relationships
  let matchCount = 0;
  let mismatchCount = 0;
  let noOfferingCount = 0;
  const mismatches: any[] = [];
  const noOfferings: any[] = [];

  const websiteMap = new Map();
  
  for (const row of websitesWithOfferings) {
    if (!websiteMap.has(row.websiteId)) {
      websiteMap.set(row.websiteId, {
        domain: row.domain,
        guestPostCost: row.guestPostCost,
        offerings: []
      });
    }
    
    if (row.offeringId) {
      websiteMap.get(row.websiteId).offerings.push({
        id: row.offeringId,
        name: row.offeringName,
        basePrice: row.basePrice,
        type: row.offeringType
      });
    }
  }

  for (const [websiteId, data] of websiteMap) {
    const guestPostCostCents = Math.round(parseFloat(data.guestPostCost) * 100);
    
    if (data.offerings.length === 0) {
      noOfferingCount++;
      if (noOfferings.length < 5) {
        noOfferings.push({
          domain: data.domain,
          guestPostCost: data.guestPostCost
        });
      }
    } else {
      // Check if any offering matches the guest_post_cost
      const hasMatch = data.offerings.some(o => o.basePrice === guestPostCostCents);
      
      if (hasMatch) {
        matchCount++;
      } else {
        mismatchCount++;
        if (mismatches.length < 5) {
          mismatches.push({
            domain: data.domain,
            guestPostCost: data.guestPostCost,
            guestPostCostCents,
            offerings: data.offerings.map(o => ({
              name: o.name,
              basePrice: o.basePrice,
              priceDollars: (o.basePrice / 100).toFixed(2)
            }))
          });
        }
      }
    }
  }

  console.log('\n🔍 RELATIONSHIP ANALYSIS:');
  console.log(`- Websites with matching offerings: ${matchCount} (${(matchCount / websiteMap.size * 100).toFixed(1)}%)`);
  console.log(`- Websites with mismatched offerings: ${mismatchCount} (${(mismatchCount / websiteMap.size * 100).toFixed(1)}%)`);
  console.log(`- Websites with no offerings: ${noOfferingCount} (${(noOfferingCount / websiteMap.size * 100).toFixed(1)}%)`);

  // 4. Top 10 most common prices
  const topPrices = await db
    .select({
      price: websites.guestPostCost,
      count: sql<number>`count(*)`
    })
    .from(websites)
    .where(isNotNull(websites.guestPostCost))
    .groupBy(websites.guestPostCost)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  console.log('\n💰 TOP 10 MOST COMMON PRICES:');
  for (const row of topPrices) {
    const priceCents = Math.round(parseFloat(row.price) * 100);
    
    // Check how many offerings match this price
    const matchingOfferings = await db
      .select({ count: sql<number>`count(*)` })
      .from(publisherOfferings)
      .where(eq(publisherOfferings.basePrice, priceCents));
    
    console.log(`  $${row.price} - ${row.count} websites, ${matchingOfferings[0].count} matching offerings`);
  }

  // 5. Sample mismatches
  if (mismatches.length > 0) {
    console.log('\n⚠️ SAMPLE PRICE MISMATCHES:');
    for (const mismatch of mismatches) {
      console.log(`\n  ${mismatch.domain}:`);
      console.log(`    Website price: $${mismatch.guestPostCost} (${mismatch.guestPostCostCents} cents)`);
      console.log(`    Offerings:`);
      for (const offering of mismatch.offerings) {
        console.log(`      - ${offering.name}: $${offering.priceDollars} (${offering.basePrice} cents)`);
      }
    }
  }

  // 6. Sample missing offerings
  if (noOfferings.length > 0) {
    console.log('\n❌ SAMPLE WEBSITES WITHOUT OFFERINGS:');
    for (const website of noOfferings) {
      console.log(`  - ${website.domain}: $${website.guestPostCost}`);
    }
  }

  // 7. Check for duplicate offerings per website
  const duplicateOfferings = await db
    .select({
      websiteId: publisherWebsites.websiteId,
      domain: websites.domain,
      offeringCount: sql<number>`count(distinct ${publisherOfferings.id})`
    })
    .from(publisherWebsites)
    .innerJoin(websites, eq(websites.id, publisherWebsites.websiteId))
    .innerJoin(publisherOfferings, eq(publisherOfferings.publisherId, publisherWebsites.publisherId))
    .groupBy(publisherWebsites.websiteId, websites.domain)
    .having(sql`count(distinct ${publisherOfferings.id}) > 1`)
    .limit(10);

  if (duplicateOfferings.length > 0) {
    console.log('\n🔄 WEBSITES WITH MULTIPLE OFFERINGS:');
    for (const row of duplicateOfferings) {
      console.log(`  - ${row.domain}: ${row.offeringCount} offerings`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('AUDIT COMPLETE');
  console.log('='.repeat(80));
  
  process.exit(0);
}

auditPricingRelationships().catch(console.error);