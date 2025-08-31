import { db } from '../lib/db/connection';
import { websites, publishers, publisherWebsites, publisherOfferings, publisherOfferingRelationships } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function debugOfferingCreation() {
  console.log('🔍 Debugging offering creation for recently affected sites...\n');
  
  const testSites = ['disquantified.org', 'techpreview.org', 'etruesports.com'];
  
  for (const siteDomain of testSites) {
    console.log(`\n📦 ${siteDomain}`);
    console.log('-'.repeat(40));
    
    const website = await db.select().from(websites).where(eq(websites.domain, siteDomain)).limit(1);
    if (!website[0]) {
      console.log('❌ Website not found');
      continue;
    }
    
    // Get publishers linked to this site
    const linkedPublishers = await db
      .select({
        publisherId: publishers.id,
        email: publishers.email,
        linkCreated: publisherWebsites.createdAt
      })
      .from(publisherWebsites)
      .innerJoin(publishers, eq(publishers.id, publisherWebsites.publisherId))
      .where(eq(publisherWebsites.websiteId, website[0].id));
    
    console.log(`Publishers linked: ${linkedPublishers.length}`);
    
    for (const pub of linkedPublishers) {
      console.log(`\n👤 Publisher: ${pub.email}`);
      
      // Check offerings for this publisher-website combo
      const offerings = await db
        .select({
          offeringId: publisherOfferings.id,
          price: publisherOfferings.basePrice,
          relCreated: publisherOfferingRelationships.createdAt
        })
        .from(publisherOfferingRelationships)
        .innerJoin(publisherOfferings, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
        .where(and(
          eq(publisherOfferingRelationships.publisherId, pub.publisherId),
          eq(publisherOfferingRelationships.websiteId, website[0].id)
        ));
      
      console.log(`   Offerings: ${offerings.length}`);
      if (offerings.length === 0) {
        console.log('   ❌ NO OFFERINGS - This is the bug!');
        
        // Check if publisher has ANY offerings (not for this site)
        const anyOfferings = await db
          .select()
          .from(publisherOfferings)
          .where(eq(publisherOfferings.publisherId, pub.publisherId))
          .limit(5);
        
        console.log(`   Publisher has ${anyOfferings.length} total offerings (other sites)`);
        if (anyOfferings.length > 0) {
          console.log(`   Sample offering prices: ${anyOfferings.map(o => '$' + (o.basePrice/100)).join(', ')}`);
        }
      } else {
        offerings.forEach((off, i) => {
          console.log(`   ${i + 1}. $${(off.price/100).toFixed(2)}`);
        });
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🐛 DIAGNOSIS:');
  console.log('Publishers are being created/linked successfully,');
  console.log('but offerings are NOT being created for the specific website.');
  console.log('The bug is in the execute-v2 offering creation logic.');
  
  process.exit(0);
}

debugOfferingCreation().catch(console.error);