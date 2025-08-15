import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/accountSchema';

// Test database configuration
const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/guest_post_test';

let testPool: Pool | null = null;
let testDb: any = null;

export async function setupTestDatabase() {
  if (testPool && testDb) {
    return testDb;
  }

  testPool = new Pool({
    connectionString: TEST_DATABASE_URL,
    max: 5, // Limit connections for tests
  });

  testDb = drizzle(testPool, { schema });
  return testDb;
}

// Track test data for cleanup
const testDataRegistry = {
  publishers: new Set<string>(),
  websites: new Set<string>(),
  offerings: new Set<string>(),
};

export function registerTestData(type: 'publishers' | 'websites' | 'offerings', id: string) {
  testDataRegistry[type].add(id);
}

export async function clearTestData() {
  if (!testDb) {
    await setupTestDatabase();
  }

  try {
    // Simple cleanup - delete all test data by pattern
    // This is safer for testing and avoids SQL array issues
    
    // Clear publishers with test emails
    await testDb.execute(sql`DELETE FROM publisher_performance WHERE publisher_id IN (
      SELECT id FROM publishers WHERE email LIKE '%@example.com' OR email LIKE '%test%'
    )`);
    await testDb.execute(sql`DELETE FROM publisher_pricing_rules WHERE publisher_offering_id IN (
      SELECT po.id FROM publisher_offerings po 
      JOIN publishers p ON po.publisher_id = p.id 
      WHERE p.email LIKE '%@example.com' OR p.email LIKE '%test%'
    )`);
    await testDb.execute(sql`DELETE FROM publisher_offering_relationships WHERE publisher_id IN (
      SELECT id FROM publishers WHERE email LIKE '%@example.com' OR email LIKE '%test%'
    )`);
    await testDb.execute(sql`DELETE FROM publisher_offerings WHERE publisher_id IN (
      SELECT id FROM publishers WHERE email LIKE '%@example.com' OR email LIKE '%test%'
    )`);
    await testDb.execute(sql`DELETE FROM publishers WHERE email LIKE '%@example.com' OR email LIKE '%test%'`);

    // Clear test websites
    await testDb.execute(sql`DELETE FROM websites WHERE domain LIKE '%.test' OR domain LIKE '%test%'`);

    // Clear registry
    testDataRegistry.publishers.clear();
    testDataRegistry.websites.clear();
    testDataRegistry.offerings.clear();
  } catch (error) {
    // If tables don't exist yet, that's ok for tests
    console.warn('Test data cleanup warning:', error.message);
  }
}

export async function cleanupTestDatabase() {
  // Only clear data, don't close the pool
  if (testDb) {
    await clearTestData();
  }
}

export async function closeTestDatabase() {
  if (testPool) {
    await testPool.end();
    testPool = null;
    testDb = null;
  }
}

export function getTestDb() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

// Test data cleanup hooks
beforeEach(async () => {
  await setupTestDatabase();
  await clearTestData();
});

afterAll(async () => {
  await cleanupTestDatabase();
});