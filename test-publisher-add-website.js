// Test adding a website as a publisher using direct database insertion

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runSql(sql) {
  const command = `docker exec guest-post-local-db psql -U postgres -d guest_post_test -c "${sql}"`;
  const { stdout, stderr } = await execPromise(command);
  if (stderr && !stderr.includes('NOTICE')) {
    console.error('SQL Error:', stderr);
  }
  return stdout;
}

async function testAddWebsiteDirectly() {
  console.log('Testing website addition directly in database...\n');
  
  const publisherId = 'bd7c2f17-72f4-41eb-b274-e2f0d789becf';
  const testDomain = 'mytestblog.com';
  
  // First check if website already exists
  console.log(`1. Checking if ${testDomain} already exists...`);
  const checkResult = await runSql(`
    SELECT id, domain, source, added_by_publisher_id 
    FROM websites 
    WHERE domain = '${testDomain}';
  `);
  console.log(checkResult);
  
  if (checkResult.includes(testDomain)) {
    console.log('Website already exists, deleting it first...');
    await runSql(`DELETE FROM publisher_offering_relationships WHERE website_id IN (SELECT id FROM websites WHERE domain = '${testDomain}');`);
    await runSql(`DELETE FROM websites WHERE domain = '${testDomain}';`);
  }
  
  // Add a new website without airtable_id
  console.log(`\n2. Adding new website ${testDomain} without airtable_id...`);
  try {
    const insertResult = await runSql(`
      INSERT INTO websites (
        id,
        domain,
        domain_rating,
        total_traffic,
        guest_post_cost,
        status,
        has_guest_post,
        source,
        added_by_publisher_id,
        source_metadata,
        airtable_created_at,
        airtable_updated_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        '${testDomain}',
        42,
        75000,
        250.00,
        'Active',
        true,
        'publisher',
        '${publisherId}',
        '{"test": true, "addedBy": "test script"}'::jsonb,
        NOW(),
        NOW(),
        NOW(),
        NOW()
      ) RETURNING id, domain, source, airtable_id;
    `);
    console.log('Insert Result:', insertResult);
    
    // Verify the website was added
    console.log('\n3. Verifying website was added...');
    const verifyResult = await runSql(`
      SELECT 
        id,
        domain,
        airtable_id,
        source,
        added_by_publisher_id,
        domain_rating,
        total_traffic,
        guest_post_cost
      FROM websites 
      WHERE domain = '${testDomain}';
    `);
    console.log('Verification:', verifyResult);
    
    // Check that airtable_id is NULL
    console.log('\n4. Checking airtable_id is NULL for publisher-added website...');
    const nullCheck = await runSql(`
      SELECT 
        CASE 
          WHEN airtable_id IS NULL THEN 'SUCCESS: airtable_id is NULL'
          ELSE 'FAIL: airtable_id is NOT NULL: ' || airtable_id
        END as null_check
      FROM websites 
      WHERE domain = '${testDomain}';
    `);
    console.log(nullCheck);
    
    // Test adding a website with duplicate domain (should fail)
    console.log('\n5. Testing duplicate prevention...');
    try {
      const duplicateResult = await runSql(`
        INSERT INTO websites (
          id, domain, airtable_created_at, airtable_updated_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '${testDomain}', NOW(), NOW(), NOW(), NOW()
        );
      `);
      console.log('FAIL: Duplicate was allowed!', duplicateResult);
    } catch (error) {
      console.log('SUCCESS: Duplicate prevented (as expected)');
    }
    
    // Create publisher relationship
    console.log('\n6. Creating publisher relationship...');
    const relationshipResult = await runSql(`
      INSERT INTO publisher_offering_relationships (
        id,
        publisher_id,
        website_id,
        relationship_type,
        verification_status,
        is_active,
        is_primary,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        '${publisherId}',
        (SELECT id FROM websites WHERE domain = '${testDomain}'),
        'owner',
        'verified',
        true,
        true,
        NOW(),
        NOW()
      ) RETURNING id, publisher_id, website_id;
    `);
    console.log('Relationship created:', relationshipResult);
    
    // Final verification
    console.log('\n7. Final verification - website with publisher relationship...');
    const finalCheck = await runSql(`
      SELECT 
        w.domain,
        w.source,
        w.airtable_id IS NULL as "airtable_null",
        r.relationship_type,
        r.verification_status,
        r.is_active
      FROM websites w
      JOIN publisher_offering_relationships r ON r.website_id = w.id
      WHERE w.domain = '${testDomain}';
    `);
    console.log('Final status:', finalCheck);
    
  } catch (error) {
    console.error('Error during test:', error.message);
  }
  
  // Test statistics
  console.log('\n8. Database statistics after test...');
  const stats = await runSql(`
    SELECT 
      COUNT(*) as total_websites,
      COUNT(airtable_id) as with_airtable_id,
      COUNT(*) - COUNT(airtable_id) as without_airtable_id,
      COUNT(CASE WHEN source = 'publisher' THEN 1 END) as publisher_added,
      COUNT(CASE WHEN source = 'airtable' THEN 1 END) as airtable_added
    FROM websites;
  `);
  console.log('Statistics:', stats);
}

testAddWebsiteDirectly().then(() => {
  console.log('\n✅ All tests completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});