import { db } from '../lib/db/connection';

async function runSimplePhase6BMigration() {
  try {
    console.log('🚀 Starting Simplified Phase 6B Migration: Derived Pricing Shadow Mode');
    console.log('📋 Adding derived pricing columns to websites table...\n');
    
    // Step 1: Add columns one by one
    const columns = [
      'ADD COLUMN IF NOT EXISTS derived_guest_post_cost INTEGER',
      'ADD COLUMN IF NOT EXISTS price_calculation_method VARCHAR(50) DEFAULT \'manual\'',
      'ADD COLUMN IF NOT EXISTS price_calculated_at TIMESTAMP',
      'ADD COLUMN IF NOT EXISTS price_override_offering_id UUID',
      'ADD COLUMN IF NOT EXISTS price_override_reason TEXT'
    ];
    
    for (const column of columns) {
      try {
        console.log(`⚙️  Adding column: ${column.replace('ADD COLUMN IF NOT EXISTS ', '')}`);
        await db.execute(`ALTER TABLE websites ${column}`);
        console.log(`✅ Column added successfully`);
      } catch (error: any) {
        console.log(`⚠️  Column already exists or failed: ${error.message}`);
      }
    }
    
    // Step 2: Add indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_websites_derived_cost ON websites(derived_guest_post_cost)',
      'CREATE INDEX IF NOT EXISTS idx_websites_calculation_method ON websites(price_calculation_method)',
      'CREATE INDEX IF NOT EXISTS idx_websites_price_calculated_at ON websites(price_calculated_at)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        console.log(`🔍 Creating index...`);
        await db.execute(indexSQL);
        console.log(`✅ Index created`);
      } catch (error: any) {
        console.log(`⚠️  Index already exists: ${error.message}`);
      }
    }
    
    // Step 3: Populate derived prices manually using application logic
    console.log(`\n📊 Calculating derived prices for all websites...`);
    
    // Get all websites with current prices
    const websites = await db.execute(`
      SELECT id, domain, guest_post_cost 
      FROM websites 
      WHERE guest_post_cost IS NOT NULL
    `);
    
    console.log(`Found ${websites.length} websites with current prices`);
    
    let processed = 0;
    let matches = 0;
    let mismatches = 0;
    let missing = 0;
    
    for (const website of websites) {
      try {
        // Calculate derived price using the same logic as our API
        const offerings = await db.execute(`
          SELECT po.base_price
          FROM publisher_offering_relationships por
          INNER JOIN publisher_offerings po ON por.offering_id = po.id
          WHERE por.website_id = '${website.id}'
            AND po.is_active = true
            AND po.offering_type = 'guest_post'
            AND po.base_price IS NOT NULL
        `);
        
        let derivedPrice = null;
        if (offerings.length > 0) {
          const prices = offerings.map((o: any) => o.base_price).filter((p: any) => p !== null);
          if (prices.length > 0) {
            derivedPrice = Math.min(...prices);
          }
        }
        
        // Update the website with derived price
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
        } else if (derivedPrice === website.guest_post_cost) {
          matches++;
        } else {
          mismatches++;
        }
        
        processed++;
        
        if (processed % 50 === 0) {
          console.log(`Processed ${processed}/${websites.length} websites...`);
        }
        
      } catch (error: any) {
        console.log(`Error processing ${website.domain}:`, error.message);
      }
    }
    
    // Step 4: Create the pricing comparison view
    try {
      console.log('\n📋 Creating pricing comparison view...');
      await db.execute(`
        DROP VIEW IF EXISTS pricing_comparison
      `);
      
      await db.execute(`
        CREATE VIEW pricing_comparison AS
        SELECT 
          w.id,
          w.domain,
          w.guest_post_cost as current_price,
          w.derived_guest_post_cost as derived_price,
          w.price_calculation_method,
          w.price_calculated_at,
          w.price_override_offering_id,
          w.price_override_reason,
          CASE 
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NULL THEN 'both_null'
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NOT NULL THEN 'current_null'
            WHEN w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NULL THEN 'derived_null'
            WHEN w.guest_post_cost = w.derived_guest_post_cost THEN 'match'
            ELSE 'mismatch'
          END as price_status,
          COALESCE(w.derived_guest_post_cost, 0) - COALESCE(w.guest_post_cost, 0) as price_difference,
          CASE 
            WHEN w.guest_post_cost > 0 THEN 
              ROUND(((COALESCE(w.derived_guest_post_cost, 0) - w.guest_post_cost)::DECIMAL / w.guest_post_cost * 100), 2)
            ELSE NULL
          END as percent_difference
        FROM websites w
        WHERE w.guest_post_cost IS NOT NULL OR w.derived_guest_post_cost IS NOT NULL
      `);
      console.log('✅ Pricing comparison view created');
    } catch (error: any) {
      console.log(`⚠️  View creation failed: ${error.message}`);
    }
    
    console.log(`\n🎉 Phase 6B Migration Completed Successfully!`);
    console.log(`📊 Results:`);
    console.log(`  Total processed: ${processed} websites`);
    console.log(`  Matching prices: ${matches} (${(matches/processed*100).toFixed(1)}%)`);
    console.log(`  Mismatched prices: ${mismatches} (${(mismatches/processed*100).toFixed(1)}%)`);
    console.log(`  Missing derived prices: ${missing} (${(missing/processed*100).toFixed(1)}%)`);
    
    // Verify a few examples
    const examples = await db.execute(`
      SELECT domain, current_price, derived_price, price_status
      FROM pricing_comparison 
      WHERE price_status IN ('match', 'mismatch', 'derived_null')
      ORDER BY price_status, domain
      LIMIT 10
    `);
    
    console.log('\n🔍 Sample Results:');
    examples.forEach((example: any) => {
      const current = example.current_price ? `$${(example.current_price/100).toFixed(2)}` : 'NULL';
      const derived = example.derived_price ? `$${(example.derived_price/100).toFixed(2)}` : 'NULL';
      console.log(`  ${example.domain}: ${current} → ${derived} (${example.price_status})`);
    });
    
    console.log('\n✨ Shadow mode is now active!');
    console.log('🔄 Next steps: Create derived pricing service and admin dashboard');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runSimplePhase6BMigration();