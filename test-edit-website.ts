import 'dotenv/config';
import { db } from './lib/db/connection';
import { publisherOfferingRelationships } from './lib/db/publisherSchemaActual';
import { publishers } from './lib/db/accountSchema';
import { websites } from './lib/db/websiteSchema';
import { eq, and } from 'drizzle-orm';

async function testEditWebsite() {
  try {
    // Find a test publisher
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.email, 'testpublisher@example.com')
    });
    
    if (!publisher) {
      console.log('No test publisher found');
      process.exit(1);
    }
    
    console.log('Found publisher:', publisher.id, publisher.email);
    
    // Find websites for this publisher
    const relations = await db
      .select({
        relationshipId: publisherOfferingRelationships.id,
        websiteId: publisherOfferingRelationships.websiteId,
        offeringId: publisherOfferingRelationships.offeringId,
        domain: websites.domain,
        categories: websites.categories
      })
      .from(publisherOfferingRelationships)
      .innerJoin(websites, eq(websites.id, publisherOfferingRelationships.websiteId))
      .where(eq(publisherOfferingRelationships.publisherId, publisher.id));
    
    console.log('\nPublisher websites:');
    relations.forEach(r => {
      console.log(`- ${r.domain} (ID: ${r.websiteId})`);
      console.log(`  Edit URL: /publisher/websites/${r.websiteId}/edit`);
    });
    
    if (relations.length > 0) {
      const firstWebsite = relations[0];
      console.log('\nTesting edit for:', firstWebsite.domain);
      console.log('Website ID:', firstWebsite.websiteId);
      console.log('Test this URL: http://localhost:3001/publisher/websites/' + firstWebsite.websiteId + '/edit');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testEditWebsite();