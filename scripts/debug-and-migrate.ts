import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function debugAndMigrate() {
  console.log('🔍 Starting database debug and migration...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('Available environment variables:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER ? '[SET]' : '[NOT SET]');
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]');
    process.exit(1);
  }
  
  console.log('🔗 Using connection string:', connectionString.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));
  
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  const db = drizzle(pool);
  
  try {
    // Test basic connection
    console.log('🔌 Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database connection successful');
    console.log('📊 Database info:', testResult.rows[0]);
    
    // Check if gen_random_uuid() function is available
    console.log('🆔 Testing UUID generation...');
    try {
      const uuidTest = await pool.query('SELECT gen_random_uuid() as test_uuid');
      console.log('✅ UUID generation works:', uuidTest.rows[0].test_uuid);
    } catch (error) {
      console.log('❌ UUID generation failed:', error.message);
      console.log('📝 Trying to enable uuid-ossp extension...');
      try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('✅ UUID extension enabled');
      } catch (extensionError) {
        console.log('❌ Failed to enable UUID extension:', extensionError.message);
      }
    }
    
    // Check existing tables
    console.log('📋 Checking existing tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📊 Existing tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check if migration table exists
    const migrationTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      ) as exists
    `);
    
    if (migrationTableResult.rows[0].exists) {
      console.log('📝 Migration table exists, checking status...');
      const migrations = await pool.query('SELECT * FROM __drizzle_migrations ORDER BY created_at');
      console.log('📊 Applied migrations:', migrations.rows);
    } else {
      console.log('❓ Migration table does not exist');
    }
    
    // Run migrations
    console.log('🚀 Running migrations...');
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    console.log('✅ Migrations completed successfully');
    
    // Verify users table structure
    console.log('🔍 Verifying users table structure...');
    const usersTableResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('📊 Users table structure:', usersTableResult.rows);
    
    // Test a simple insert
    console.log('🧪 Testing user creation...');
    try {
      const testInsert = await pool.query(`
        INSERT INTO users (email, name, password_hash, role, is_active) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, email, name
      `, ['test@example.com', 'Test User', 'dummy_hash', 'user', true]);
      console.log('✅ Test insert successful:', testInsert.rows[0]);
      
      // Clean up test user
      await pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
      console.log('🧹 Test user cleaned up');
    } catch (insertError) {
      console.log('❌ Test insert failed:', insertError.message);
      console.log('📊 Full error:', insertError);
    }
    
  } catch (error) {
    console.error('❌ Process failed:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔚 Database connection closed');
  }
}

debugAndMigrate();