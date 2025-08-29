#!/usr/bin/env node

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow?sslmode=disable'
});

async function checkVerificationStatus() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking verification status for:');
    console.log('Website ID: 607e5d7d-7027-4456-ba40-5617c703140f');
    console.log('Publisher Email: sophia@delightfullynotedblog.com');
    console.log('═'.repeat(60));
    
    // 1. First, find the publisher ID for sophia@delightfullynotedblog.com
    console.log('\n📧 Step 1: Finding publisher ID...');
    const publisherQuery = `
      SELECT id, email, created_at, updated_at
      FROM publishers 
      WHERE email = $1
    `;
    
    const publisherResult = await client.query(publisherQuery, ['sophia@delightfullynotedblog.com']);
    
    if (publisherResult.rows.length === 0) {
      console.log('❌ No publisher found with email sophia@delightfullynotedblog.com');
      return;
    }
    
    const publisher = publisherResult.rows[0];
    console.log('✅ Publisher found:');
    console.log(`   ID: ${publisher.id}`);
    console.log(`   Email: ${publisher.email}`);
    console.log(`   Created: ${publisher.created_at}`);
    
    // 2. Check publisher_offering_relationships table
    console.log('\n🔗 Step 2: Checking publisher_offering_relationships...');
    const relationshipQuery = `
      SELECT 
        por.id as relationship_id,
        por.website_id,
        por.publisher_id,
        por.verification_status,
        por.verified_at,
        por.created_at,
        por.updated_at,
        w.domain,
        w.domain as website_name
      FROM publisher_offering_relationships por
      LEFT JOIN websites w ON por.website_id = w.id
      WHERE por.website_id = $1 AND por.publisher_id = $2
    `;
    
    const relationshipResult = await client.query(relationshipQuery, [
      '607e5d7d-7027-4456-ba40-5617c703140f',
      publisher.id
    ]);
    
    if (relationshipResult.rows.length === 0) {
      console.log('❌ No publisher offering relationship found between this website and publisher');
    } else {
      console.log('✅ Publisher offering relationship found:');
      relationshipResult.rows.forEach((row, index) => {
        console.log(`   Relationship #${index + 1}:`);
        console.log(`     ID: ${row.relationship_id}`);
        console.log(`     Website: ${row.domain} (${row.website_name || 'N/A'})`);
        console.log(`     Verification Status: ${row.verification_status}`);
        console.log(`     Verified At: ${row.verified_at || 'Not verified'}`);
        console.log(`     Created: ${row.created_at}`);
        console.log(`     Updated: ${row.updated_at}`);
      });
    }
    
    // 3. Check publisher_email_claims table
    console.log('\n📝 Step 3: Checking publisher_email_claims...');
    const claimsQuery = `
      SELECT 
        pec.id as claim_id,
        pec.website_id,
        pec.publisher_id,
        pec.email_domain,
        pec.verification_token,
        pec.verification_sent_at,
        pec.verified_at,
        pec.status,
        pec.created_at,
        w.domain,
        w.domain as website_name
      FROM publisher_email_claims pec
      LEFT JOIN websites w ON pec.website_id = w.id
      WHERE pec.website_id = $1 AND pec.publisher_id = $2
    `;
    
    const claimsResult = await client.query(claimsQuery, [
      '607e5d7d-7027-4456-ba40-5617c703140f',
      publisher.id
    ]);
    
    if (claimsResult.rows.length === 0) {
      console.log('❌ No email claims found for this website and publisher');
    } else {
      console.log('✅ Email claims found:');
      claimsResult.rows.forEach((row, index) => {
        console.log(`   Claim #${index + 1}:`);
        console.log(`     ID: ${row.claim_id}`);
        console.log(`     Website: ${row.domain} (${row.website_name || 'N/A'})`);
        console.log(`     Email Domain: ${row.email_domain}`);
        console.log(`     Verification Token: ${row.verification_token}`);
        console.log(`     Verification Sent At: ${row.verification_sent_at || 'Not sent'}`);
        console.log(`     Verified At: ${row.verified_at || 'Not verified'}`);
        console.log(`     Status: ${row.status}`);
        console.log(`     Created: ${row.created_at}`);
      });
    }
    
    // 4. Check the website details
    console.log('\n🌐 Step 4: Checking website details...');
    const websiteQuery = `
      SELECT 
        id,
        domain,
        normalized_domain,
        created_at,
        updated_at
      FROM websites
      WHERE id = $1
    `;
    
    const websiteResult = await client.query(websiteQuery, ['607e5d7d-7027-4456-ba40-5617c703140f']);
    
    if (websiteResult.rows.length === 0) {
      console.log('❌ Website not found with ID 607e5d7d-7027-4456-ba40-5617c703140f');
    } else {
      const website = websiteResult.rows[0];
      console.log('✅ Website found:');
      console.log(`   ID: ${website.id}`);
      console.log(`   Domain: ${website.domain}`);
      console.log(`   Domain (again): ${website.domain}`);
      console.log(`   Normalized Domain: ${website.normalized_domain || 'N/A'}`);
      console.log(`   Created: ${website.created_at}`);
      console.log(`   Updated: ${website.updated_at}`);
    }
    
    // 5. Check all relationships for this website (to see other publishers)
    console.log('\n🔍 Step 5: Checking all relationships for this website...');
    const allRelationshipsQuery = `
      SELECT 
        por.id as relationship_id,
        por.verification_status,
        por.verified_at,
        p.email as publisher_email,
        p.email as publisher_name
      FROM publisher_offering_relationships por
      LEFT JOIN publishers p ON por.publisher_id = p.id
      WHERE por.website_id = $1
      ORDER BY por.created_at DESC
    `;
    
    const allRelationshipsResult = await client.query(allRelationshipsQuery, ['607e5d7d-7027-4456-ba40-5617c703140f']);
    
    if (allRelationshipsResult.rows.length === 0) {
      console.log('❌ No publisher relationships found for this website');
    } else {
      console.log(`✅ Found ${allRelationshipsResult.rows.length} publisher relationship(s) for this website:`);
      allRelationshipsResult.rows.forEach((row, index) => {
        console.log(`   Relationship #${index + 1}:`);
        console.log(`     Publisher: ${row.publisher_email}`);
        console.log(`     Status: ${row.verification_status}`);
        console.log(`     Verified At: ${row.verified_at || 'Not verified'}`);
      });
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 SUMMARY:');
    console.log(`Publisher sophia@delightfullynotedblog.com exists: ${publisherResult.rows.length > 0 ? 'YES' : 'NO'}`);
    console.log(`Website 607e5d7d-7027-4456-ba40-5617c703140f exists: ${websiteResult.rows.length > 0 ? 'YES' : 'NO'}`);
    console.log(`Publisher-Website relationship exists: ${relationshipResult.rows.length > 0 ? 'YES' : 'NO'}`);
    console.log(`Email claims exist: ${claimsResult.rows.length > 0 ? 'YES' : 'NO'}`);
    
    if (relationshipResult.rows.length > 0) {
      const status = relationshipResult.rows[0].verification_status;
      console.log(`Verification Status: ${status}`);
      console.log(`Verified At: ${relationshipResult.rows[0].verified_at || 'Not verified'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
  }
}

// Run the check
checkVerificationStatus()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed to run check:', error);
    process.exit(1);
  });