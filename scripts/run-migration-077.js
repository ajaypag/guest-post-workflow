const { Client } = require('pg');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow?sslmode=disable';
  
  console.log('🔄 Running migration 0077: Add email verification rate limiting...');
  
  const client = new Client({
    connectionString
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Add rate limiting columns
    console.log('Adding rate limiting columns...');
    await client.query(`
      ALTER TABLE publisher_email_claims
      ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS daily_reset_at TIMESTAMP
    `);
    console.log('✅ Added rate limiting columns');
    
    // Add index
    console.log('Adding index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_publisher_email_claims_rate_limit 
      ON publisher_email_claims(publisher_id, website_id, verification_sent_at)
    `);
    console.log('✅ Added index');
    
    // Add comments
    console.log('Adding column comments...');
    await client.query(`
      COMMENT ON COLUMN publisher_email_claims.attempt_count IS 'Number of verification attempts in current period'
    `);
    await client.query(`
      COMMENT ON COLUMN publisher_email_claims.last_attempt_at IS 'Timestamp of the last verification attempt'
    `);
    await client.query(`
      COMMENT ON COLUMN publisher_email_claims.daily_reset_at IS 'When the daily attempt counter should reset'
    `);
    console.log('✅ Added comments');
    
    console.log('🎉 Migration 0077 completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

runMigration();