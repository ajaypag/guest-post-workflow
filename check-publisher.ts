import 'dotenv/config';
import { db } from './lib/db/connection';
import { publishers } from './lib/db/accountSchema';
import { eq } from 'drizzle-orm';

async function checkPublisher() {
  try {
    // Check if test publisher exists
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.email, 'testpublisher@example.com')
    });
    
    if (publisher) {
      console.log('Publisher found:');
      console.log('  ID:', publisher.id);
      console.log('  Email:', publisher.email);
      console.log('  Status:', publisher.status);
      console.log('  Contact Name:', publisher.contactName);
      console.log('  Company:', publisher.companyName);
      console.log('  Has Password:', !!publisher.password);
    } else {
      console.log('Publisher NOT found');
      
      // List all publishers
      const allPublishers = await db.select({
        email: publishers.email,
        status: publishers.status
      }).from(publishers);
      
      console.log('\nAll publishers in database:');
      allPublishers.forEach(p => {
        console.log(`  - ${p.email} (${p.status})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkPublisher();