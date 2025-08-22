import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '../lib/db/bulkAnalysisSchema';
import { websites } from '../lib/db/websiteSchema';
import { eq, sql } from 'drizzle-orm';
import { EnhancedOrderPricingService } from '../lib/services/enhancedOrderPricingService';

async function simulateAssignment() {
  const lineItemId = '1ab51b13-4b4a-4077-9b55-997a9db761f0'; // Unassigned item
  const domainId = 'cb00ecc6-8b12-4e5d-b979-86e1f98572ca'; // tekedia.com from bulk analysis
  
  console.log('\n=== SIMULATING ASSIGNMENT OF TEKEDIA.COM ===\n');
  
  // 1. Get the bulk analysis domain
  const domain = await db.query.bulkAnalysisDomains.findFirst({
    where: eq(bulkAnalysisDomains.id, domainId)
  });
  
  if (!domain) {
    console.log('Domain not found in bulk analysis');
    return;
  }
  
  console.log('1. Bulk Analysis Domain:');
  console.log('   Domain:', domain.domain);
  console.log('   Status:', domain.qualificationStatus);
  
  // 2. Get the line item
  const lineItem = await db.query.orderLineItems.findFirst({
    where: eq(orderLineItems.id, lineItemId)
  });
  
  if (!lineItem) {
    console.log('Line item not found');
    return;
  }
  
  console.log('\n2. Line Item (before):');
  console.log('   Wholesale Price:', lineItem.wholesalePrice);
  console.log('   Estimated Price:', lineItem.estimatedPrice);
  
  // 3. Fetch website data (CRITICAL STEP)
  console.log('\n3. Fetching Website Data:');
  const normalizedDomain = domain.domain.replace('www.', '').toLowerCase();
  const website = await db.query.websites.findFirst({
    where: eq(websites.domain, normalizedDomain)
  });
  
  if (website) {
    console.log('   ✅ Found in websites table!');
    console.log('   Domain:', website.domain);
    console.log('   DR:', website.domainRating);
    console.log('   Traffic:', website.totalTraffic);
    console.log('   Guest Post Cost:', website.guestPostCost);
    
    // 4. Calculate pricing
    console.log('\n4. Price Calculation:');
    const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
      website.id,
      domain.domain,
      {
        quantity: 1,
        clientType: 'standard',
        urgency: 'standard'
      }
    );
    
    console.log('   Enhanced Service Result:');
    console.log('   - Wholesale:', pricingResult.wholesalePrice ? `$${(pricingResult.wholesalePrice/100).toFixed(2)}` : 'null');
    console.log('   - Retail:', pricingResult.retailPrice ? `$${(pricingResult.retailPrice/100).toFixed(2)}` : 'null');
    
    if (pricingResult.wholesalePrice === 0 && website.guestPostCost) {
      const fallbackWholesale = Math.floor(Number(website.guestPostCost) * 100);
      const fallbackEstimated = fallbackWholesale + 7900;
      console.log('   Fallback Calculation:');
      console.log('   - Wholesale:', `$${(fallbackWholesale/100).toFixed(2)}`);
      console.log('   - Estimated:', `$${(fallbackEstimated/100).toFixed(2)}`);
    }
    
    // 5. What would be stored
    console.log('\n5. What Would Be Stored in Metadata:');
    console.log('   domainRating:', website.domainRating || null);
    console.log('   traffic:', website.totalTraffic || null);
    
  } else {
    console.log('   ❌ NOT found in websites table!');
    console.log('   This is why DR/traffic would be missing!');
  }
  
  process.exit(0);
}

simulateAssignment().catch(console.error);