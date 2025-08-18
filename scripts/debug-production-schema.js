#!/usr/bin/env node

/**
 * Production Database Schema Debugger
 * 
 * This script checks what tables and columns actually exist in production
 * to help diagnose migration issues.
 */

const { Pool } = require('pg');

async function checkProductionSchema() {
  // Use your production DATABASE_URL from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking production database schema...\n');

    // Check if order_line_items table exists
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'order_line_items'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    console.log(`📋 order_line_items table exists: ${tableExists ? '✅ YES' : '❌ NO'}`);

    if (tableExists) {
      // Get all columns in the table
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'order_line_items'
        ORDER BY ordinal_position;
      `);

      console.log('\n📊 Columns in order_line_items table:');
      columnsResult.rows.forEach((col, idx) => {
        const nullable = col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL';
        const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
        console.log(`  ${idx + 1}. ${col.column_name} - ${col.data_type} - ${nullable}${defaultVal}`);
      });

      // Check if modified_at specifically exists
      const hasModifiedAt = columnsResult.rows.some(col => col.column_name === 'modified_at');
      console.log(`\n🎯 modified_at column exists: ${hasModifiedAt ? '✅ YES' : '❌ NO'}`);

      // Check record count
      const countResult = await pool.query('SELECT COUNT(*) as count FROM order_line_items');
      console.log(`📈 Total records in order_line_items: ${countResult.rows[0].count}`);

      // If modified_at exists, try to query it
      if (hasModifiedAt) {
        try {
          const modifiedAtResult = await pool.query(`
            SELECT modified_at 
            FROM order_line_items 
            WHERE modified_at IS NOT NULL
            ORDER BY modified_at DESC 
            LIMIT 5
          `);
          console.log(`\n⏰ Recent modified_at values (${modifiedAtResult.rows.length} found):`);
          modifiedAtResult.rows.forEach((row, idx) => {
            console.log(`  ${idx + 1}. ${row.modified_at}`);
          });
        } catch (error) {
          console.log(`\n❌ Error querying modified_at: ${error.message}`);
        }
      }
    }

    // Check migrations table to see what's been run
    console.log('\n🗃️ Checking migrations table...');
    try {
      const migrationsResult = await pool.query(`
        SELECT filename, applied_at 
        FROM migrations 
        ORDER BY applied_at DESC 
        LIMIT 10
      `);
      
      console.log('📝 Recent migrations applied:');
      migrationsResult.rows.forEach((migration, idx) => {
        console.log(`  ${idx + 1}. ${migration.filename} - ${migration.applied_at}`);
      });
    } catch (error) {
      console.log(`❌ Error checking migrations: ${error.message}`);
    }

    console.log('\n✅ Schema check complete!');
    
  } catch (error) {
    console.error('❌ Database connection or query failed:', error.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  checkProductionSchema().catch(console.error);
}