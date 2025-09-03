import { db } from './lib/db/connection';
import { websites, websitePublisherOfferings } from './lib/db/websiteSchema';
import { publisherOfferings } from './lib/db/publisherSchemaActual';
import { publishers } from './lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';

async function checkWebsiteOfferings() {
  // First, get the website
  const website = await db.select().from(websites).where(eq(websites.domain, 'top4.com.au')).limit(1);
  
  if (website.length === 0) {
    console.log('Website not found');
    process.exit(1);
  }
  
  const site = website[0];
  console.log('Website:', site.domain);
  console.log('Selected Publisher ID:', site.selectedPublisherId);
  console.log('Selected Offering ID:', site.selectedOfferingId);
  console.log('Guest Post Cost:', site.guestPostCost ? `$${site.guestPostCost / 100}` : 'Not set');
  
  // Check if there are any entries in websitePublisherOfferings
  const websiteOfferings = await db
    .select({
      websiteId: websitePublisherOfferings.websiteId,
      offeringId: websitePublisherOfferings.offeringId,
      offeringName: publisherOfferings.offeringName,
      publisherId: publisherOfferings.publisherId,
      publisherName: publishers.contactName,
      basePrice: publisherOfferings.basePrice
    })
    .from(websitePublisherOfferings)
    .leftJoin(publisherOfferings, eq(websitePublisherOfferings.offeringId, publisherOfferings.id))
    .leftJoin(publishers, eq(publisherOfferings.publisherId, publishers.id))
    .where(eq(websitePublisherOfferings.websiteId, site.id));
  
  console.log('\nWebsite-specific publisher offerings:', websiteOfferings.length);
  
  if (websiteOfferings.length > 0) {
    console.log('Available offerings:');
    websiteOfferings.forEach(wo => {
      console.log(`  - ${wo.publisherName} (${wo.offeringName})`);
      console.log(`    Offering ID: ${wo.offeringId}`);
      console.log(`    Price: $${(wo.basePrice || 0) / 100}`);
    });
  } else {
    console.log('No specific publisher offerings linked to this website.');
    console.log('\nThis website uses the selectedPublisherId/selectedOfferingId fields instead.');
    
    // If website has a selected offering, show details
    if (site.selectedOfferingId) {
      const offering = await db
        .select({
          offeringName: publisherOfferings.offeringName,
          publisherName: publishers.contactName,
          basePrice: publisherOfferings.basePrice
        })
        .from(publisherOfferings)
        .leftJoin(publishers, eq(publisherOfferings.publisherId, publishers.id))
        .where(eq(publisherOfferings.id, site.selectedOfferingId))
        .limit(1);
      
      if (offering.length > 0) {
        console.log('\nCurrently selected offering:');
        console.log(`  ${offering[0].publisherName} - ${offering[0].offeringName}`);
        console.log(`  Price: $${(offering[0].basePrice || 0) / 100}`);
      }
    }
  }
  
  process.exit(0);
}

checkWebsiteOfferings().catch(console.error);