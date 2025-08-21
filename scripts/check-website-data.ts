import { db } from '../lib/db/connection';
import { websites } from '../lib/db/websiteSchema';
import { eq, or, like } from 'drizzle-orm';

async function checkWebsiteData() {
  const domainName = 'naturaplug.com';
  
  try {
    console.log('\n=== WEBSITE TABLE DATA FOR NATURAPLUG.COM ===\n');
    
    // Check websites table
    const websiteResults = await db
      .select()
      .from(websites)
      .where(or(
        eq(websites.domain, domainName),
        like(websites.domain, `%${domainName}%`)
      ));
    
    console.log(`Found ${websiteResults.length} results in websites table\n`);
    
    websiteResults.forEach((website, index) => {
      console.log(`Website ${index + 1}:`);
      console.log('  ID:', website.id);
      console.log('  Domain:', website.domain);
      console.log('  Category:', website.category);
      console.log('  DR (Domain Rating):', website.domainRating);
      console.log('  Traffic:', website.traffic);
      console.log('  Guest Post Cost:', website.guestPostCost);
      console.log('  Link Insertion Cost:', website.linkInsertionCost);
      console.log('  Status:', website.status);
      console.log('  Created:', website.createdAt);
      console.log('---');
    });
    
    if (websiteResults.length > 0) {
      console.log('\n✅ The data EXISTS in the websites table!');
      console.log('The problem is that when adding from bulk analysis to an order,');
      console.log('it\'s not copying the DR/Traffic/Cost data from the websites table.');
      console.log('\nThis is a data synchronization issue between:');
      console.log('  1. websites table (has the data)');
      console.log('  2. bulk_analysis_domains table (missing the data)');
      console.log('  3. order_line_items (getting incomplete data)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkWebsiteData();