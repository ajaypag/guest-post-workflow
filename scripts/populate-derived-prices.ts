import { db } from '../lib/db/connection';
import { websites } from '../lib/db/websiteSchema';
import { publisherOfferingRelationships, publisherOfferings } from '../lib/db/publisherSchemaActual';
import { eq, and, isNotNull } from 'drizzle-orm';

async function populateDerivedPrices() {
  try {
    console.log('🚀 Populating derived prices for all websites...');
    
    // Get all websites with current prices using Drizzle
    const websitesWithPrices = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        currentPrice: websites.guestPostCost,
      })
      .from(websites)
      .where(isNotNull(websites.guestPostCost));
    
    console.log(`📊 Found ${websitesWithPrices.length} websites with current prices`);
    
    let processed = 0;
    let matches = 0;
    let mismatches = 0;
    let missing = 0;
    
    for (const website of websitesWithPrices) {
      try {
        // Calculate derived price using our established logic
        const offerings = await db
          .select({
            basePrice: publisherOfferings.basePrice,
          })
          .from(publisherOfferingRelationships)
          .innerJoin(
            publisherOfferings,
            eq(publisherOfferingRelationships.offeringId, publisherOfferings.id)
          )
          .where(
            and(
              eq(publisherOfferingRelationships.websiteId, website.id),
              eq(publisherOfferings.isActive, true),
              eq(publisherOfferings.offeringType, 'guest_post'),
              isNotNull(publisherOfferings.basePrice)
            )
          );
        
        let derivedPrice = null;
        if (offerings.length > 0) {
          const prices = offerings
            .map(o => o.basePrice)
            .filter(p => p !== null && p !== undefined) as number[];
          if (prices.length > 0) {
            derivedPrice = Math.min(...prices);
          }
        }
        
        // Update the website with derived price using raw SQL since Drizzle might not support the new columns yet
        await db.execute(`
          UPDATE websites 
          SET 
            derived_guest_post_cost = ${derivedPrice || 'NULL'},
            price_calculation_method = 'auto_min',
            price_calculated_at = NOW()
          WHERE id = '${website.id}'
        `);
        
        // Track statistics
        if (derivedPrice === null) {
          missing++;
        } else if (derivedPrice === website.currentPrice) {
          matches++;
        } else {
          mismatches++;
        }
        
        processed++;
        
        if (processed % 100 === 0) {
          console.log(`Processed ${processed}/${websitesWithPrices.length} websites... (${matches} matches, ${mismatches} mismatches, ${missing} missing)`);
        }
        
      } catch (error: any) {
        console.log(`❌ Error processing ${website.domain}:`, error.message);
      }
    }
    
    console.log(`\n✅ Derived price calculation completed!`);
    console.log(`📊 Final Results:`);
    console.log(`  Total processed: ${processed} websites`);
    console.log(`  Matching prices: ${matches} (${(matches/processed*100).toFixed(1)}%)`);
    console.log(`  Mismatched prices: ${mismatches} (${(mismatches/processed*100).toFixed(1)}%)`);
    console.log(`  Missing derived prices: ${missing} (${(missing/processed*100).toFixed(1)}%)`);
    
    // Create a simple comparison view
    try {
      await db.execute(`DROP VIEW IF EXISTS pricing_comparison`);
      await db.execute(`
        CREATE VIEW pricing_comparison AS
        SELECT 
          w.id,
          w.domain,
          w.guest_post_cost as current_price,
          w.derived_guest_post_cost as derived_price,
          w.price_calculation_method,
          w.price_calculated_at,
          CASE 
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NULL THEN 'both_null'
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NOT NULL THEN 'current_null'
            WHEN w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NULL THEN 'derived_null'
            WHEN w.guest_post_cost = w.derived_guest_post_cost THEN 'match'
            ELSE 'mismatch'
          END as price_status,
          COALESCE(w.derived_guest_post_cost, 0) - COALESCE(w.guest_post_cost, 0) as price_difference
        FROM websites w
        WHERE w.guest_post_cost IS NOT NULL OR w.derived_guest_post_cost IS NOT NULL
      `);
      console.log(`✅ Created pricing_comparison view`);
    } catch (error: any) {
      console.log(`⚠️  View creation failed: ${error.message}`);
    }
    
    // Show some examples
    try {
      const examples = await db.execute(`
        SELECT domain, current_price, derived_price, price_status
        FROM pricing_comparison 
        WHERE price_status IN ('match', 'mismatch', 'derived_null')
        ORDER BY price_status, domain
        LIMIT 15
      `);
      
      console.log(`\n🔍 Sample Results:`);
      examples.forEach((example: any) => {
        const current = example.current_price ? `$${(example.current_price/100).toFixed(2)}` : 'NULL';
        const derived = example.derived_price ? `$${(example.derived_price/100).toFixed(2)}` : 'NULL';
        console.log(`  ${example.domain}: ${current} → ${derived} (${example.price_status})`);
      });
    } catch (error: any) {
      console.log(`⚠️  Could not show examples: ${error.message}`);
    }
    
    console.log(`\n🎉 Phase 6B Shadow Mode is now fully operational!`);
    console.log(`🔄 Next steps:`);
    console.log(`  1. Create derived pricing service`);
    console.log(`  2. Build admin dashboard for monitoring`);
    console.log(`  3. Test feature flag integration`);
    console.log(`  4. Monitor accuracy for 1-2 weeks before Phase 6C`);
    
  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

populateDerivedPrices();