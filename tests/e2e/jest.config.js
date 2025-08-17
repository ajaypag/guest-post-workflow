/**
 * Jest Configuration for E2E Authentication Tests
 * Optimized for Puppeteer-based browser automation testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/specs/**/*.test.js',
    '**/tests/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Test timeout
  testTimeout: 60000, // 60 seconds for E2E tests
  
  // Coverage configuration
  collectCoverage: false, // Disable for E2E tests
  
  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],
  
  // Global variables
  globals: {
    TEST_BASE_URL: 'http://localhost:3000',
    TEST_TIMEOUT: 30000,
    HEADLESS: true,
    VERBOSE: false
  },
  
  // Test execution
  maxWorkers: process.env.CI ? 2 : '50%', // Limit workers in CI
  
  // Reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './reports',
        filename: 'jest-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Guest Post Workflow E2E Test Report'
      }
    ]
  ],
  
  // Verbose output
  verbose: process.env.VERBOSE === 'true',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'ts',
    'tsx'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Test environment options
  testEnvironmentOptions: {
    // Node.js environment options
  },
  
  // Setup and teardown
  globalSetup: '<rootDir>/jest.globalSetup.js',
  globalTeardown: '<rootDir>/jest.globalTeardown.js'
};