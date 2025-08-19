const { Pool } = require('pg');

async function testDbDirect() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost', 
    database: 'guest_post_workflow',
    password: 'postgres',
    port: 5434,
  });

  try {
    console.log('=== TESTING DATABASE CONNECTION ===');
    
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    
    // Check if publishers table exists
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('publishers', 'websites', 'publisher_websites')
      ORDER BY table_name
    `);
    
    console.log('\n=== AVAILABLE TABLES ===');
    tablesCheck.rows.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });
    
    if (tablesCheck.rows.length === 0) {
      console.log('❌ No expected tables found. Need to apply migrations.');
      
      // Apply shadow publisher migration directly
      console.log('\n=== APPLYING SHADOW PUBLISHER MIGRATION ===');
      
      const migration = `
        -- Add shadow publisher support fields to publishers table
        ALTER TABLE publishers 
          ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'unclaimed',
          ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
          ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255),
          ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
          ADD COLUMN IF NOT EXISTS claim_verification_code VARCHAR(6),
          ADD COLUMN IF NOT EXISTS claim_attempts INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS last_claim_attempt TIMESTAMP;
      `;
      
      await pool.query(migration);
      console.log('✅ Applied shadow publisher migration');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

testDbDirect().catch(console.error);