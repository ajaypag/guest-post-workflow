import { db } from './lib/db/connection';
import { websites, websitePublisherOfferings } from './lib/db/websiteSchema';
import { publisherOfferings } from './lib/db/publisherSchemaActual';
import { publishers } from './lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';

async function checkWebsiteOfferings() {
  // Check for top4.com.au
  const website = await db.query.websites.findFirst({
    where: eq(websites.domain, 'top4.com.au'),
    with: {
      publisherOfferings: {
        with: {
          offering: {
            with: {
              publisher: true
            }
          }
        }
      }
    }
  });

  console.log('Website:', website?.domain);
  console.log('Publisher offerings count:', website?.publisherOfferings?.length || 0);
  
  if (website?.publisherOfferings && website.publisherOfferings.length > 0) {
    console.log('\nAvailable offerings for this website:');
    website.publisherOfferings.forEach(po => {
      console.log(`  - ${po.offering?.publisher?.contactName || 'Unknown'} (${po.offering?.offeringName})`);
      console.log(`    Offering ID: ${po.offeringId}`);
      console.log(`    Price: $${(po.offering?.basePrice || 0) / 100}`);
    });
  } else {
    console.log('\nNo specific publisher offerings linked to this website.');
    console.log('Checking if website has selectedPublisherId...');
    console.log('Selected Publisher ID:', website?.selectedPublisherId);
    console.log('Selected Offering ID:', website?.selectedOfferingId);
  }
  
  process.exit(0);
}

checkWebsiteOfferings().catch(console.error);