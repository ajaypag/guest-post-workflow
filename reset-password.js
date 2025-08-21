const bcrypt = require('bcryptjs');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
});

const db = drizzle(pool);

async function resetPassword() {
  const email = 'orders@outreachlabs.com';
  const newPassword = 'TempPassword123!'; // Temporary password
  
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password in the database
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = NOW() 
       WHERE email = $2 
       RETURNING id, email, name`,
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password reset successful for:', result.rows[0].email);
      console.log('User ID:', result.rows[0].id);
      console.log('User Name:', result.rows[0].name);
      console.log('\n🔑 New temporary password:', newPassword);
      console.log('\n⚠️  Please change this password after logging in!');
    } else {
      console.log('❌ User not found with email:', email);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

resetPassword();