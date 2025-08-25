const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/guest_post_workflow'
});

async function setupTestUser() {
  try {
    // Create a test password
    const testPassword = 'test123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // Update admin@example.com password for testing
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = 'admin@example.com'
      RETURNING id, email, role
    `, [hashedPassword]);
    
    if (result.rows.length > 0) {
      console.log('✅ Test user setup complete:');
      console.log('Email: admin@example.com');
      console.log('Password: test123');
      console.log('Role:', result.rows[0].role);
    } else {
      // Create the test user if it doesn't exist
      const createResult = await pool.query(`
        INSERT INTO users (email, name, password_hash, role, is_active)
        VALUES ('admin@example.com', 'Test Admin', $1, 'admin', true)
        ON CONFLICT (email) DO UPDATE 
        SET password_hash = $1
        RETURNING id, email, role
      `, [hashedPassword]);
      
      console.log('✅ Test user created:');
      console.log('Email: admin@example.com');
      console.log('Password: test123');
      console.log('Role:', createResult.rows[0].role);
    }
    
    // Also get a test account user
    const accountResult = await pool.query(`
      SELECT id, email, "contactName" as name
      FROM accounts 
      WHERE status = 'active'
      LIMIT 1
    `);
    
    if (accountResult.rows.length > 0) {
      console.log('\n📦 Test Account User:');
      console.log('ID:', accountResult.rows[0].id);
      console.log('Email:', accountResult.rows[0].email);
      console.log('Name:', accountResult.rows[0].name);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

setupTestUser();