import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('🚀 Starting ManyReach migrations...\n');
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_prod',
  });
  const db = drizzle(pool);

  const migrations = [
    '0090_campaign_analysis_history.sql',
    '0094_add_manyreach_import_tracking.sql'
  ];

  for (const migrationFile of migrations) {
    try {
      console.log(`📋 Running migration: ${migrationFile}`);
      
      const migrationPath = path.join(process.cwd(), 'migrations', migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await db.execute(sql.raw(statement));
          console.log(`  ✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (err: any) {
          if (err.message.includes('already exists')) {
            console.log(`  ⏭️  Already exists: ${statement.substring(0, 50)}...`);
          } else {
            console.error(`  ❌ Failed: ${statement.substring(0, 50)}...`);
            console.error(`     Error: ${err.message}`);
          }
        }
      }
      
      console.log(`✅ Migration ${migrationFile} completed\n`);
    } catch (error: any) {
      console.error(`❌ Failed to run migration ${migrationFile}:`, error.message);
      process.exit(1);
    }
  }

  // Verify tables exist
  console.log('🔍 Verifying tables...\n');
  
  const tablesToCheck = [
    'campaign_analysis_history',
    'manyreach_campaign_imports', 
    'manyreach_ignored_emails'
  ];

  for (const table of tablesToCheck) {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        )
      `);
      
      const exists = (result as any).rows[0].exists;
      console.log(`  ${exists ? '✅' : '❌'} Table ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
    } catch (error: any) {
      console.error(`  ❌ Error checking table ${table}:`, error.message);
    }
  }

  console.log('\n✨ Migration process complete!');
  
  // Close database connection
  await pool.end();
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});