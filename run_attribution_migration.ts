import { db } from './lib/db/connection';
import { sql } from 'drizzle-orm';

async function runAttributionMigration() {
  console.log('🔧 Running attribution fields migration...');
  
  try {
    // Add attribution fields to websites table
    await db.execute(sql`
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS selected_offering_id UUID,
      ADD COLUMN IF NOT EXISTS selected_publisher_id UUID,
      ADD COLUMN IF NOT EXISTS selected_at TIMESTAMP;
    `);
    
    console.log('✅ Added attribution columns to websites table');
    
    // Add comments
    await db.execute(sql`
      COMMENT ON COLUMN websites.selected_offering_id IS 'The offering that was selected to provide the current guest_post_cost (for min/max strategies)';
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN websites.selected_publisher_id IS 'The publisher who owns the selected offering';
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN websites.selected_at IS 'When the offering was selected/price was calculated';
    `);
    
    console.log('✅ Added column comments');
    
    // Add indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_websites_selected_offering ON websites(selected_offering_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_websites_selected_publisher ON websites(selected_publisher_id);
    `);
    
    console.log('✅ Added indexes for performance');
    
    // Try to add foreign key constraints (optional)
    try {
      await db.execute(sql`
        ALTER TABLE websites 
        ADD CONSTRAINT fk_websites_selected_offering 
        FOREIGN KEY (selected_offering_id) 
        REFERENCES publisher_offerings(id) 
        ON DELETE SET NULL;
      `);
      console.log('✅ Added foreign key constraint for offerings');
    } catch (error) {
      console.log('⚠️  Could not add offering foreign key constraint (may already exist):', error.message);
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE websites 
        ADD CONSTRAINT fk_websites_selected_publisher 
        FOREIGN KEY (selected_publisher_id) 
        REFERENCES publishers(id) 
        ON DELETE SET NULL;
      `);
      console.log('✅ Added foreign key constraint for publishers');
    } catch (error) {
      console.log('⚠️  Could not add publisher foreign key constraint (may already exist):', error.message);
    }
    
    console.log('\n🎉 Attribution migration completed successfully!');
    
    // Verify the migration worked
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name IN ('selected_offering_id', 'selected_publisher_id', 'selected_at');
    `);
    
    console.log('\n📊 Verification:');
    console.log(`Found ${result.length} attribution columns in websites table`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAttributionMigration().catch(console.error);
}