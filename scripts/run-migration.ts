import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path');
    process.exit(1);
  }
  
  try {
    const migrationPath = path.resolve(migrationFile);
    const sqlContent = await fs.readFile(migrationPath, 'utf-8');
    
    console.log(`Running migration: ${migrationFile}`);
    
    // Execute the migration
    await db.execute(sql.raw(sqlContent));
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();