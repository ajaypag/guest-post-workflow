/**
 * Activate stress test user for E2E testing
 * Marks the test publisher account as verified and active
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { publishers } from '../lib/db/accountSchema';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Dev123@localhost:5432/guestpostworkflow';

async function activateStressTestUser() {
  const pool = new Pool({
    connectionString,
    ssl: false
  });
  const db = drizzle(pool);

  const TEST_EMAIL = 'stress.test.publisher@example.com';

  try {
    console.log('🔍 Finding stress test user...');
    
    const existingUser = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, TEST_EMAIL))
      .limit(1);

    if (existingUser.length === 0) {
      console.log('❌ Stress test user not found');
      await pool.end();
      return;
    }

    console.log('✅ Found user:', existingUser[0].email);
    console.log('   Current status:', existingUser[0].status);
    console.log('   Email verified:', existingUser[0].emailVerified);

    console.log('🔐 Activating stress test publisher...');
    await db
      .update(publishers)
      .set({
        status: 'active',
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(publishers.email, TEST_EMAIL));

    console.log('✅ Stress test user activated successfully!');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Status: active`);
    console.log(`   Verified: true`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error activating stress test user:', error);
    await pool.end();
    process.exit(1);
  }
}

activateStressTestUser();