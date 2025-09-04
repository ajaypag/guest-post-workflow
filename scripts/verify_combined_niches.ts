// Verify the combined niches solution works correctly
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_prod';

async function verifyCombinedNiches() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('Connecting to database...\n');
    const client = await pool.connect();
    
    try {
      // First update with combined niches
      console.log('1. Updating website with COMBINED niches (existing + suggested)...');
      const updateResult = await client.query(`
        UPDATE websites
        SET 
          niche = ARRAY['Sports', 'Sports Betting', 'Soccer Predictions']::TEXT[],
          categories = ARRAY['Leisure & Hobbies', 'Media & Publishing']::TEXT[],
          website_type = ARRAY['Blog', 'Service']::TEXT[],
          suggested_niches = ARRAY['Sports Betting', 'Soccer Predictions']::TEXT[],
          suggested_categories = ARRAY['Gambling & Betting']::TEXT[],
          last_niche_check = NOW(),
          updated_at = NOW()
        WHERE domain = '007soccerpicks.net'
        RETURNING domain, niche, suggested_niches, categories, suggested_categories
      `);
      
      if (updateResult.rows.length > 0) {
        const data = updateResult.rows[0];
        console.log('\n✅ Website updated successfully!');
        console.log('   Domain:', data.domain);
        console.log('   Main niches (combined):', data.niche);
        console.log('   Suggested niches:', data.suggested_niches);
        console.log('   Categories:', data.categories);
        console.log('   Suggested categories:', data.suggested_categories);
      }
      
      // Check if niches exist in main niches table
      console.log('\n2. Checking niches table...');
      const nichesCheck = await client.query(`
        SELECT name, source 
        FROM niches 
        WHERE name IN ('Sports Betting', 'Soccer Predictions', 'Sports')
        ORDER BY name
      `);
      
      console.log('   Existing niches in main table:');
      for (const niche of nichesCheck.rows) {
        console.log(`   - ${niche.name} (source: ${niche.source || 'manual'})`);
      }
      
      // Add missing niches
      const existingNames = nichesCheck.rows.map(r => r.name);
      const toAdd = ['Sports Betting', 'Soccer Predictions'].filter(n => !existingNames.includes(n));
      
      if (toAdd.length > 0) {
        console.log('\n3. Adding new niches to main niches table...');
        for (const nicheName of toAdd) {
          await client.query(`
            INSERT INTO niches (name, source, created_at, updated_at)
            VALUES ($1, 'o3_suggested', NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
          `, [nicheName]);
          console.log(`   ✅ Added: ${nicheName}`);
        }
      } else {
        console.log('\n3. All niches already exist in main table ✓');
      }
      
      // Final verification
      console.log('\n4. Final verification - querying website...');
      const finalCheck = await client.query(`
        SELECT domain, niche, suggested_niches
        FROM websites
        WHERE domain = '007soccerpicks.net'
      `);
      
      if (finalCheck.rows.length > 0) {
        const final = finalCheck.rows[0];
        console.log('   Domain:', final.domain);
        console.log('   Niches (should have 3):', final.niche);
        console.log('   Count:', final.niche.length);
        
        if (final.niche.length === 3 && 
            final.niche.includes('Sports') && 
            final.niche.includes('Sports Betting') && 
            final.niche.includes('Soccer Predictions')) {
          console.log('\n🎉 SUCCESS! Website has all 3 niches (existing + suggested combined)');
        } else {
          console.log('\n❌ ERROR: Expected 3 niches but found:', final.niche);
        }
      }
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

verifyCombinedNiches();