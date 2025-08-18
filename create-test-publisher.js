const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Use the correct database connection
const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/guest_post_test';

async function createTestPublisher() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Hash the password
    const password = 'TestPass123!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the publisher
    const result = await pool.query(`
      INSERT INTO publishers (
        id,
        email,
        password,
        contact_name,
        company_name,
        status,
        created_at,
        updated_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = $2,
        updated_at = NOW()
      RETURNING id, email, contact_name
    `, [
      'testpublisher@example.com',
      passwordHash,
      'Test Publisher',
      'Test Publishing Co',
      'active'
    ]);

    console.log('Test publisher created/updated:', result.rows[0]);
    console.log('Email: testpublisher@example.com');
    console.log('Password: TestPass123!');
  } catch (error) {
    console.error('Error creating test publisher:', error);
  } finally {
    await pool.end();
  }
}

createTestPublisher();
