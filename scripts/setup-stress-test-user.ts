/**
 * Setup stress test user for E2E testing
 * Creates the test publisher account needed for stress testing
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { publishers } from '../lib/db/publisherSchemaActual';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Dev123@localhost:5432/guestpostworkflow';

async function setupStressTestUser() {
  const pool = new Pool({
    connectionString,
    ssl: false
  });
  const db = drizzle(pool);

  const TEST_PUBLISHER = {
    email: 'stress.test.publisher@example.com',
    password: 'StressTest123!',
    name: 'Stress Test Publisher',
    companyName: 'Stress Test Co'
  };

  try {
    console.log('🔍 Checking if stress test user exists...');
    
    const existingUser = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, TEST_PUBLISHER.email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('✅ Stress test user already exists');
      console.log(`   Email: ${existingUser[0].email}`);
      console.log(`   ID: ${existingUser[0].id}`);
      await pool.end();
      return;
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(TEST_PUBLISHER.password, 12);

    console.log('👤 Creating stress test publisher...');
    const [newPublisher] = await db
      .insert(publishers)
      .values({
        email: TEST_PUBLISHER.email,
        hashedPassword,
        name: TEST_PUBLISHER.name,
        companyName: TEST_PUBLISHER.companyName,
        isVerified: true, // Verified for testing
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('✅ Stress test user created successfully!');
    console.log(`   Email: ${newPublisher.email}`);
    console.log(`   ID: ${newPublisher.id}`);
    console.log(`   Company: ${newPublisher.companyName}`);

    await client.end();
  } catch (error) {
    console.error('❌ Error setting up stress test user:', error);
    await client.end();
    process.exit(1);
  }
}

setupStressTestUser();