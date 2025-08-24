import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runTargetUrlMigration() {
  try {
    console.log('Running target URL matching migration...');
    
    const migrationPath = path.join(process.cwd(), 'migrations/0060_add_target_url_matching.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Migration SQL to execute:');
    console.log(migrationSQL);
    console.log('\n--- Executing migration ---\n');
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration completed successfully!');
    console.log('Added columns to bulk_analysis_domains:');
    console.log('- suggested_target_url (TEXT)');
    console.log('- target_match_data (JSONB)');  
    console.log('- target_matched_at (TIMESTAMP)');
    console.log('\nCreated indexes:');
    console.log('- idx_bulk_domains_suggested_target');
    console.log('- idx_bulk_domains_target_matched_at');
    
    // Test the new columns by checking table structure
    console.log('\nVerifying table structure...');
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'bulk_analysis_domains' 
      AND column_name IN ('suggested_target_url', 'target_match_data', 'target_matched_at')
      ORDER BY column_name;
    `);
    
    console.log('New columns confirmed:');
    result.rows.forEach((row: any) => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Test that we can query the new columns without errors
    console.log('\nTesting query with new columns...');
    const testQuery = await db.execute(sql`
      SELECT id, suggested_target_url, target_match_data, target_matched_at 
      FROM bulk_analysis_domains 
      LIMIT 1;
    `);
    console.log(`Query successful - returned ${testQuery.rowCount} rows`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runTargetUrlMigration();