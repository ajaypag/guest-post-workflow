import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { websites } from '../lib/db/websiteSchema';
import { eq } from 'drizzle-orm';
import { EnhancedOrderPricingService } from '../lib/services/enhancedOrderPricingService';

async function fixRemainingDomains() {
  const domainsToFix = ['mindstick.com', 'naturaplug.com'];
  
  console.log('\n=== FIXING REMAINING DOMAINS ===\n');
  
  for (const domainName of domainsToFix) {
    console.log(`\n--- Fixing ${domainName} ---`);
    
    // 1. Find the line item
    const lineItem = await db.query.orderLineItems.findFirst({
      where: eq(orderLineItems.assignedDomain, domainName)
    });
    
    if (!lineItem) {
      console.log(`❌ Line item not found for ${domainName}`);
      continue;
    }
    
    console.log('✅ Found line item:', lineItem.id);
    console.log('   Current wholesale:', lineItem.wholesalePrice ? `$${(lineItem.wholesalePrice/100).toFixed(2)}` : 'null');
    console.log('   Current estimated:', lineItem.estimatedPrice ? `$${(lineItem.estimatedPrice/100).toFixed(2)}` : 'null');
    
    // 2. Get website data
    const website = await db.query.websites.findFirst({
      where: eq(websites.domain, domainName)
    });
    
    if (!website) {
      console.log(`❌ Website not found for ${domainName}`);
      continue;
    }
    
    console.log('✅ Found website data:');
    console.log('   DR:', website.domainRating);
    console.log('   Traffic:', website.totalTraffic);
    console.log('   Cost:', website.guestPostCost);
    
    // 3. Calculate correct pricing
    const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
      website.id,
      domainName,
      {
        quantity: 1,
        clientType: 'standard',
        urgency: 'standard'
      }
    );
    
    console.log('✅ Calculated prices:');
    console.log('   Wholesale:', `$${(pricingResult.wholesalePrice/100).toFixed(2)}`);
    console.log('   Retail:', `$${(pricingResult.retailPrice/100).toFixed(2)}`);
    
    // 4. Update the line item
    await db
      .update(orderLineItems)
      .set({
        wholesalePrice: pricingResult.wholesalePrice,
        estimatedPrice: pricingResult.retailPrice,
        modifiedAt: new Date(),
        metadata: {
          ...((lineItem.metadata as any) || {}),
          // Store DR and traffic from websites table
          domainRating: website.domainRating,
          traffic: website.totalTraffic,
          assignmentMethod: 'corrected_script'
        }
      })
      .where(eq(orderLineItems.id, lineItem.id));
    
    console.log('✅ Updated successfully!');
  }
  
  console.log('\n=== ALL DOMAINS FIXED ===');
  process.exit(0);
}

fixRemainingDomains().catch(console.error);