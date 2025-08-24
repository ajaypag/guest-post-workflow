#!/usr/bin/env tsx

/**
 * Run Shadow Publisher System Migration
 * 
 * This script applies the database schema changes needed for the shadow publisher
 * claim flow to function properly.
 */

import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runShadowMigration() {
  console.log('🚀 Running Shadow Publisher System Migration');
  console.log('============================================\n');

  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString, ssl: false });

  try {
    console.log('📊 Pre-migration Status Check:');
    
    // Check current status
    const preCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_publishers,
        COUNT(CASE WHEN account_status = 'shadow' THEN 1 END) as shadow_publishers
      FROM publishers
    `);
    
    console.log(`  ├─ Total publishers: ${preCheck.rows[0].total_publishers}`);
    console.log(`  ├─ Shadow publishers: ${preCheck.rows[0].shadow_publishers}`);
    
    // Check if migration already applied
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'publishers' 
        AND column_name IN ('shadow_data_migrated', 'shadow_migration_completed_at')
    `);
    
    if (columnCheck.rows.length === 2) {
      console.log('  ✅ Migration columns already exist - checking if migration is needed...');
      
      // Check shadow_publisher_websites for missing columns
      const shadowCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'shadow_publisher_websites' 
          AND column_name IN ('migration_status', 'migration_notes')
      `);
      
      if (shadowCheck.rows.length === 2) {
        console.log('  ✅ All migration changes already applied');
        console.log('  🎯 No migration needed - system is up to date');
        return;
      }
    }

    console.log('\n📁 Loading migration SQL...');
    const migrationSQL = readFileSync(
      path.join(__dirname, '../migrations/0062_shadow_publisher_system_completion.sql'), 
      'utf-8'
    );

    console.log('✅ Migration SQL loaded successfully\n');

    console.log('⚡ Executing migration in transaction...');
    await pool.query('BEGIN');

    try {
      // Execute the migration
      await pool.query(migrationSQL);
      
      console.log('✅ Migration SQL executed successfully');
      
      // Verify the changes
      console.log('\n🔍 Verifying migration results:');
      
      // Check publishers table columns
      const newColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'publishers' 
          AND column_name IN ('shadow_data_migrated', 'shadow_migration_completed_at')
      `);
      
      console.log(`  ├─ Added ${newColumns.rows.length}/2 expected columns to publishers table`);
      newColumns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        console.log(`  │  └─ ${col.column_name}: ${col.data_type} ${nullable}`);
      });
      
      // Check shadow_publisher_websites updates
      const shadowColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'shadow_publisher_websites' 
          AND column_name IN ('migration_status', 'migrated_at', 'migration_notes', 'updated_at')
      `);
      
      console.log(`  ├─ Added ${shadowColumns.rows.length}/4 expected columns to shadow_publisher_websites table`);
      shadowColumns.rows.forEach(col => {
        console.log(`  │  └─ ${col.column_name}: ${col.data_type}`);
      });
      
      // Check if publisher_claim_history was created
      const historyTableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'publisher_claim_history'
      `);
      
      if (historyTableCheck.rows.length > 0) {
        console.log('  ├─ ✅ publisher_claim_history table created');
        
        const historyColumns = await pool.query(`
          SELECT COUNT(*) as column_count
          FROM information_schema.columns 
          WHERE table_name = 'publisher_claim_history'
        `);
        
        console.log(`  │  └─ ${historyColumns.rows[0].column_count} columns created`);
      } else {
        console.log('  ├─ ❌ publisher_claim_history table not found');
      }
      
      // Check migration view
      const viewCheck = await pool.query(`
        SELECT viewname FROM pg_views WHERE viewname = 'shadow_migration_progress'
      `);
      
      if (viewCheck.rows.length > 0) {
        console.log('  ├─ ✅ shadow_migration_progress view created');
      }
      
      await pool.query('COMMIT');
      console.log('\n✅ Migration committed successfully!');
      
    } catch (migrationError) {
      await pool.query('ROLLBACK');
      console.error('\n❌ Migration failed, rolled back:', migrationError);
      throw migrationError;
    }

    // Final status check
    console.log('\n📈 Post-migration Status:');
    
    const postCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_publishers,
        COUNT(CASE WHEN account_status = 'shadow' THEN 1 END) as shadow_publishers,
        COUNT(CASE WHEN account_status = 'shadow' AND shadow_data_migrated = false THEN 1 END) as unmigrated_shadow
      FROM publishers
    `);
    
    console.log(`  ├─ Total publishers: ${postCheck.rows[0].total_publishers}`);
    console.log(`  ├─ Shadow publishers: ${postCheck.rows[0].shadow_publishers}`);
    console.log(`  ├─ Unmigrated shadow publishers: ${postCheck.rows[0].unmigrated_shadow}`);
    
    // Check shadow websites
    const shadowWebsiteCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_shadow_websites,
        COUNT(CASE WHEN migration_status = 'pending' THEN 1 END) as pending_migration
      FROM shadow_publisher_websites
    `);
    
    if (shadowWebsiteCheck.rows.length > 0) {
      console.log(`  ├─ Shadow websites: ${shadowWebsiteCheck.rows[0].total_shadow_websites}`);
      console.log(`  └─ Pending migration: ${shadowWebsiteCheck.rows[0].pending_migration}`);
    }

    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ Database schema is now compatible with shadow publisher claim flow');
    console.log('✅ Ready to test API endpoints');
    console.log('✅ Ready for E2E testing');
    
    console.log('\n📋 Next Steps:');
    console.log('  1. Test API endpoints for proper functionality');
    console.log('  2. Run E2E tests to verify complete flow');
    console.log('  3. Monitor migration progress view: SELECT * FROM shadow_migration_progress;');

  } catch (error) {
    console.error('\n❌ Migration execution failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  runShadowMigration().catch(console.error);
}