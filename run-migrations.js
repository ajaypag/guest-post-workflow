const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database URL from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow';

async function runMigrations() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    const migrationNumber = process.argv[2];
    
    if (!migrationNumber || (migrationNumber !== '55' && migrationNumber !== '56')) {
      console.log('Usage: node run-migrations.js [55|56]');
      process.exit(1);
    }
    
    const filename = migrationNumber === '55' 
      ? '0055_shadow_publisher_support.sql'
      : '0056_email_processing_infrastructure.sql';
    
    console.log(`\n🚀 Running migration: ${filename}`);
    console.log('='.repeat(50));
    
    // Read the migration file
    const filePath = path.join(__dirname, 'migrations', filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`📄 Loaded ${content.length} characters`);
    
    // Check if already applied
    if (migrationNumber === '55') {
      const check = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = 'publishers' 
        AND column_name = 'account_status'
      `);
      
      if (parseInt(check.rows[0].count) > 0) {
        console.log('✅ Migration 55 already applied (account_status column exists)');
        process.exit(0);
      }
    } else if (migrationNumber === '56') {
      const check = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = 'email_processing_logs'
      `);
      
      if (parseInt(check.rows[0].count) > 0) {
        console.log('✅ Migration 56 already applied (email_processing_logs table exists)');
        process.exit(0);
      }
    }
    
    // Execute the migration
    console.log('🔄 Executing migration...');
    
    try {
      await pool.query(content);
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Some objects already exist, but migration completed');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();