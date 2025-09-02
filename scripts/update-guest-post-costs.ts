import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

async function updateAllGuestPostCosts() {
  try {
    console.log('🔄 Starting one-time guest post cost calculation update...\n');
    
    // First, let's see how many websites need updating
    const websitesNeedingUpdate = await db.execute(sql`
      SELECT w.id, w.domain, w.guest_post_cost, w.pricing_strategy,
             COUNT(DISTINCT po.id) as offering_count
      FROM websites w
      LEFT JOIN publisher_offering_relationships por ON por.website_id = w.id
      LEFT JOIN publisher_offerings po ON po.id = por.offering_id 
        AND po.offering_type = 'guest_post' 
        AND po.is_active = true
      WHERE w.guest_post_cost IS NULL
        OR w.guest_post_cost_source IS NULL
      GROUP BY w.id, w.domain, w.guest_post_cost, w.pricing_strategy
      HAVING COUNT(DISTINCT po.id) > 0
      ORDER BY w.domain
    `);
    
    console.log(`Found ${websitesNeedingUpdate.rows.length} websites with offerings but missing/null guest_post_cost\n`);
    
    if (websitesNeedingUpdate.rows.length === 0) {
      console.log('✅ No websites need updating!');
      process.exit(0);
    }
    
    // Show a sample of what we found
    console.log('Sample of websites to update:');
    websitesNeedingUpdate.rows.slice(0, 5).forEach((row: any) => {
      console.log(`  - ${row.domain}: ${row.offering_count} offerings, current cost: ${row.guest_post_cost || 'NULL'}`);
    });
    
    console.log('\n🚀 Running calculate_and_update_guest_post_cost function for each website...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const row of websitesNeedingUpdate.rows) {
      try {
        // Call the PostgreSQL function to calculate and update the cost
        const result = await db.execute(sql`
          SELECT calculate_and_update_guest_post_cost(
            ${row.id}::uuid,
            ${row.pricing_strategy || 'min_price'}::varchar,
            NULL::uuid
          ) as calculated_cost
        `);
        
        const calculatedCost = result.rows[0]?.calculated_cost;
        
        if (calculatedCost !== null) {
          console.log(`✅ ${row.domain}: Updated to $${(calculatedCost / 100).toFixed(2)}`);
          successCount++;
        } else {
          console.log(`⚠️  ${row.domain}: No price calculated (might not have valid offerings)`);
          failCount++;
        }
      } catch (error) {
        console.error(`❌ ${row.domain}: Error - ${error.message}`);
        failCount++;
      }
    }
    
    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Successfully updated: ${successCount} websites`);
    console.log(`  ⚠️  Failed/No price: ${failCount} websites`);
    
    // Verify the update worked - check a specific example
    console.log('\n🔍 Verifying update - checking wanderingeducators.com...');
    const verifyResult = await db.execute(sql`
      SELECT domain, guest_post_cost, guest_post_cost_source, pricing_strategy
      FROM websites
      WHERE domain ILIKE '%wanderingeducators%'
      LIMIT 1
    `);
    
    if (verifyResult.rows.length > 0) {
      const website = verifyResult.rows[0];
      console.log(`  Domain: ${website.domain}`);
      console.log(`  Guest Post Cost: ${website.guest_post_cost ? '$' + (website.guest_post_cost / 100).toFixed(2) : 'NULL'}`);
      console.log(`  Source: ${website.guest_post_cost_source || 'NULL'}`);
      console.log(`  Strategy: ${website.pricing_strategy || 'NULL'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAllGuestPostCosts();