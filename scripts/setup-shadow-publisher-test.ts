#!/usr/bin/env tsx

/**
 * Set up test shadow publisher with realistic data for E2E testing
 * Run with: tsx scripts/setup-shadow-publisher-test.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import * as crypto from 'crypto';

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupTestShadowPublisher() {
  console.log('🏗️  Setting up Shadow Publisher Test Data');
  console.log('==========================================\n');

  const connectionString = process.env.DATABASE_URL;
  console.log('📌 Database URL:', connectionString?.replace(/:[^@]+@/, ':****@'));

  const pool = new Pool({ connectionString });

  const testPublisher = {
    id: crypto.randomUUID(),
    email: 'test-publisher@example.com',
    contactName: 'Sarah Johnson',
    companyName: 'Digital Content Pro',
    invitationToken: crypto.randomBytes(32).toString('hex'),
    invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  };

  const testWebsites = [
    {
      id: crypto.randomUUID(),
      domain: 'techinsights.com',
      guestPostCost: '350',
      turnaroundTime: '5',
      domainRating: 65,
      totalTraffic: 50000
    },
    {
      id: crypto.randomUUID(), 
      domain: 'businessgrowth.net',
      guestPostCost: '275',
      turnaroundTime: '3',
      domainRating: 58,
      totalTraffic: 35000
    },
    {
      id: crypto.randomUUID(),
      domain: 'marketingpro.blog',
      guestPostCost: '400',
      turnaroundTime: '7',
      domainRating: 72,
      totalTraffic: 80000
    }
  ];

  try {
    await pool.query('BEGIN');

    // 1. Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await pool.query(`
      DELETE FROM shadow_publisher_websites WHERE publisher_id IN (
        SELECT id FROM publishers WHERE email = $1
      )
    `, [testPublisher.email]);
    
    await pool.query(`
      DELETE FROM publisher_offerings WHERE publisher_id IN (
        SELECT id FROM publishers WHERE email = $1
      )
    `, [testPublisher.email]);
    
    await pool.query('DELETE FROM websites WHERE domain = ANY($1)', 
      [testWebsites.map(w => w.domain)]);
    
    await pool.query('DELETE FROM publishers WHERE email = $1', [testPublisher.email]);

    // 2. Create test websites
    console.log('🌐 Creating test websites...');
    for (const website of testWebsites) {
      await pool.query(`
        INSERT INTO websites (
          id, domain, guest_post_cost, typical_turnaround_days, 
          domain_rating, total_traffic, status, airtable_created_at,
          airtable_updated_at, source, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW(), 'manual', NOW(), NOW())
      `, [
        website.id, website.domain, website.guestPostCost, 
        website.turnaroundTime, website.domainRating, website.totalTraffic
      ]);
    }

    // 3. Create shadow publisher
    console.log('👤 Creating shadow publisher...');
    await pool.query(`
      INSERT INTO publishers (
        id, email, contact_name, company_name, account_status, status,
        invitation_token, invitation_sent_at, invitation_expires_at,
        source, confidence_score, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'shadow', 'pending', $5, NOW(), $6, 'email_extraction', 0.85, NOW(), NOW())
    `, [
      testPublisher.id, testPublisher.email, testPublisher.contactName,
      testPublisher.companyName, testPublisher.invitationToken, testPublisher.invitationExpiresAt
    ]);

    // 4. Create shadow publisher-website relationships
    console.log('🔗 Creating shadow publisher-website relationships...');
    for (const website of testWebsites) {
      await pool.query(`
        INSERT INTO shadow_publisher_websites (
          id, publisher_id, website_id, confidence, source, 
          extraction_method, verified, created_at
        ) VALUES ($1, $2, $3, 0.80, 'email_extraction', 'ai_extracted', false, NOW())
      `, [crypto.randomUUID(), testPublisher.id, website.id]);
    }

    // 5. Create shadow publisher offerings (inactive, will be activated on migration)
    console.log('💰 Creating shadow publisher offerings...');
    for (const website of testWebsites) {
      await pool.query(`
        INSERT INTO publisher_offerings (
          id, publisher_id, website_id, offering_type, price, currency,
          turnaround_days, is_active, source, created_at, updated_at
        ) VALUES ($1, $2, $3, 'guest_post', $4, 'USD', $5, false, 'email_extraction', NOW(), NOW())
      `, [
        crypto.randomUUID(), testPublisher.id, website.id,
        parseFloat(website.guestPostCost), parseInt(website.turnaroundTime)
      ]);
    }

    await pool.query('COMMIT');

    console.log('\n✅ Test shadow publisher created successfully!');
    console.log('=====================================\n');
    
    console.log('📧 Test Publisher Details:');
    console.log(`   Email: ${testPublisher.email}`);
    console.log(`   Name: ${testPublisher.contactName}`);
    console.log(`   Company: ${testPublisher.companyName}`);
    console.log(`   Token: ${testPublisher.invitationToken}`);
    console.log(`   Expires: ${testPublisher.invitationExpiresAt.toISOString()}`);
    
    console.log('\n🌐 Test Websites:');
    testWebsites.forEach(w => {
      console.log(`   • ${w.domain} - $${w.guestPostCost} (${w.turnaroundTime} days)`);
    });

    console.log('\n🔗 Claim URL:');
    console.log(`   http://localhost:3002/publisher/claim?token=${testPublisher.invitationToken}`);

    console.log('\n📋 Test Data Summary:');
    console.log(`   • 1 shadow publisher`);
    console.log(`   • ${testWebsites.length} websites with relationships`);
    console.log(`   • ${testWebsites.length} inactive offerings (will be activated on claim)`);

    // 6. Verify the data was created
    console.log('\n🔍 Verifying test data...');
    
    const verifyPublisher = await pool.query(
      'SELECT * FROM publishers WHERE email = $1',
      [testPublisher.email]
    );
    
    const verifyWebsites = await pool.query(`
      SELECT w.domain, spw.confidence, po.price, po.is_active
      FROM websites w
      JOIN shadow_publisher_websites spw ON w.id = spw.website_id
      JOIN publisher_offerings po ON w.id = po.website_id
      WHERE spw.publisher_id = $1
    `, [testPublisher.id]);

    console.log(`   ✓ Publisher exists: ${verifyPublisher.rows.length === 1}`);
    console.log(`   ✓ Website relationships: ${verifyWebsites.rows.length}`);
    console.log(`   ✓ Offerings inactive: ${verifyWebsites.rows.every(r => !r.is_active)}`);

    console.log('\n🚀 Ready for E2E testing!');
    console.log('Run: npm run test:e2e:publisher-flow');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupTestShadowPublisher().catch(console.error);