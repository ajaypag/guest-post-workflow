/**
 * Test Configuration and Reporting Utilities
 * Centralized configuration and report generation for E2E tests
 */

const fs = require('fs');
const path = require('path');

// Test environment configuration
const TEST_CONFIG = {
  // Server configuration
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3002',
  timeout: {
    default: 30000,
    navigation: 45000,
    element: 10000,
    api: 15000
  },
  
  // Browser configuration
  browser: {
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
  },
  
  // Test execution configuration
  execution: {
    parallel: process.env.PARALLEL === 'true',
    verbose: process.env.VERBOSE === 'true',
    retries: parseInt(process.env.RETRIES) || 2,
    screenshotOnFailure: true
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable',
    maxConnections: 10,
    timeout: 5000
  },
  
  // File paths
  paths: {
    reports: path.join(__dirname, '../reports'),
    screenshots: path.join(__dirname, '../reports/screenshots'),
    logs: path.join(__dirname, '../reports/logs'),
    testData: path.join(__dirname, '../test-data')
  },
  
  // Authentication routes
  routes: {
    auth: {
      login: '/login',
      logout: '/api/auth/logout',
      me: '/api/auth/me'
    },
    internal: {
      dashboard: '/admin',
      clients: '/clients',
      workflows: '/workflows',
      contacts: '/contacts',
      orders: '/admin/orders'
    },
    account: {
      dashboard: '/account/dashboard',
      orders: '/account/orders',
      profile: '/account/profile',
      settings: '/account/settings'
    }
  }
};

// Test user configuration
const TEST_USERS = {
  internal: [
    {
      email: 'ajay@outreachlabs.com',
      password: 'FA64!I$nrbCauS^d',
      type: 'internal',
      name: 'Ajay',
      role: 'admin'
    }
  ],
  account: [
    {
      email: 'jake@thehrguy.co',
      password: 'EPoOh&K2sVpAytl&',
      type: 'account',
      name: 'Jake',
      role: 'account'
    }
  ],
  invalid: [
    {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
      type: 'invalid'
    },
    {
      email: 'test@test.com',
      password: '',
      type: 'invalid'
    }
  ]
};

// Test scenarios configuration
const TEST_SCENARIOS = {
  authentication: [
    {
      name: 'Internal User Login Success',
      type: 'internal',
      expectedRedirect: '/admin',
      shouldSucceed: true
    },
    {
      name: 'Account User Login Success',
      type: 'account',
      expectedRedirect: '/account/dashboard',
      shouldSucceed: true
    },
    {
      name: 'Invalid Credentials',
      type: 'invalid',
      expectedRedirect: '/login',
      shouldSucceed: false
    },
    {
      name: 'Empty Password',
      type: 'invalid',
      expectedRedirect: '/login',
      shouldSucceed: false
    }
  ],
  routing: [
    {
      name: 'Internal Routes Access',
      routes: ['/admin', '/clients', '/workflows', '/contacts'],
      userType: 'internal',
      shouldHaveAccess: true
    },
    {
      name: 'Account Routes Access',
      routes: ['/account/dashboard', '/account/orders', '/account/profile'],
      userType: 'account',
      shouldHaveAccess: true
    },
    {
      name: 'Unauthorized Access',
      routes: ['/admin', '/clients'],
      userType: 'account',
      shouldHaveAccess: false
    }
  ],
  permissions: [
    {
      name: 'Internal User Admin Access',
      userType: 'internal',
      permissions: ['admin', 'read_all', 'write_all']
    },
    {
      name: 'Account User Limited Access',
      userType: 'account',
      permissions: ['read_own', 'write_own']
    }
  ]
};

/**
 * Initialize test environment and directories
 */
function initializeTestEnvironment() {
  console.log('🔧 Initializing test environment...');
  
  // Create required directories
  Object.values(TEST_CONFIG.paths).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Log configuration in verbose mode
  if (TEST_CONFIG.execution.verbose) {
    console.log('📋 Test Configuration:', JSON.stringify(TEST_CONFIG, null, 2));
  }
  
  console.log('✅ Test environment initialized');
}

/**
 * Generate comprehensive test report
 * @param {Object} results - Test execution results
 * @returns {Promise<string>} Report file path
 */
