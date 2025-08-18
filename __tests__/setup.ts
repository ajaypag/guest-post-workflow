/**
 * Jest Test Setup
 * Configures test environment, database connections, and global mocks
 */

import { config } from 'dotenv';
import { Pool } from 'pg';

// Load test environment variables
config({ path: '.env.test' });

// Global test configuration
const TEST_TIMEOUT = 30000;

// Setup test database connection
const testDbPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Global test utilities
global.testDbPool = testDbPool;
global.generateTestId = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Increase default timeout for integration tests
jest.setTimeout(TEST_TIMEOUT);

// Mock external services by default
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'mock-email-id' } })
    }
  }))
}));

// Mock OpenAI calls
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }]
        })
      }
    }
  }))
}));

// Setup and teardown for test database
beforeAll(async () => {
  // Ensure test database is ready
  try {
    await testDbPool.query('SELECT 1');
    console.log('✅ Test database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  // Close database connections
  await testDbPool.end();
  console.log('✅ Test database connections closed');
});

// Clean up test data after each test
afterEach(async () => {
  // Only clean up if we're in a test environment
  if (process.env.NODE_ENV === 'test') {
    try {
      // Clean up test data without dropping schema
      const cleanupQueries = [
        'DELETE FROM publisher_order_notifications WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        'DELETE FROM publisher_earnings WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        'DELETE FROM order_line_items WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        'DELETE FROM orders WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        'DELETE FROM publisher_offering_relationships WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        'DELETE FROM publisher_offerings WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        'DELETE FROM publishers WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        'DELETE FROM websites WHERE created_at > NOW() - INTERVAL \'1 hour\'',
      ];

      for (const query of cleanupQueries) {
        try {
          await testDbPool.query(query);
        } catch (error) {
          // Ignore errors for non-existent tables during setup
          if (!error.message?.includes('does not exist')) {
            console.warn('Cleanup warning:', error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Test cleanup warning:', error.message);
    }
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export test utilities
export const testUtils = {
  generateTestId: global.generateTestId,
  dbPool: testDbPool,
  
  // Wait for condition helper
  waitFor: async (condition: () => boolean | Promise<boolean>, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Database query helper
  query: async (sql: string, params?: any[]) => {
    return testDbPool.query(sql, params);
  }
};