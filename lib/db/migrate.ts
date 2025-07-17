import { db } from './connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

// Migration tracking table
async function ensureMigrationTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Run all pending migrations
export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Ensure migration tracking table exists
    await ensureMigrationTable();
    
    // Get list of executed migrations
    const executedMigrations = await db.execute(sql`
      SELECT filename FROM schema_migrations
    `);
    const executed = new Set(executedMigrations.rows.map(r => r.filename as string));
    
    // Read migration files
    const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    // Run pending migrations
    for (const file of sqlFiles) {
      if (executed.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }
      
      console.log(`🚀 Running migration: ${file}`);
      const content = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
      
      // Execute migration
      await db.execute(sql.raw(content));
      
      // Record migration
      await db.execute(sql`
        INSERT INTO schema_migrations (filename) VALUES (${file})
      `);
      
      console.log(`✅ Completed: ${file}`);
    }
    
    console.log('✅ All migrations completed');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run specific migration (for development/testing)
export async function runMigration(filename: string) {
  const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
  const filePath = path.join(migrationsDir, filename);
  
  console.log(`🚀 Running migration: ${filename}`);
  const content = await fs.readFile(filePath, 'utf-8');
  
  await db.execute(sql.raw(content));
  console.log(`✅ Completed: ${filename}`);
}