async function generateTestReport(results) {
  const timestamp = new Date().toISOString();
  const reportData = {
    metadata: {
      timestamp: timestamp,
      environment: process.env.NODE_ENV || 'development',
      baseUrl: TEST_CONFIG.baseUrl,
      browser: TEST_CONFIG.browser,
      duration: results.endTime - results.startTime
    },
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      successRate: results.total > 0 ? ((results.passed / results.total) * 100).toFixed(2) : 0
    },
    suites: results.suites || [],
    configuration: TEST_CONFIG
  };
  
  // Generate JSON report
  const jsonReportPath = path.join(
    TEST_CONFIG.paths.reports, 
    `auth-test-report-${timestamp.replace(/[:.]/g, '-')}.json`
  );
  
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
  
  // Generate HTML report
  const htmlReportPath = await generateHtmlReport(reportData, timestamp);
  
  console.log(`📊 Reports generated:`);
  console.log(`   JSON: ${jsonReportPath}`);
  console.log(`   HTML: ${htmlReportPath}`);
  
  return htmlReportPath;
}

/**
 * Generate HTML test report
 * @param {Object} reportData - Report data
 * @param {string} timestamp - Report timestamp
 * @returns {Promise<string>} HTML report file path
 */
async function generateHtmlReport(reportData, timestamp) {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2em; }
        .header .subtitle { opacity: 0.9; margin-top: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric.passed { border-left-color: #28a745; }
        .metric.failed { border-left-color: #dc3545; }
        .metric.skipped { border-left-color: #ffc107; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6c757d; font-size: 0.9em; text-transform: uppercase; }
        .suite { margin: 20px 30px; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #dee2e6; font-weight: bold; }
        .test { padding: 15px; border-bottom: 1px solid #f1f3f4; }
        .test:last-child { border-bottom: none; }
        .test.passed { border-left: 4px solid #28a745; }
        .test.failed { border-left: 4px solid #dc3545; }
        .test.skipped { border-left: 4px solid #ffc107; }
        .test-name { font-weight: 500; margin-bottom: 5px; }
        .test-duration { color: #6c757d; font-size: 0.9em; }
        .test-error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.9em; }
        .footer { background: #f8f9fa; padding: 20px 30px; border-radius: 0 0 8px 8px; color: #6c757d; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Authentication Test Report</h1>
            <div class="subtitle">Generated on ${new Date(timestamp).toLocaleString()}</div>
            <div class="subtitle">Environment: ${reportData.metadata.environment} | Base URL: ${reportData.metadata.baseUrl}</div>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${reportData.summary.total}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric passed">
                <div class="metric-value">${reportData.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric failed">
                <div class="metric-value">${reportData.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric skipped">
                <div class="metric-value">${reportData.summary.skipped}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value">${reportData.summary.successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>
        
        ${reportData.suites.map(suite => `
            <div class="suite">
                <div class="suite-header">${suite.name} (${suite.duration}ms)</div>
                ${suite.tests.map(test => `
                    <div class="test ${test.status}">
                        <div class="test-name">${test.name || test.title}</div>
                        <div class="test-duration">${test.duration || 0}ms</div>
                        ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}
        
        <div class="footer">
            <p>Test Duration: ${reportData.metadata.duration}ms | Generated by Guest Post Workflow E2E Test Suite</p>
        </div>
    </div>
</body>
</html>`;

  const htmlReportPath = path.join(
    TEST_CONFIG.paths.reports,
    `auth-test-report-${timestamp.replace(/[:.]/g, '-')}.html`
  );
  
  fs.writeFileSync(htmlReportPath, htmlTemplate);
  return htmlReportPath;
}

/**
 * Log test execution information
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function logTestExecution(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  // Console output
  const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${emoji} [${timestamp}] ${message}`);
  
  if (data && TEST_CONFIG.execution.verbose) {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
  
  // File logging
  const logFile = path.join(TEST_CONFIG.paths.logs, `test-execution-${new Date().toISOString().split('T')[0]}.log`);
  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFileSync(logFile, logLine);
}

/**
 * Get test configuration
 * @returns {Object} Current test configuration
 */
function getConfig() {
  return TEST_CONFIG;
}

/**
 * Get test users configuration
 * @returns {Object} Test users configuration
 */
function getTestUsers() {
  return TEST_USERS;
}

/**
 * Get test scenarios configuration
 * @returns {Object} Test scenarios configuration
 */
function getTestScenarios() {
  return TEST_SCENARIOS;
}

module.exports = {
  TEST_CONFIG,
  TEST_USERS,
  TEST_SCENARIOS,
  initializeTestEnvironment,
  generateTestReport,
  generateHtmlReport,
  logTestExecution,
  getConfig,
  getTestUsers,
  getTestScenarios
};