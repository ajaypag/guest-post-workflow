import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '../lib/db/bulkAnalysisSchema';
import { websites } from '../lib/db/websiteSchema';
import { eq, sql } from 'drizzle-orm';
import { EnhancedOrderPricingService } from '../lib/services/enhancedOrderPricingService';

async function performActualAssignment() {
  const lineItemId = '1ab51b13-4b4a-4077-9b55-997a9db761f0'; // Unassigned item
  const domainId = 'cb00ecc6-8b12-4e5d-b979-86e1f98572ca'; // tekedia.com from bulk analysis
  const userId = 'a60a00f7-4d2f-4689-9bf4-1d6a0bf4d377'; // Admin user
  
  console.log('\n=== PERFORMING ACTUAL ASSIGNMENT ===\n');
  
  // 1. Get the domain
  const domain = await db.query.bulkAnalysisDomains.findFirst({
    where: eq(bulkAnalysisDomains.id, domainId)
  });
  
  if (!domain) {
    console.log('Domain not found');
    return;
  }
  
  console.log('1. Domain to assign:', domain.domain);
  
  // 2. Get website data
  const normalizedDomain = domain.domain.replace('www.', '').toLowerCase();
  const website = await db.query.websites.findFirst({
    where: eq(websites.domain, normalizedDomain)
  });
  
  let domainRating = null;
  let traffic = null;
  let wholesalePrice = null;
  let estimatedPrice = 16900; // Default
  
  if (website) {
    console.log('\n2. Website data found:');
    console.log('   DR:', website.domainRating);
    console.log('   Traffic:', website.totalTraffic);
    console.log('   Cost:', website.guestPostCost);
    
    domainRating = website.domainRating;
    traffic = website.totalTraffic;
    
    // Calculate pricing
    const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
      website.id,
      domain.domain,
      {
        quantity: 1,
        clientType: 'standard',
        urgency: 'standard'
      }
    );
    
    wholesalePrice = pricingResult.wholesalePrice;
    estimatedPrice = pricingResult.retailPrice;
    
    console.log('\n3. Calculated prices:');
    console.log('   Wholesale:', `$${(wholesalePrice/100).toFixed(2)}`);
    console.log('   Estimated:', `$${(estimatedPrice/100).toFixed(2)}`);
  }
  
  // 3. Update the line item
  console.log('\n4. Updating line item...');
  await db
    .update(orderLineItems)
    .set({
      assignedDomainId: domainId,
      assignedDomain: domain.domain,
      assignedAt: new Date(),
      assignedBy: userId,
      wholesalePrice: wholesalePrice,
      estimatedPrice: estimatedPrice,
      status: 'assigned',
      inclusionStatus: 'included',
      modifiedAt: new Date(),
      modifiedBy: userId,
      metadata: {
        domainQualificationStatus: domain.qualificationStatus,
        domainProjectId: domain.projectId,
        assignmentMethod: 'test_script',
        // Store DR and traffic from websites table
        domainRating: domainRating,
        traffic: traffic
      }
    })
    .where(eq(orderLineItems.id, lineItemId));
  
  console.log('✅ Assignment complete!');
  
  // 4. Verify what was stored
  console.log('\n5. Verifying stored data...');
  const updatedItem = await db.query.orderLineItems.findFirst({
    where: eq(orderLineItems.id, lineItemId)
  });
  
  if (updatedItem) {
    console.log('   Domain:', updatedItem.assignedDomain);
    console.log('   Wholesale:', updatedItem.wholesalePrice ? `$${(updatedItem.wholesalePrice/100).toFixed(2)}` : 'null');
    console.log('   Estimated:', updatedItem.estimatedPrice ? `$${(updatedItem.estimatedPrice/100).toFixed(2)}` : 'null');
    const metadata = updatedItem.metadata as any;
    console.log('   Metadata DR:', metadata?.domainRating || 'missing');
    console.log('   Metadata Traffic:', metadata?.traffic || 'missing');
  }
  
  process.exit(0);
}

performActualAssignment().catch(console.error);