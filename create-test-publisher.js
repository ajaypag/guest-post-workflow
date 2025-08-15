// Create a test publisher account for testing
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function createTestPublisher() {
  // Hash password
  const password = 'testpublisher123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const publisherId = 'bd7c2f17-72f4-41eb-b274-e2f0d789becf';
  const email = 'test@publisher.com';
  
  // SQL to create publisher
  const sql = `
    INSERT INTO publishers (
      id,
      email,
      password,
      contact_name,
      company_name,
      status,
      email_verified,
      created_at,
      updated_at
    ) VALUES (
      '${publisherId}',
      '${email}',
      '${hashedPassword}',
      'Test Publisher',
      'Test Publishing Company',
      'active',
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      password = '${hashedPassword}',
      status = 'active',
      email_verified = true;
  `;
  
  const command = `docker exec guest-post-local-db psql -U postgres -d guest_post_test -c "${sql}"`;
  
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr && !stderr.includes('NOTICE')) {
      console.error('Error:', stderr);
    }
    
    console.log('✅ Test publisher created/updated');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('ID:', publisherId);
    
    // Verify publisher exists
    const verifyCommand = `docker exec guest-post-local-db psql -U postgres -d guest_post_test -c "SELECT id, email, contact_name, company_name, status, email_verified FROM publishers WHERE email = '${email}';"`;
    const { stdout: verifyOut } = await execPromise(verifyCommand);
    console.log('\nVerification:');
    console.log(verifyOut);
    
  } catch (error) {
    console.error('Failed to create publisher:', error.message);
  }
}

createTestPublisher();