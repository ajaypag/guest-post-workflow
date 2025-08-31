import { db } from '@/lib/db/connection';
import { websites, publisherOfferings, publisherWebsites } from '@/lib/db/schema';
import { eq, sql, isNotNull } from 'drizzle-orm';

async function listPricingProblems() {
  console.log('='.repeat(80));
  console.log('LISTING ALL WEBSITES WITH PRICING PROBLEMS');
  console.log('='.repeat(80));

  // Get all websites with their offerings
  const allWebsitesWithPricing = await db
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
    .orderBy(websites.domain);

  // Group by website
  const websiteMap = new Map();
  
  for (const row of allWebsitesWithPricing) {
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

  const mismatches: any[] = [];
  const noOfferings: any[] = [];
  const multipleOfferings: any[] = [];

  for (const [websiteId, data] of websiteMap) {
    const guestPostCostCents = Math.round(parseFloat(data.guestPostCost) * 100);
    
    if (data.offerings.length === 0) {
      noOfferings.push({
        domain: data.domain,
        guestPostCost: data.guestPostCost
      });
    } else if (data.offerings.length > 1) {
      // Website has multiple offerings
      const hasMatch = data.offerings.some(o => o.basePrice === guestPostCostCents);
      if (!hasMatch) {
        multipleOfferings.push({
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
    } else {
      // Single offering - check if it matches
      const offering = data.offerings[0];
      if (offering.basePrice !== guestPostCostCents) {
        mismatches.push({
          domain: data.domain,
          guestPostCost: data.guestPostCost,
          guestPostCostCents,
          offeringPrice: offering.basePrice,
          offeringPriceDollars: (offering.basePrice / 100).toFixed(2),
          difference: ((offering.basePrice - guestPostCostCents) / 100).toFixed(2)
        });
      }
    }
  }

  // Sort by price difference for mismatches
  mismatches.sort((a, b) => Math.abs(parseFloat(b.difference)) - Math.abs(parseFloat(a.difference)));

  console.log('\n❌ WEBSITES WITHOUT ANY OFFERINGS (' + noOfferings.length + ' websites):');
  console.log('='*50);
  for (const website of noOfferings) {
    console.log(`${website.domain.padEnd(40)} | $${website.guestPostCost}`);
  }

  console.log('\n⚠️ WEBSITES WITH PRICE MISMATCHES (' + mismatches.length + ' websites):');
  console.log('='*50);
  console.log('Domain'.padEnd(40) + ' | Website $ | Offering $ | Diff $');
  console.log('-'*70);
  for (const mismatch of mismatches) {
    const marker = Math.abs(parseFloat(mismatch.difference)) > 50 ? '🔴' : '🟡';
    console.log(
      `${mismatch.domain.padEnd(40)} | $${mismatch.guestPostCost.padEnd(7)} | $${mismatch.offeringPriceDollars.padEnd(8)} | ${marker} ${mismatch.difference > 0 ? '+' : ''}${mismatch.difference}`
    );
  }

  console.log('\n🔄 WEBSITES WITH MULTIPLE OFFERINGS AND NO MATCH (' + multipleOfferings.length + ' websites):');
  console.log('='*50);
  for (const website of multipleOfferings) {
    console.log(`\n${website.domain}: Website price: $${website.guestPostCost}`);
    for (const offering of website.offerings) {
      console.log(`  - ${offering.name}: $${offering.priceDollars}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total websites with problems: ${noOfferings.length + mismatches.length + multipleOfferings.length}`);
  console.log(`- No offerings: ${noOfferings.length}`);
  console.log(`- Price mismatches: ${mismatches.length}`);
  console.log(`- Multiple offerings (no match): ${multipleOfferings.length}`);
  
  // Save to file for reference
  const output = {
    summary: {
      totalProblems: noOfferings.length + mismatches.length + multipleOfferings.length,
      noOfferings: noOfferings.length,
      mismatches: mismatches.length,
      multipleOfferingsNoMatch: multipleOfferings.length
    },
    noOfferings: noOfferings,
    mismatches: mismatches,
    multipleOfferings: multipleOfferings
  };

  require('fs').writeFileSync(
    '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/docs/06-planning/pricing-standardization/all-pricing-problems.json',
    JSON.stringify(output, null, 2)
  );
  
  console.log('\n📄 Full list saved to: docs/06-planning/pricing-standardization/all-pricing-problems.json');
  
  process.exit(0);
}

listPricingProblems().catch(console.error);