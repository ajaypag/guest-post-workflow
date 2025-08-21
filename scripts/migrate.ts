import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('⚠️ DATABASE_URL not available during build - skipping migrations');
    console.log('💡 Migrations will run automatically at startup');
    process.exit(0);
  }
  
  const pool = new Pool({
    connectionString,
    ssl: false, // Coolify PostgreSQL doesn't use SSL
  });
  
  const db = drizzle(pool);
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Run migrations
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    console.log('✅ Migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();