import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

async function updateDatabase() {
  try {
    console.log('Updating database with niche data...');
    
    // First check if website exists
    const checkQuery = sql`
      SELECT id, domain 
      FROM websites 
      WHERE domain = '007soccerpicks.net'
    `;
    
    const checkResult = await db.execute(checkQuery);
    
    if (checkResult.rows.length === 0) {
      console.error('Website 007soccerpicks.net not found in database!');
      process.exit(1);
    }
    
    const websiteId = checkResult.rows[0].id;
    console.log(`Found website with ID: ${websiteId}`);
    
    // Update the website with the O3 analysis data
    const updateQuery = sql`
      UPDATE websites
      SET 
        niche = ARRAY['Sports']::TEXT[],
        categories = ARRAY['Leisure & Hobbies', 'Media & Publishing']::TEXT[],
        website_type = ARRAY['Blog', 'Service']::TEXT[],
        suggested_niches = ARRAY['Sports Betting', 'Soccer Predictions']::TEXT[],
        suggested_categories = ARRAY['Gambling & Betting']::TEXT[],
        last_niche_check = NOW(),
        updated_at = NOW()
      WHERE id = ${websiteId}
      RETURNING domain, niche, categories, website_type, suggested_niches, suggested_categories, last_niche_check
    `;
    
    console.log('Executing update query...');
    const result = await db.execute(updateQuery);
    
    if (result.rows.length > 0) {
      console.log('\n✅ Database updated successfully!');
      console.log('Updated data:');
      console.log('Domain:', result.rows[0].domain);
      console.log('Niches:', result.rows[0].niche);
      console.log('Categories:', result.rows[0].categories);
      console.log('Website Types:', result.rows[0].website_type);
      console.log('Suggested Niches:', result.rows[0].suggested_niches);
      console.log('Suggested Categories:', result.rows[0].suggested_categories);
      console.log('Last Check:', result.rows[0].last_niche_check);
    } else {
      console.error('Update failed - no rows returned');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Database error:', err);
    process.exit(1);
  }
}

updateDatabase();