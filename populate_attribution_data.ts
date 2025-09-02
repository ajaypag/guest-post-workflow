import { db } from './lib/db/connection';
import { websites } from './lib/db/websiteSchema';
import { publisherOfferings } from './lib/db/publisherSchemaActual';
import { DerivedPricingService } from './lib/services/derivedPricingService';
import { eq, isNotNull, limit } from 'drizzle-orm';

async function populateAttributionData() {
  console.log('🔄 Populating attribution data for testing...');
  
  try {
    // Get websites that have pricing but no attribution
    const websitesNeedingAttribution = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        pricingStrategy: websites.pricingStrategy
      })
      .from(websites)
      .where(isNotNull(websites.guestPostCost))
      .limit(10);
    
    console.log(`Found ${websitesNeedingAttribution.length} websites that need attribution data`);
    
    let updated = 0;
    
    for (const website of websitesNeedingAttribution) {
      try {
        console.log(`\nProcessing ${website.domain}...`);
        
        // Calculate derived price to get attribution
        const result = await DerivedPricingService.calculateDerivedPrice(website.id);
        
        if (result.selectedOfferingId && result.selectedPublisherId) {
          // Update the website with attribution data
          await db
            .update(websites)
            .set({
              selectedOfferingId: result.selectedOfferingId,
              selectedPublisherId: result.selectedPublisherId,
              selectedAt: new Date(),
            })
            .where(eq(websites.id, website.id));
          
          console.log(`✅ Updated ${website.domain} with attribution:`);
          console.log(`   Publisher: ${result.selectedPublisherId.slice(0, 8)}`);
          console.log(`   Offering: ${result.selectedOfferingId.slice(0, 8)}`);
          console.log(`   Price: $${result.price}`);
          
          updated++;
        } else {
          console.log(`⚠️  ${website.domain} - no attribution available (price: $${result.price})`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${website.domain}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updated} websites with attribution data`);
    
    // Show summary
    const attributedWebsites = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        selectedOfferingId: websites.selectedOfferingId,
        selectedPublisherId: websites.selectedPublisherId
      })
      .from(websites)
      .where(isNotNull(websites.selectedOfferingId))
      .limit(5);
    
    console.log('\n📊 Sample attributed websites:');
    for (const website of attributedWebsites) {
      console.log(`   - ${website.domain}: ${website.selectedPublisherId.slice(0, 8)}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Attribution population failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  populateAttributionData().catch(console.error);
}