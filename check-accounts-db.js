const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/guest_post_workflow'
});

async function checkAccounts() {
  try {
    // Check if accounts table exists and has data
    const result = await pool.query('SELECT COUNT(*) as count FROM accounts');
    const count = result.rows[0].count;
    console.log(`📊 Total accounts in database: ${count}`);
    
    if (count > 0) {
      // Get some sample accounts
      const sample = await pool.query(`
        SELECT id, email, "contactName", "companyName", status 
        FROM accounts 
        LIMIT 5
      `);
      
      console.log('\n📋 Sample accounts:');
      sample.rows.forEach(account => {
        console.log(`  - ${account.email} (${account.contactName}) - ${account.status}`);
      });
    } else {
      console.log('⚠️ No accounts found in database!');
      
      // Create a test account
      console.log('Creating test account...');
      const newAccount = await pool.query(`
        INSERT INTO accounts (email, "contactName", "companyName", password, status)
        VALUES ('test.account@example.com', 'Test User', 'Test Company', '$2b$10$dummy', 'active')
        RETURNING id, email, "contactName"
      `);
      
      console.log('✅ Test account created:', newAccount.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('This could be a column name issue or connection problem');
  } finally {
    await pool.end();
  }
}

checkAccounts();