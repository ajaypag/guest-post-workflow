const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/guest_post_workflow'
});

async function checkAdminUsers() {
  try {
    // Check for internal/admin users
    const result = await pool.query(`
      SELECT id, email, name, role 
      FROM users 
      WHERE role IN ('admin', 'super_admin') OR email LIKE '%@linkio.com%'
      LIMIT 10
    `);
    
    console.log('=== Admin/Internal Users ===');
    if (result.rows.length > 0) {
      result.rows.forEach(user => {
        console.log(`Email: ${user.email}, Role: ${user.role}, Name: ${user.name}`);
      });
      
      // Use the first admin for testing
      console.log('\n=== Suggested Test User ===');
      console.log(`Email: ${result.rows[0].email}`);
      console.log('Password: You need to set this or use a known test password');
    } else {
      console.log('No admin users found');
      
      // Check for any users
      const anyUsers = await pool.query('SELECT email, role FROM users LIMIT 5');
      console.log('\n=== Available users (first 5) ===');
      anyUsers.rows.forEach(user => {
        console.log(`Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
    // Check if test user exists
    const testUser = await pool.query(`
      SELECT id, email, role FROM users WHERE email = 'ajay@linkio.com'
    `);
    
    if (testUser.rows.length > 0) {
      console.log('\n=== Test user ajay@linkio.com exists ===');
      console.log('Role:', testUser.rows[0].role);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAdminUsers();