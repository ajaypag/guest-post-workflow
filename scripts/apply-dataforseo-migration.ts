import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyMigrations() {
  try {
    console.log('Applying DataForSEO migrations...');
    
    // Check if keyword_analysis_results table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'keyword_analysis_results'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating keyword_analysis_results table...');
      
      // Read and apply migration 0005
      const migration5Path = path.join(process.cwd(), 'lib/db/migrations/0005_add_dataforseo_tables.sql');
      const migration5SQL = fs.readFileSync(migration5Path, 'utf-8');
      await db.execute(sql.raw(migration5SQL));
      console.log('✅ Created DataForSEO tables');
    } else {
      console.log('keyword_analysis_results table already exists');
    }
    
    // Check if analysis_batch_id column exists
    const columnCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'keyword_analysis_results' 
        AND column_name = 'analysis_batch_id'
      );
    `);
    
    if (!columnCheck.rows[0].exists) {
      console.log('Adding missing columns to keyword_analysis_results...');
      
      // Read and apply migration 0007
      const migration7Path = path.join(process.cwd(), 'lib/db/migrations/0007_add_dataforseo_batch_columns.sql');
      const migration7SQL = fs.readFileSync(migration7Path, 'utf-8');
      await db.execute(sql.raw(migration7SQL));
      console.log('✅ Added batch analysis columns');
    } else {
      console.log('analysis_batch_id column already exists');
    }
    
    console.log('\n✅ All migrations applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigrations();