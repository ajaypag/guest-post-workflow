// Force update the database with niche data
import { Pool } from 'pg';

// Use the same connection string as the app
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_prod';

async function forceUpdate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      // First check if website exists
      const checkResult = await client.query(
        "SELECT id, domain, niche, categories FROM websites WHERE domain = '007soccerpicks.net'"
      );
      
      if (checkResult.rows.length === 0) {
        console.error('Website not found!');
        return;
      }
      
      console.log('Current data:', checkResult.rows[0]);
      
      // Update with O3 analysis data
      const updateResult = await client.query(`
        UPDATE websites
        SET 
          niche = ARRAY['Sports']::TEXT[],
          categories = ARRAY['Leisure & Hobbies', 'Media & Publishing']::TEXT[],
          website_type = ARRAY['Blog', 'Service']::TEXT[],
          suggested_niches = ARRAY['Sports Betting', 'Soccer Predictions']::TEXT[],
          suggested_categories = ARRAY['Gambling & Betting']::TEXT[],
          last_niche_check = NOW(),
          updated_at = NOW()
        WHERE domain = '007soccerpicks.net'
        RETURNING domain, niche, categories, website_type, suggested_niches, suggested_categories, last_niche_check
      `);
      
      if (updateResult.rows.length > 0) {
        console.log('\n✅ DATABASE UPDATED SUCCESSFULLY!');
        console.log('New data:', updateResult.rows[0]);
      } else {
        console.error('Update failed!');
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

forceUpdate();