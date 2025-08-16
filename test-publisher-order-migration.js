const { Pool } = require('pg');
require('dotenv').config();

async function testMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Testing publisher order fields migration...');
    
    // Add publisher tracking columns
    await pool.query(`
      ALTER TABLE order_line_items 
      ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS publisher_offering_id UUID REFERENCES publisher_offerings(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS publisher_status VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS publisher_price INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS publisher_notified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS publisher_accepted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS publisher_submitted_at TIMESTAMP
    `);
    
    console.log('✅ Publisher fields added');
    
    // Add indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_id ON order_line_items(publisher_id);
      CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_status ON order_line_items(publisher_status);
      CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_offering ON order_line_items(publisher_offering_id);
    `);
    
    console.log('✅ Indexes created');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'order_line_items' 
      AND column_name LIKE 'publisher%'
      ORDER BY column_name
    `);
    
    console.log('\n📊 Publisher columns in order_line_items:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if publishers table exists
    const publishersCheck = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name = 'publishers'
    `);
    
    console.log(`\n✅ Publishers table exists: ${publishersCheck.rows[0].count > 0}`);
    
    // Check if publisher_offerings table exists
    const offeringsCheck = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name = 'publisher_offerings'
    `);
    
    console.log(`✅ Publisher offerings table exists: ${offeringsCheck.rows[0].count > 0}`);
    
    console.log('\n✅ Migration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testMigration();