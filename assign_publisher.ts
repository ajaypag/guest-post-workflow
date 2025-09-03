import { db } from './lib/db/connection';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { websites } from './lib/db/websiteSchema';
import { eq } from 'drizzle-orm';

async function assignPublisherToLineItem() {
  const orderId = '474e3625-4140-4919-870e-94497bc81202';
  
  console.log('🔍 Checking line items for order:', orderId);
  
  const lineItems = await db.select().from(orderLineItems).where(eq(orderLineItems.orderId, orderId));
  
  if (lineItems.length === 0) {
    console.log('❌ No line items found for this order');
    return;
  }
  
  const item = lineItems[0];
  console.log('\n📋 Line Item Status:');
  console.log('   ID:', item.id);
  console.log('   Domain:', item.assignedDomain || 'NOT ASSIGNED');
  console.log('   Current Publisher:', item.publisherId || 'NOT ASSIGNED');
  console.log('   Status:', item.status);
  
  if (!item.assignedDomain) {
    console.log('\n⚠️ No domain assigned to this line item');
    console.log('You need to assign a domain first from the UI');
    return;
  }
  
  if (item.publisherId) {
    console.log('\n✅ Publisher already assigned!');
    return;
  }
  
  // Look up the website
  console.log('\n🔍 Looking up website:', item.assignedDomain);
  const website = await db.select().from(websites).where(eq(websites.domain, item.assignedDomain)).limit(1);
  
  if (website.length === 0) {
    console.log('❌ Domain not found in websites table');
    return;
  }
  
  const site = website[0];
  console.log('✅ Website found');
  
  // Check if it has publisher attribution
  if (site.selectedPublisherId && site.selectedOfferingId) {
    console.log('\n🎯 Website HAS publisher attribution!');
    console.log('   Publisher ID:', site.selectedPublisherId);
    console.log('   Offering ID:', site.selectedOfferingId);
    console.log('   Price: $' + (site.guestPostCost / 100).toFixed(2));
    
    // Update the line item
    console.log('\n📝 Updating line item with publisher...');
    await db.update(orderLineItems)
      .set({
        publisherId: site.selectedPublisherId,
        publisherOfferingId: site.selectedOfferingId,
        publisherPrice: site.guestPostCost,
        modifiedAt: new Date()
      })
      .where(eq(orderLineItems.id, item.id));
    
    console.log('✅ SUCCESS! Publisher assigned to line item');
    console.log('\n🔄 REFRESH YOUR BROWSER PAGE to see the publisher!');
  } else {
    console.log('\n❌ This website has no publisher attribution');
    console.log('   The website needs publisher offerings set up first');
    console.log('   Or it needs to go through the pricing calculation service');
    
    // Let's check if we can calculate it now
    console.log('\n💡 Attempting to calculate publisher attribution...');
    const { DerivedPricingService } = await import('./lib/services/derivedPricingService');
    
    try {
      const result = await DerivedPricingService.calculateDerivedPrice(site.id);
      
      if (result.selectedOfferingId && result.selectedPublisherId) {
        console.log('✅ Publisher attribution calculated!');
        console.log('   Publisher:', result.selectedPublisherId);
        console.log('   Price: $' + result.price);
        
        // Update the website
        await db.update(websites)
          .set({
            selectedOfferingId: result.selectedOfferingId,
            selectedPublisherId: result.selectedPublisherId,
            selectedAt: new Date(),
            guestPostCost: result.price * 100 // Convert to cents
          })
          .where(eq(websites.id, site.id));
        
        // Now update the line item
        await db.update(orderLineItems)
          .set({
            publisherId: result.selectedPublisherId,
            publisherOfferingId: result.selectedOfferingId,
            publisherPrice: result.price * 100,
            modifiedAt: new Date()
          })
          .where(eq(orderLineItems.id, item.id));
        
        console.log('✅ SUCCESS! Publisher assigned through pricing calculation');
        console.log('\n🔄 REFRESH YOUR BROWSER PAGE to see the publisher!');
      } else {
        console.log('❌ Could not calculate publisher attribution');
        console.log('   No offerings available for this website');
      }
    } catch (error) {
      console.error('❌ Error calculating pricing:', error.message);
    }
  }
}

assignPublisherToLineItem()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });