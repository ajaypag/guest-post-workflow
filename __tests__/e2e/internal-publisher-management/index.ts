/**
 * Internal Publisher Management E2E Test Suite
 * 
 * This module exports all test utilities and page objects for internal
 * publisher management testing.
 */

// Page Object Models
export { LoginPage } from './page-objects/LoginPage';
export { InternalLayoutPage } from './page-objects/InternalLayoutPage';

// Database Helpers
import { DatabaseHelpers } from './helpers/databaseHelpers';
export { DatabaseHelpers };
export { PublisherManagementPage } from './page-objects/PublisherManagementPage';
export { PublisherDetailPage } from './page-objects/PublisherDetailPage';

// Test Helpers
export { TestDataFactory, CREDENTIALS, TEST_SCENARIOS, API_ENDPOINTS } from './helpers/testData';
export { DatabaseHelpers } from './helpers/databaseHelpers';

// Type definitions for test data
export type {
  TestUser,
  TestPublisher,
  TestWebsite,
} from './helpers/testData';

/**
 * Test Suite Configuration
 */
export const TEST_CONFIG = {
  // Base URL for testing
  BASE_URL: 'http://localhost:3002',
  
  // Test timeouts (in milliseconds)
  TIMEOUTS: {
    PAGE_LOAD: 5000,
    API_REQUEST: 3000,
    USER_ACTION: 2000,
    DATABASE_OPERATION: 5000,
  },
  
  // Test credentials
  CREDENTIALS: {
    INTERNAL_ADMIN: {
      email: 'ajay@outreachlabs.com',
      password: 'FA64!I$nrbCauS^d',
    },
  },
  
  // Test data prefixes (for safe cleanup)
  TEST_DATA_PREFIXES: {
    PUBLISHER_EMAIL: 'e2e-publisher-',
    WEBSITE_DOMAIN: 'e2e-test-',
    COMPANY_NAME: 'Test Publisher Company',
  },
  
  // Expected test results
  EXPECTED_RESULTS: {
    CURRENT_STATE: 'FAIL', // Current state tests should fail (documenting issues)
    FUTURE_STATE: 'PASS',  // Future state tests should pass (when implemented)
    SECURITY: 'PASS',      // Security tests should pass
    SCENARIOS: 'PASS',     // Scenario tests should pass
  },
};

/**
 * Test Utilities
 */
export class TestUtils {
  /**
   * Wait for element to be visible with custom timeout
   */
  static async waitForElement(page: any, selector: string, timeout = TEST_CONFIG.TIMEOUTS.PAGE_LOAD) {
    await page.waitForSelector(selector, { timeout });
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>, 
    maxRetries = 3, 
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Generate unique identifier for test data
   */
  static generateTestId(prefix = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up test data by prefix
   */
  static async cleanupTestData(prefix: string) {
    await DatabaseHelpers.cleanupTestData();
  }

  /**
   * Verify page loads successfully
   */
  static async verifyPageLoad(page: any, expectedTitle?: string) {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for error pages
    const hasError = await page.locator('text=404').isVisible() ||
                    await page.locator('text=500').isVisible() ||
                    await page.locator('text=Error').isVisible();
    
    if (hasError) {
      throw new Error(`Page loaded with error: ${page.url()}`);
    }
    
    // Verify title if provided
    if (expectedTitle) {
      const title = await page.title();
      if (!title.includes(expectedTitle)) {
        throw new Error(`Expected title to contain "${expectedTitle}", got "${title}"`);
      }
    }
  }

  /**
   * Take screenshot for debugging
   */
  static async takeDebugScreenshot(page: any, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debug-${name}-${timestamp}.png`;
    await page.screenshot({ path: `test-reports/${filename}` });
    console.log(`Debug screenshot saved: ${filename}`);
  }

  /**
   * Log test step for debugging
   */
  static logStep(step: string, details?: any) {
    console.log(`🔍 TEST STEP: ${step}`);
    if (details) {
      console.log(`   Details:`, details);
    }
  }

  /**
   * Verify API response
   */
  static async verifyApiResponse(response: any, expectedStatus = 200) {
    if (response.status() !== expectedStatus) {
      const responseText = await response.text();
      throw new Error(
        `API request failed. Expected ${expectedStatus}, got ${response.status()}. Response: ${responseText}`
      );
    }
  }
}

/**
 * Test Constants
 */
export const TEST_CONSTANTS = {
  // Routes that should be accessible to internal users
  INTERNAL_ROUTES: [
    '/internal',
    '/internal/publishers',
    '/internal/websites',
    '/internal/analytics',
    '/internal/settings',
  ],
  
  // API endpoints that should be accessible to internal users
  INTERNAL_API_ENDPOINTS: [
    '/api/publisher',
    '/api/publisher/offerings',
    '/api/websites',
    '/api/internal/analytics',
  ],
  
  // Routes that should NOT be accessible to publisher users
  RESTRICTED_ROUTES_FOR_PUBLISHERS: [
    '/internal/publishers',
    '/internal/analytics',
    '/admin',
  ],
  
  // Expected HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
  
  // Test data constraints
  DATA_CONSTRAINTS: {
    EMAIL_MAX_LENGTH: 255,
    COMPANY_NAME_MAX_LENGTH: 255,
    DOMAIN_MAX_LENGTH: 255,
    MIN_PASSWORD_LENGTH: 8,
  },
};

/**
 * Test Result Types
 */
export interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  results: TestResult[];
}

/**
 * Export all test files for easy import
 */
export const TEST_FILES = {
  CURRENT_STATE_FAILURES: '__tests__/e2e/internal-publisher-management/01-current-state-failures.spec.ts',
  IDEAL_FUTURE_STATE: '__tests__/e2e/internal-publisher-management/02-ideal-future-state.spec.ts',
  SPECIFIC_SCENARIOS: '__tests__/e2e/internal-publisher-management/03-specific-scenarios.spec.ts',
  SECURITY_TESTS: '__tests__/e2e/internal-publisher-management/04-security-tests.spec.ts',
};

/**
 * Quick test runner for individual test suites
 */
export class QuickTestRunner {
  static async runCurrentStateTests() {
    const { execSync } = require('child_process');
    return execSync(`npx playwright test ${TEST_FILES.CURRENT_STATE_FAILURES}`, { encoding: 'utf8' });
  }

  static async runFutureStateTests() {
    const { execSync } = require('child_process');
    return execSync(`npx playwright test ${TEST_FILES.IDEAL_FUTURE_STATE}`, { encoding: 'utf8' });
  }

  static async runSecurityTests() {
    const { execSync } = require('child_process');
    return execSync(`npx playwright test ${TEST_FILES.SECURITY_TESTS}`, { encoding: 'utf8' });
  }

  static async runAllTests() {
    const { execSync } = require('child_process');
    return execSync('npx playwright test __tests__/e2e/internal-publisher-management/', { encoding: 'utf8' });
  }
}