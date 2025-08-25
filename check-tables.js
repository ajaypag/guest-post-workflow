const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/guest_post_workflow'
});

async function checkTables() {
  try {
    // Check if our session tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_sessions', 'impersonation_logs', 'impersonation_actions')
      ORDER BY table_name
    `);
    
    console.log('=== Session Store Tables ===');
    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log('✅', row.table_name);
      });
    } else {
      console.log('❌ No session store tables found!');
      console.log('Need to run migration: migrations/0071_session_store_system.sql');
    }
    
    // Check all tables
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 20
    `);
    
    console.log('\n=== First 20 tables in database ===');
    allTables.rows.forEach(row => {
      console.log('-', row.table_name);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();