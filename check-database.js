// Check what was created in the database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_test'
});

async function checkDatabase() {
  try {
    console.log('=== Checking Publishers ===');
    // First check what columns exist
    const publisherColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'publishers'
    `);
    console.log('Publisher columns:', publisherColumns.rows.map(r => r.column_name));
    
    const publishers = await pool.query(`
      SELECT * 
      FROM publishers 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.log('Publishers:', publishers.rows);

    console.log('\n=== Checking Websites ===');
    const websites = await pool.query(`
      SELECT id, domain, source, status, created_at 
      FROM websites 
      WHERE source = 'manyreach'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('ManyReach Websites:', websites.rows);

    console.log('\n=== Checking All Tables ===');
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('All tables:', tables.rows.map(r => r.table_name));
    
    console.log('\n=== Checking Website-related tables ===');
    const websiteTables = tables.rows.filter(r => r.table_name.includes('website'));
    console.log('Website tables:', websiteTables.map(r => r.table_name));
    
    console.log('\n=== Checking Shadow Publisher Websites ===');
    if (websiteTables.find(t => t.table_name === 'shadow_publisher_websites')) {
      const shadowWebsites = await pool.query(`
        SELECT spw.id, spw.publisher_id, spw.website_id, spw.confidence, spw.verified, w.domain
        FROM shadow_publisher_websites spw
        LEFT JOIN websites w ON w.id = spw.website_id
        ORDER BY spw.created_at DESC
        LIMIT 5
      `);
      console.log('Shadow Publisher Websites:', shadowWebsites.rows);
    } else {
      console.log('shadow_publisher_websites table not found');
    }

    console.log('\n=== Checking Email Processing Logs ===');
    const logs = await pool.query(`
      SELECT id, sender_email, confidence_score, status, created_at
      FROM email_processing_logs 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.log('Email Logs:', logs.rows);

  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();