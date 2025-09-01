import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('🚀 Running custom pricing strategy migration...');
    
    const migrationPath = join(process.cwd(), 'migrations', '0083_add_custom_pricing_strategy.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow'
    });
    
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    const result = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'websites_pricing_strategy_check';
    `);
    
    console.log('✅ Pricing strategies now include:', result.rows[0]?.check_clause);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();