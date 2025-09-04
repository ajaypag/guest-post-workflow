import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE importing database connection
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('Starting niche tracking migration...');
    
    // Add columns to websites table
    console.log('Adding columns to websites table...');
    await db.execute(sql`
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS last_niche_check TIMESTAMP,
      ADD COLUMN IF NOT EXISTS suggested_niches TEXT[],
      ADD COLUMN IF NOT EXISTS suggested_categories TEXT[],
      ADD COLUMN IF NOT EXISTS niche_confidence DECIMAL(3,2)
    `);
    console.log('✅ Added columns to websites table');

    // Create index
    console.log('Creating index...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_websites_last_niche_check 
      ON websites(last_niche_check)
    `);
    console.log('✅ Created index');

    // Create suggested tags table
    console.log('Creating suggested_tags table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suggested_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tag_name VARCHAR(255) NOT NULL,
        tag_type VARCHAR(50) NOT NULL CHECK (tag_type IN ('niche', 'category', 'website_type')),
        website_count INTEGER DEFAULT 1,
        example_websites TEXT[],
        first_suggested_at TIMESTAMP DEFAULT NOW(),
        approved BOOLEAN DEFAULT false,
        approved_at TIMESTAMP,
        approved_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(tag_name, tag_type)
      )
    `);
    console.log('✅ Created suggested_tags table');

    // Create indexes for suggested tags
    console.log('Creating indexes for suggested_tags...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_suggested_tags_type ON suggested_tags(tag_type)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_suggested_tags_approved ON suggested_tags(approved)
    `);
    console.log('✅ Created indexes for suggested_tags');

    // Test query to verify columns exist
    console.log('Verifying migration...');
    const result = await db.execute(sql`
      SELECT 
        column_name, 
        data_type 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
        AND column_name IN ('last_niche_check', 'suggested_niches', 'suggested_categories', 'niche_confidence')
    `);
    
    console.log('Columns found:', result.rows);
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();