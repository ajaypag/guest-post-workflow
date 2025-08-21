const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
});

async function resetAccountPassword() {
  const email = 'orders@outreachlabs.com';
  const newPassword = 'TempPassword123!'; // Temporary password
  
  try {
    // First check if user exists in accounts table
    const checkResult = await pool.query(
      `SELECT id, email, contact_name, company_name FROM accounts WHERE email = $1`,
      [email]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Account not found with email:', email);
      return;
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password in the accounts table
    const result = await pool.query(
      `UPDATE accounts 
       SET password = $1, 
           updated_at = NOW() 
       WHERE email = $2 
       RETURNING id, email, contact_name, company_name`,
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password reset successful for:', result.rows[0].email);
      console.log('Account ID:', result.rows[0].id);
      console.log('Contact Name:', result.rows[0].contact_name);
      console.log('Company Name:', result.rows[0].company_name);
      console.log('\n🔑 New temporary password:', newPassword);
      console.log('\n⚠️  Please change this password after logging in!');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

resetAccountPassword();