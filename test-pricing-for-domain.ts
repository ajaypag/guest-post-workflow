import { db } from './lib/db/connection';
import { websites } from './lib/db/websiteSchema';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { eq, sql } from 'drizzle-orm';
import { EnhancedOrderPricingService } from './lib/services/enhancedOrderPricingService';

async function testPricing() {
  const domainName = 'valasys.com';
  
  console.log(`\n=== Testing pricing for ${domainName} ===\n`);
  
  // First, find the domain in bulk_analysis_domains
  const domain = await db.query.bulkAnalysisDomains.findFirst({
    where: eq(bulkAnalysisDomains.domain, domainName)
  });
  
  console.log('Bulk Analysis Domain:', domain ? 'Found' : 'Not found');
  if (domain) {
    console.log('  ID:', domain.id);
    console.log('  Domain:', domain.domain);
    console.log('  Estimated Price:', domain.estimatedPrice);
  }
  
  // Try to find the website
  const website = await db.query.websites.findFirst({
    where: sql`${websites.domain} = ${domainName} 
              OR ${websites.domain} = CONCAT('www.', ${domainName})
              OR CONCAT('www.', ${websites.domain}) = ${domainName}`
  });
  
  console.log('\nWebsite:', website ? 'Found' : 'Not found');
  if (website) {
    console.log('  ID:', website.id);
    console.log('  Domain:', website.domain);
    console.log('  Guest Post Cost:', website.guestPostCost);
    console.log('  DR:', website.domainRating);
    console.log('  Traffic:', website.totalTraffic);
  }
  
  // Test the pricing service
  console.log('\n=== Testing EnhancedOrderPricingService ===\n');
  
  const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
    website?.id || null,
    domainName,
    {
      quantity: 1,
      clientType: 'standard',
      urgency: 'standard'
    }
  );
  
  console.log('Pricing Result:');
  console.log('  Wholesale Price:', pricingResult.wholesalePrice, `($${(pricingResult.wholesalePrice / 100).toFixed(2)})`);
  console.log('  Retail Price:', pricingResult.retailPrice, `($${(pricingResult.retailPrice / 100).toFixed(2)})`);
  console.log('  Base Price:', pricingResult.basePrice);
  console.log('  Service Fee:', pricingResult.serviceFee);
  console.log('  Calculation:', pricingResult.calculation);
  
  if (website?.guestPostCost) {
    console.log('\nDirect calculation fallback:');
    const wholesalePrice = Math.floor(Number(website.guestPostCost) * 100);
    const estimatedPrice = wholesalePrice + 7900;
    console.log('  Wholesale:', wholesalePrice, `($${(wholesalePrice / 100).toFixed(2)})`);
    console.log('  Retail:', estimatedPrice, `($${(estimatedPrice / 100).toFixed(2)})`);
  }
  
  process.exit(0);
}

testPricing().catch(console.error);