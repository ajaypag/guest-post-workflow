/**
 * Jest Setup for E2E Tests
 * Global test configuration and utilities
 */

const { initializeTestEnvironment } = require('./utils/test-config');

// Increase timeout for E2E tests
jest.setTimeout(60000);

// Global setup before all tests
beforeAll(async () => {
  console.log('🚀 Setting up E2E test environment...');
  
  // Initialize test environment
  initializeTestEnvironment();
  
  // Verify environment variables
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingEnvVars);
    console.warn('   Some tests may fail or be skipped');
  }
  
  // Set test defaults if not provided
  if (!process.env.TEST_BASE_URL) {
    process.env.TEST_BASE_URL = 'http://localhost:3000';
  }
  
  if (!process.env.HEADLESS) {
    process.env.HEADLESS = 'true';
  }
  
  console.log('✅ E2E test environment ready');
});

// Global teardown after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Any global cleanup can be added here
  
  console.log('✅ E2E test cleanup complete');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('   At promise:', promise);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Custom matchers and utilities
expect.extend({
  toBeValidUrl(received) {
    const pass = typeof received === 'string' && received.startsWith('http');
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },
  
  toContainRoute(received, route) {
    const pass = typeof received === 'string' && received.includes(route);
    if (pass) {
      return {
        message: () => `expected ${received} not to contain route ${route}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to contain route ${route}`,
        pass: false,
      };
    }
  },
  
  toBeWithinTimeRange(received, min, max) {
    const pass = typeof received === 'number' && received >= min && received <= max;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within ${min}-${max}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within ${min}-${max}ms`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random test data
  generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  
  // Retry function with exponential backoff
  retry: async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await global.testUtils.wait(delay * Math.pow(2, i));
      }
    }
  },
  
  // Format duration for logging
  formatDuration: (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },
  
  // Check if URL is accessible
  isUrlAccessible: async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
};