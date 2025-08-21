/**
 * Jest Configuration for Target URL Matching Tests
 * 
 * Specialized Jest configuration for testing target URL matching functionality
 * with appropriate mocks, coverage settings, and test environment setup.
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to your Next.js app
  dir: './',
});

// Custom Jest configuration for target matching tests
const customJestConfig = {
  displayName: 'Target URL Matching Tests',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts',
    '<rootDir>/__tests__/target-matching-setup.ts'
  ],
  
  // Test match patterns - only run target matching related tests
  testMatch: [
    '**/__tests__/**/*target*url*matching*.(test|spec).(js|jsx|ts|tsx)',
    '**/__tests__/**/*target*matching*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/e2e/', // E2E tests run separately
    '<rootDir>/__tests__/utils/',
    '<rootDir>/__tests__/setup.ts',
    '<rootDir>/__tests__/target-matching-setup.ts'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    // Include target matching related files
    'components/BulkAnalysisTable.tsx',
    'types/bulk-analysis.ts',
    'app/api/clients/[id]/bulk-analysis/target-match/route.ts',
    'app/api/clients/[id]/bulk-analysis/master-qualify/route.ts',
    'lib/services/aiQualificationService.ts',
    'lib/services/masterQualificationService.ts',
    
    // Exclude unnecessary files
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/migrations/**',
    '!**/docs/**',
    '!**/backups/**'
  ],
  
  // Coverage thresholds specific to target matching functionality
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    },
    // Specific thresholds for key components
    'components/BulkAnalysisTable.tsx': {
      branches: 60, // Lower due to complex conditional rendering
      functions: 70,
      lines: 70,
      statements: 70
    },
    'app/api/clients/[id]/bulk-analysis/target-match/route.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/target-matching',
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Resolver configuration for Next.js
  resolver: undefined,
  
  // Test timeout
  testTimeout: 30000, // 30 seconds for complex component tests
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Global setup
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  
  // Mock patterns
  modulePathIgnorePatterns: [
    '<rootDir>/tools/',
    '<rootDir>/scripts/',
    '<rootDir>/migrations/'
  ],
  
  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3001'
  },
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ],
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/target-matching',
        filename: 'jest-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Target URL Matching Test Report'
      }
    ]
  ],
  
  // Test result processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Snapshot serializers
  snapshotSerializers: [
    '@emotion/jest/serializer'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$|@testing-library))'
  ]
};

// Create and export the Jest config
module.exports = createJestConfig(customJestConfig);