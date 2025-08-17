#!/usr/bin/env node
/**
 * Authentication Test Suite - Main Orchestrator
 * Comprehensive E2E testing for Guest Post Workflow authentication system
 * 
 * Usage: node tests/e2e/auth-suite.js [--parallel] [--verbose] [--headless]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Import test utilities
const { setupBrowser, closeBrowser } = require('./utils/browser-utils');
const { verifyDatabaseConnection } = require('./utils/db-helpers');
const { generateTestReport } = require('./utils/test-config');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  headless: process.argv.includes('--headless'),
  verbose: process.argv.includes('--verbose'),
  parallel: process.argv.includes('--parallel'),
  timeout: 30000,
  screenshotDir: path.join(__dirname, 'reports', 'screenshots'),
  reportDir: path.join(__dirname, 'reports')
};

// Test users from production database
const TEST_USERS = {
  internal: [
    { email: 'miro@outreachlabs.com', password: 'test123', type: 'internal' },
    { email: 'darko@outreachlabs.com', password: 'test123', type: 'internal' },
    { email: 'leo@outreachlabs.com', password: 'test123', type: 'internal' }
  ],
  account: [
    // Account users will be populated from database verification
  ]
};

// Test suites to execute
const TEST_SUITES = [
  {
    name: 'Authentication Flow Tests',
    file: './specs/authentication.test.js',
    priority: 1
  },
  {
    name: 'Routing Protection Tests', 
    file: './specs/routing.test.js',
    priority: 2
  },
  {
    name: 'Permission Boundary Tests',
    file: './specs/permissions.test.js',
    priority: 3
  },
  {
    name: 'User Journey Tests',
    file: './specs/user-journeys.test.js',
    priority: 4
  }
];

class AuthTestOrchestrator {
  constructor(config) {
    this.config = config;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
      suites: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Authentication Test Suite...');
    
    // Create report directories
    this.ensureDirectories();
    
    // Verify database connection
    console.log('📊 Verifying database connection...');
    await verifyDatabaseConnection();
    
    // Setup browser
    console.log('🌐 Setting up browser environment...');
    await setupBrowser(this.config);
    
    // Verify development server
    console.log('🏠 Verifying development server...');
    await this.verifyDevServer();
    
    console.log('✅ Initialization complete!\n');
  }

  ensureDirectories() {
    const dirs = [this.config.screenshotDir, this.config.reportDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async verifyDevServer() {
    try {
      const response = await fetch(this.config.baseUrl);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      console.log(`✅ Development server running at ${this.config.baseUrl}`);
    } catch (error) {
      console.error(`❌ Development server not accessible: ${error.message}`);
      console.error('Please ensure the server is running with: npm run dev');
      process.exit(1);
    }
  }

  async runTests() {
    this.results.startTime = new Date();
    console.log('🧪 Starting authentication test execution...\n');

    if (this.config.parallel) {
      await this.runTestsParallel();
    } else {
      await this.runTestsSequential();
    }

    this.results.endTime = new Date();
    await this.generateReport();
  }

  async runTestsSequential() {
    for (const suite of TEST_SUITES.sort((a, b) => a.priority - b.priority)) {
      console.log(`\n📋 Running: ${suite.name}`);
      const result = await this.executeSuite(suite);
      this.results.suites.push(result);
      this.updateTotals(result);
    }
  }

  async runTestsParallel() {
    console.log('⚡ Running tests in parallel...');
    const promises = TEST_SUITES.map(suite => this.executeSuite(suite));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.results.suites.push(result.value);
        this.updateTotals(result.value);
      } else {
        console.error(`❌ Suite ${TEST_SUITES[index].name} failed:`, result.reason);
      }
    });
  }

  async executeSuite(suite) {
    const startTime = Date.now();
    
    try {
      // Execute test suite using Jest or similar test runner
      const result = await this.runJestSuite(suite.file);
      const endTime = Date.now();
      
      return {
        name: suite.name,
        file: suite.file,
        status: result.success ? 'passed' : 'failed',
        duration: endTime - startTime,
        tests: result.tests,
        errors: result.errors || []
      };
    } catch (error) {
      return {
        name: suite.name,
        file: suite.file,
        status: 'failed',
        duration: Date.now() - startTime,
        tests: [],
        errors: [error.message]
      };
    }
  }

  async runJestSuite(testFile) {
    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', testFile, '--json'], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      jest.stdout.on('data', (data) => {
        output += data.toString();
      });

      jest.on('close', (code) => {
        try {
          const result = JSON.parse(output);
          resolve({
            success: result.success,
            tests: result.testResults || [],
            errors: result.errors || []
          });
        } catch (error) {
          reject(new Error(`Failed to parse test output: ${error.message}`));
        }
      });
    });
  }

  updateTotals(suiteResult) {
    if (suiteResult.tests) {
      suiteResult.tests.forEach(test => {
        this.results.total++;
        if (test.status === 'passed') this.results.passed++;
        else if (test.status === 'failed') this.results.failed++;
        else this.results.skipped++;
      });
    }
  }

  async generateReport() {
    const duration = this.results.endTime - this.results.startTime;
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 AUTHENTICATION TEST SUITE RESULTS');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`📋 Total: ${this.results.total}`);
    console.log('='.repeat(60));

    // Generate detailed report
    const reportPath = path.join(this.config.reportDir, `auth-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`📄 Detailed report saved: ${reportPath}`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Some tests failed. Check the report for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    await closeBrowser();
    console.log('✅ Cleanup complete');
  }
}

// Main execution
async function main() {
  const orchestrator = new AuthTestOrchestrator(TEST_CONFIG);
  
  try {
    await orchestrator.initialize();
    await orchestrator.runTests();
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    await orchestrator.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test suite interrupted. Cleaning up...');
  await closeBrowser();
  process.exit(0);
});

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AuthTestOrchestrator;