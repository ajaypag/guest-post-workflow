const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/guest_post_workflow'
});

async function checkSchema() {
  try {
    // Get accounts table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Accounts table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Try to get sample data with the correct column names
    console.log('\n📊 Sample account data:');
    const sample = await pool.query(`
      SELECT id, email, contact_name, company_name, status 
      FROM accounts 
      WHERE status = 'active'
      LIMIT 3
    `);
    
    sample.rows.forEach(account => {
      console.log(`  - ${account.email} (${account.contact_name}) - ${account.company_name} [${account.status}]`);
    });
    
  } catch (error) {
    console.error('❌ Schema check error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();