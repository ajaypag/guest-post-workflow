import { db } from '../lib/db/connection';
import { bulkAnalysisDomains } from '../lib/db/bulkAnalysisSchema';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { websites } from '../lib/db/websiteSchema';
import { eq, and, isNull } from 'drizzle-orm';

async function testDomainAssignment() {
  const orderId = 'a3ca24b7-9a92-4c00-952e-bb71606af8b9';
  const clientId = 'ce996fbe-a4f3-479f-bd60-6bb8e96a5f3f'; // AI Apply client
  
  console.log('\n=== TESTING DOMAIN ASSIGNMENT FLOW ===\n');
  
  // 1. Find an unassigned line item
  const unassignedItem = await db.query.orderLineItems.findFirst({
    where: and(
      eq(orderLineItems.orderId, orderId),
      isNull(orderLineItems.assignedDomainId),
      eq(orderLineItems.status, 'pending')
    )
  });
  
  if (!unassignedItem) {
    console.log('No unassigned line items found. Creating one for testing...');
    // Would need to create one here if needed
    return;
  }
  
  console.log('Found unassigned line item:', unassignedItem.id);
  console.log('  Client suggested price:', unassignedItem.estimatedPrice ? `$${(unassignedItem.estimatedPrice/100).toFixed(2)}` : 'null');
  
  // 2. Find a qualified domain from bulk analysis
  const qualifiedDomain = await db.query.bulkAnalysisDomains.findFirst({
    where: and(
      eq(bulkAnalysisDomains.clientId, clientId),
      eq(bulkAnalysisDomains.qualificationStatus, 'qualified')
    )
  });
  
  if (!qualifiedDomain) {
    console.log('No qualified domains found in bulk analysis');
    return;
  }
  
  console.log('\nFound qualified domain:', qualifiedDomain.domain);
  console.log('  Bulk Analysis ID:', qualifiedDomain.id);
  
  // 3. Check if this domain exists in websites table
  const normalizedDomain = qualifiedDomain.domain.replace('www.', '').toLowerCase();
  const website = await db.query.websites.findFirst({
    where: eq(websites.domain, normalizedDomain)
  });
  
  if (website) {
    console.log('\nWebsite table data:');
    console.log('  Domain:', website.domain);
    console.log('  DR:', website.domainRating);
    console.log('  Traffic:', website.totalTraffic);
    console.log('  Guest Post Cost:', website.guestPostCost);
    
    console.log('\n✅ This domain SHOULD have DR/traffic/pricing when assigned!');
  } else {
    console.log('\n⚠️ Domain not found in websites table - will have no metrics');
  }
  
  // 4. Simulate what the API would fetch
  console.log('\n=== SIMULATING API ASSIGNMENT ===');
  console.log('1. API would fetch website data ✅');
  console.log('2. API would calculate pricing using EnhancedOrderPricingService');
  console.log('3. API would store in metadata:');
  console.log('   - domainRating:', website?.domainRating || 'null');
  console.log('   - traffic:', website?.totalTraffic || 'null');
  console.log('4. API would update wholesalePrice and estimatedPrice');
  
  if (website && website.guestPostCost) {
    const wholesalePrice = Math.floor(Number(website.guestPostCost) * 100);
    const estimatedPrice = wholesalePrice + 7900; // $79 markup
    console.log('\nExpected prices after assignment:');
    console.log('  Wholesale:', `$${(wholesalePrice/100).toFixed(2)}`);
    console.log('  Estimated:', `$${(estimatedPrice/100).toFixed(2)}`);
  }
  
  process.exit(0);
}

testDomainAssignment().catch(console.error);