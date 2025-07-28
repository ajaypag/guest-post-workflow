import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Running DataForSEO caching migration...');
    
    const migrationPath = path.join(process.cwd(), 'migrations/0003_add_dataforseo_caching_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration completed successfully!');
    console.log('Added columns:');
    console.log('- bulk_analysis_domains.dataforseo_searched_keywords');
    console.log('- bulk_analysis_domains.dataforseo_last_full_analysis_at');
    console.log('- bulk_analysis_domains.dataforseo_total_api_calls');
    console.log('- bulk_analysis_domains.dataforseo_incremental_api_calls');
    console.log('- keyword_analysis_results.analysis_batch_id');
    console.log('- keyword_analysis_results.is_incremental');
    console.log('\nCreated indexes for performance optimization');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();