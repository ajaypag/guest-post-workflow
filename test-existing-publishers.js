const { Pool } = require('pg');

async function testExistingPublishers() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'guest_post_workflow',
    password: 'postgres',
    port: 5434,
  });

  try {
    // Check existing active publishers
    console.log('=== EXISTING ACTIVE PUBLISHERS ===');
    const activePublishers = await pool.query(`
      SELECT id, email, contact_name, company_name, account_status 
      FROM publishers 
      WHERE account_status = 'active' 
      LIMIT 5
    `);
    
    if (activePublishers.rows.length === 0) {
      console.log('No active publishers found. Creating test publisher...');
      
      // Create a test active publisher
      const result = await pool.query(`
        INSERT INTO publishers (
          id, email, contact_name, company_name, account_status, 
          password, status, email_verified, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 
          'john@techblog.com', 
          'John Smith', 
          'TechBlog Media', 
          'active',
          '$2b$12$dummy.hash.for.testing.purposes.only.12345678901234',
          'active',
          true,
          NOW(),
          NOW()
        ) RETURNING id, email, contact_name, company_name, account_status
      `);
      
      console.log('Created test publisher:', result.rows[0]);
      
      // Create associated website
      const websiteResult = await pool.query(`
        INSERT INTO websites (
          id, domain, source, status, 
          airtable_created_at, airtable_updated_at, 
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          'techblog.com',
          'manual',
          'active',
          NOW(),
          NOW(),
          NOW(),
          NOW()
        ) RETURNING id, domain
      `);
      
      console.log('Created website:', websiteResult.rows[0]);
      
      // Create publisher-website relationship
      await pool.query(`
        INSERT INTO publisher_websites (
          id, publisher_id, website_id, added_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          NOW()
        )
      `, [result.rows[0].id, websiteResult.rows[0].id]);
      
      // Create an offering
      const offeringResult = await pool.query(`
        INSERT INTO publisher_offerings (
          publisher_id, offering_type, base_price, currency,
          turnaround_days, current_availability, is_active,
          created_at, updated_at
        ) VALUES (
          $1, 'guest_post', 150, 'USD', 7, 'available', true,
          NOW(), NOW()
        ) RETURNING id, offering_type, base_price
      `, [result.rows[0].id]);
      
      console.log('Created offering:', offeringResult.rows[0]);
      
      console.log('\n✅ Test publisher setup complete!');
      return result.rows[0];
      
    } else {
      console.log('Found existing active publishers:');
      activePublishers.rows.forEach((pub, i) => {
        console.log(`${i + 1}. ${pub.email} (${pub.contact_name}) - ${pub.account_status}`);
      });
      return activePublishers.rows[0];
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

testExistingPublishers().catch(console.error);