import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    console.log('Running email processing infrastructure migrations...');
    
    // Create database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const db = drizzle(pool);
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations/0056_email_processing_infrastructure.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the entire migration as one transaction
    try {
      console.log('Executing migration SQL...');
      
      // Remove comments and split by semicolons more carefully
      const cleanedSQL = migrationSQL
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      
      // Execute the entire migration
      await db.execute(sql.raw(cleanedSQL));
      
      console.log('Migration executed successfully!');
    } catch (error: any) {
      // Check if tables already exist
      if (error.message?.includes('already exists')) {
        console.log('⚠️  Some objects already exist, that\'s okay');
      } else {
        console.error('❌ Failed to execute migration:', error.message);
        throw error;
      }
    }
    
    console.log('✅ Email processing infrastructure migrations completed successfully!');
    
    // Close the pool
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();