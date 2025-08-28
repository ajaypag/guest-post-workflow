import { db } from './lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Running intelligence generation logs migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations/0070_intelligence_generation_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Run the migration
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration completed successfully!');
    console.log('Table intelligence_generation_logs has been created.');
    
    // Verify the table exists
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'intelligence_generation_logs'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table verified in database');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();