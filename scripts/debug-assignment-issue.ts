import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { websites } from '../lib/db/websiteSchema';
import { eq, desc, sql } from 'drizzle-orm';

async function debugAssignmentIssue() {
  const orderId = 'a3ca24b7-9a92-4c00-952e-bb71606af8b9';
  
  console.log('\n=== DEBUGGING DOMAIN ASSIGNMENT ISSUE ===\n');
  
  // 1. Check line items for this order
  const items = await db
    .select()
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId))
    .orderBy(desc(orderLineItems.assignedAt));
  
  console.log('\n1. LINE ITEMS IN ORDER:');
  console.log('========================');
  
  const assignedItems = items.filter(item => item.assignedDomain);
  assignedItems.forEach((item, i) => {
    console.log(`\nAssigned Item ${i + 1}:`);
    console.log('  Domain:', item.assignedDomain);
    console.log('  Wholesale Price:', item.wholesalePrice ? `$${(item.wholesalePrice/100).toFixed(2)}` : 'null');
    console.log('  Estimated Price:', item.estimatedPrice ? `$${(item.estimatedPrice/100).toFixed(2)}` : 'null');
    console.log('  Status:', item.status);
    const metadata = item.metadata as any;
    console.log('  Metadata DR:', metadata?.domainRating || 'missing');
    console.log('  Metadata Traffic:', metadata?.traffic || 'missing');
  });
  
  // 2. Check the websites table for these domains
  console.log('\n\n2. WEBSITES TABLE DATA:');
  console.log('========================');
  
  for (const item of assignedItems) {
    if (item.assignedDomain) {
      const domain = item.assignedDomain;
      const normalizedDomain = domain.replace('www.', '').toLowerCase();
      
      // Simple query to find the website
      const website = await db.query.websites.findFirst({
        where: eq(websites.domain, normalizedDomain)
      });
      
      console.log(`\nWebsite data for ${domain}:`);
      if (website) {
        console.log('  Found in websites table:');
        console.log('    ID:', website.id);
        console.log('    Domain:', website.domain);
        console.log('    DR:', website.domainRating);
        console.log('    Traffic:', website.totalTraffic);
        console.log('    Guest Post Cost:', website.guestPostCost);
        console.log('    Status:', website.status);
      } else {
        // Try with www prefix
        const websiteWithWww = await db.query.websites.findFirst({
          where: eq(websites.domain, `www.${normalizedDomain}`)
        });
        
        if (websiteWithWww) {
          console.log('  Found in websites table (with www):');
          console.log('    ID:', websiteWithWww.id);
          console.log('    Domain:', websiteWithWww.domain);
          console.log('    DR:', websiteWithWww.domainRating);
          console.log('    Traffic:', websiteWithWww.totalTraffic);
          console.log('    Guest Post Cost:', websiteWithWww.guestPostCost);
          console.log('    Status:', websiteWithWww.status);
        } else {
          console.log('  NOT FOUND in websites table!');
        }
      }
    }
  }
  
  // 3. Check unassigned items
  const unassignedItems = items.filter(item => !item.assignedDomain);
  console.log(`\n\n3. UNASSIGNED LINE ITEMS: ${unassignedItems.length}`);
  console.log('========================');
  unassignedItems.forEach((item, i) => {
    console.log(`\nUnassigned Item ${i + 1}:`);
    console.log('  Client ID:', item.clientId);
    console.log('  Estimated Price:', item.estimatedPrice ? `$${(item.estimatedPrice/100).toFixed(2)}` : 'null');
    console.log('  Status:', item.status);
  });
  
  process.exit(0);
}

debugAssignmentIssue().catch(console.error);