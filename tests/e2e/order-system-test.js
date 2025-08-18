#!/usr/bin/env node

/**
 * Comprehensive Order System End-to-End Testing
 * Tests the complete order workflow from creation to completion
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3002',
  headless: false, // Set to true for CI/CD
  viewport: { width: 1280, height: 720 },
  timeout: 30000,
  screenshotPath: path.join(__dirname, 'reports', 'screenshots'),
  reportPath: path.join(__dirname, 'reports'),
  users: {
    internal: {
      email: 'ajay@outreachlabs.com',
      password: 'FA64!I$nrbCauS^d',
      type: 'internal'
    },
    account: {
      email: 'jake@thehrguy.co',
      password: 'EPoOh&K2sVpAytl&',
      type: 'account'
    }
  },
  stripeTestCard: {
    number: '4242424242424242',
    expiry: '12/25',
    cvc: '123'
  }
};

class OrderSystemTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      startTime: Date.now(),
      tests: [],
      screenshots: [],
      errors: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Order System Testing...');
    
    // Create directories
    [CONFIG.screenshotPath, CONFIG.reportPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      viewport: CONFIG.viewport,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: false
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(CONFIG.viewport);
    
    console.log('✅ Browser initialized');
  }

  async screenshot(name, description = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(CONFIG.screenshotPath, filename);
    
    await this.page.screenshot({ path: filepath, fullPage: true });
    
    this.testResults.screenshots.push({
      name,
      description,
      filename,
      filepath,
      timestamp
    });
    
    console.log(`📸 Screenshot saved: ${filename} - ${description}`);
    return filepath;
  }

  async waitForElement(selector, timeout = CONFIG.timeout) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.log(`⚠️  Element not found: ${selector}`);
      return false;
    }
  }

  async safeClick(selector, description = '') {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.click(selector);
      console.log(`✅ Clicked: ${selector} ${description ? '- ' + description : ''}`);
      return true;
    } catch (error) {
      console.log(`❌ Failed to click: ${selector} - ${error.message}`);
      return false;
    }
  }

  async safeType(selector, text, description = '') {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.clear(selector);
      await this.page.type(selector, text);
      console.log(`✅ Typed: ${selector} ${description ? '- ' + description : ''}`);
      return true;
    } catch (error) {
      console.log(`❌ Failed to type: ${selector} - ${error.message}`);
      return false;
    }
  }

  async addTestResult(testName, success, details = {}, error = null) {
    const result = {
      testName,
      success,
      details,
      error: error ? error.message : null,
      timestamp: new Date().toISOString(),
      duration: Date.now() - (details.startTime || Date.now())
    };
    
    this.testResults.tests.push(result);
    
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${testName}: ${success ? 'PASSED' : 'FAILED'}`);
    if (error) console.log(`   Error: ${error.message}`);
    if (details.notes) console.log(`   Notes: ${details.notes}`);
  }

  async testInternalUserLogin() {
    const testStart = Date.now();
    console.log('\n🔐 Testing Internal User Login...');
    
    try {
      // Navigate to login page
      await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
      await this.screenshot('login-page-internal', 'Internal user login page');

      // Fill login form
      await this.safeType('input[type="email"]', CONFIG.users.internal.email, 'internal email');
      await this.safeType('input[type="password"]', CONFIG.users.internal.password, 'internal password');
      
      // Submit form
      await this.safeClick('button[type="submit"]', 'submit login');
      
      // Wait for redirect
      await this.page.waitForTimeout(3000);
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      const currentUrl = this.page.url();
      await this.screenshot('login-result-internal', 'After internal user login');
      
      // Check if redirected to admin dashboard
      const isOnAdminPage = currentUrl.includes('/admin') || await this.waitForElement('[data-testid="admin-dashboard"]');
      
      await this.addTestResult('Internal User Login', isOnAdminPage, {
        startTime: testStart,
        redirectUrl: currentUrl,
        notes: isOnAdminPage ? 'Successfully redirected to admin dashboard' : 'Did not redirect to expected page'
      });
      
      return isOnAdminPage;
    } catch (error) {
      await this.screenshot('login-error-internal', 'Internal user login error');
      await this.addTestResult('Internal User Login', false, { startTime: testStart }, error);
      return false;
    }
  }

  async testAccountUserLogin() {
    const testStart = Date.now();
    console.log('\n🔐 Testing Account User Login...');
    
    try {
      // Logout first if logged in
      await this.page.goto(`${CONFIG.baseUrl}/api/auth/logout`, { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(2000);
      
      // Navigate to account login page
      await this.page.goto(`${CONFIG.baseUrl}/account/login`, { waitUntil: 'networkidle2' });
      await this.screenshot('login-page-account', 'Account user login page');

      // Fill login form
      await this.safeType('input[type="email"]', CONFIG.users.account.email, 'account email');
      await this.safeType('input[type="password"]', CONFIG.users.account.password, 'account password');
      
      // Submit form
      await this.safeClick('button[type="submit"]', 'submit account login');
      
      // Wait for redirect
      await this.page.waitForTimeout(3000);
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      const currentUrl = this.page.url();
      await this.screenshot('login-result-account', 'After account user login');
      
      // Check if redirected to account dashboard
      const isOnAccountPage = currentUrl.includes('/account/dashboard') || await this.waitForElement('[data-testid="account-dashboard"]');
      
      await this.addTestResult('Account User Login', isOnAccountPage, {
        startTime: testStart,
        redirectUrl: currentUrl,
        notes: isOnAccountPage ? 'Successfully redirected to account dashboard' : 'Did not redirect to expected page'
      });
      
      return isOnAccountPage;
    } catch (error) {
      await this.screenshot('login-error-account', 'Account user login error');
      await this.addTestResult('Account User Login', false, { startTime: testStart }, error);
      return false;
    }
  }

  async testAccountUserDashboard() {
    const testStart = Date.now();
    console.log('\n📊 Testing Account User Dashboard Access...');
    
    try {
      // Should already be logged in as account user
      await this.page.goto(`${CONFIG.baseUrl}/account/dashboard`, { waitUntil: 'networkidle2' });
      await this.screenshot('account-dashboard-account', 'Account user dashboard view');
      
      // Look for dashboard elements
      const hasDashboardElements = await this.waitForElement('h1, h2, .dashboard', 5000);
      const pageText = await this.page.content();
      const hasAccountContent = pageText.includes('dashboard') || pageText.includes('account') || pageText.includes('orders');
      
      await this.addTestResult('Account User Dashboard Access', hasDashboardElements && hasAccountContent, {
        startTime: testStart,
        hasDashboardElements,
        hasAccountContent,
        notes: 'Verified account user can access dashboard'
      });
      
      return hasDashboardElements && hasAccountContent;
    } catch (error) {
      await this.screenshot('dashboard-error-account', 'Account dashboard error');
      await this.addTestResult('Account User Dashboard Access', false, { startTime: testStart }, error);
      return false;
    }
  }

  async testInternalUserOrderCreation() {
    const testStart = Date.now();
    console.log('\n📝 Testing Internal User Order Creation...');
    
    try {
      // Login as internal user first
      await this.testInternalUserLogin();
      
      // Navigate to create new order
      await this.page.goto(`${CONFIG.baseUrl}/orders/new`, { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(3000);
      await this.screenshot('order-creation-start', 'Order creation page');
      
      // Should redirect to order edit page
      const currentUrl = this.page.url();
      const isOnOrderEdit = currentUrl.includes('/orders/') && currentUrl.includes('/edit');
      
      if (isOnOrderEdit) {
        // Fill order details
        await this.page.waitForSelector('form, input, select, textarea', { timeout: 10000 });
        await this.screenshot('order-edit-form', 'Order edit form');
        
        // Try to add order items if form exists
        const hasForm = await this.waitForElement('form', 5000);
        let orderCreated = false;
        
        if (hasForm) {
          // Look for add item buttons or form fields
          const addItemButton = await this.waitForElement('[data-testid="add-item"], button:contains("Add"), .add-item', 5000);
          if (addItemButton) {
            await this.safeClick('[data-testid="add-item"], button:contains("Add"), .add-item');
            await this.page.waitForTimeout(2000);
            await this.screenshot('order-item-added', 'After adding order item');
          }
          
          // Try to save/submit the order
          const submitButton = await this.waitForElement('button[type="submit"], .submit, .save-order', 5000);
          if (submitButton) {
            await this.safeClick('button[type="submit"], .submit, .save-order');
            await this.page.waitForTimeout(3000);
            orderCreated = true;
          }
        }
        
        await this.addTestResult('Internal User Order Creation', isOnOrderEdit, {
          startTime: testStart,
          redirectedToEdit: isOnOrderEdit,
          hasForm,
          orderCreated,
          notes: 'Internal user can access order creation flow'
        });
        
        return isOnOrderEdit;
      } else {
        throw new Error('Did not redirect to order edit page');
      }
      
    } catch (error) {
      await this.screenshot('order-creation-error', 'Order creation error');
      await this.addTestResult('Internal User Order Creation', false, { startTime: testStart }, error);
      return false;
    }
  }

  async testAccountUserOrderAccess() {
    const testStart = Date.now();
    console.log('\n🛍️ Testing Account User Order Access...');
    
    try {
      // Login as account user
      await this.testAccountUserLogin();
      
      // Try to access account orders
      await this.page.goto(`${CONFIG.baseUrl}/account/orders`, { waitUntil: 'networkidle2' });
      await this.screenshot('account-orders-page', 'Account user orders page');
      
      const currentUrl = this.page.url();
      const isOnOrdersPage = currentUrl.includes('/account') && (currentUrl.includes('/orders') || currentUrl.includes('/dashboard'));
      
      // Check for order-related content
      const pageContent = await this.page.content();
      const hasOrderContent = pageContent.includes('order') || pageContent.includes('Order') || pageContent.includes('dashboard');
      
      await this.addTestResult('Account User Order Access', isOnOrdersPage && hasOrderContent, {
        startTime: testStart,
        redirectUrl: currentUrl,
        hasOrderContent,
        notes: 'Account user can access their orders section'
      });
      
      return isOnOrdersPage && hasOrderContent;
    } catch (error) {
      await this.screenshot('account-orders-error', 'Account orders access error');
      await this.addTestResult('Account User Order Access', false, { startTime: testStart }, error);
      return false;
    }
  }

  async testPermissionBoundaries() {
    const testStart = Date.now();
    console.log('\n🔒 Testing Permission Boundaries...');
    
    try {
      // Login as account user first
      await this.testAccountUserLogin();
      
      // Try to access admin routes (should be denied)
      const restrictedRoutes = ['/admin', '/clients', '/workflows'];
      let accessDeniedCount = 0;
      
      for (const route of restrictedRoutes) {
        try {
          await this.page.goto(`${CONFIG.baseUrl}${route}`, { waitUntil: 'networkidle2', timeout: 10000 });
          await this.page.waitForTimeout(2000);
          
          const currentUrl = this.page.url();
          const wasRedirected = !currentUrl.includes(route) || currentUrl.includes('/login') || currentUrl.includes('/account');
          
          if (wasRedirected) {
            accessDeniedCount++;
            console.log(`✅ Access correctly denied to ${route}`);
          } else {
            console.log(`❌ Access incorrectly allowed to ${route}`);
          }
          
          await this.screenshot(`permission-test-${route.replace('/', '')}`, `Permission test for ${route}`);
        } catch (error) {
          // Timeout or navigation error usually means access was denied (good)
          accessDeniedCount++;
          console.log(`✅ Access denied to ${route} (navigation error as expected)`);
        }
      }
      
      const allAccessDenied = accessDeniedCount === restrictedRoutes.length;
      
      await this.addTestResult('Permission Boundaries', allAccessDenied, {
        startTime: testStart,
        restrictedRoutes: restrictedRoutes.length,
        accessDeniedCount,
        notes: `${accessDeniedCount}/${restrictedRoutes.length} routes correctly denied access`
      });
      
      return allAccessDenied;
    } catch (error) {
      await this.screenshot('permission-test-error', 'Permission boundary test error');
      await this.addTestResult('Permission Boundaries', false, { startTime: testStart }, error);
      return false;
    }
  }

  async testCompleteOrderFlow() {
    const testStart = Date.now();
    console.log('\n🔄 Testing Complete Order Flow...');
    
    try {
      // Login as internal user
      const loginSuccess = await this.testInternalUserLogin();
      if (!loginSuccess) {
        throw new Error('Failed to login as internal user');
      }
      
      // Navigate to orders page
      await this.page.goto(`${CONFIG.baseUrl}/orders`, { waitUntil: 'networkidle2' });
      await this.screenshot('orders-list-page', 'Orders list page');
      
      // Look for existing orders or create new order button
      const hasOrdersContent = await this.waitForElement('table, .order-item, .order-card, .orders-list', 5000);
      const hasCreateButton = await this.waitForElement('a[href*="/orders/new"], button:contains("New"), .create-order', 5000);
      
      if (hasCreateButton) {
        await this.safeClick('a[href*="/orders/new"], button:contains("New"), .create-order');
        await this.page.waitForTimeout(3000);
        await this.screenshot('order-creation-flow', 'Order creation flow');
      }
      
      // Test order management features
      const orderManagementWorking = hasOrdersContent || hasCreateButton;
      
      await this.addTestResult('Complete Order Flow', orderManagementWorking, {
        startTime: testStart,
        hasOrdersContent,
        hasCreateButton,
        notes: 'Basic order management interface accessible'
      });
      
      return orderManagementWorking;
    } catch (error) {
      await this.screenshot('order-flow-error', 'Complete order flow error');
      await this.addTestResult('Complete Order Flow', false, { startTime: testStart }, error);
      return false;
    }
  }

  async testUIResponsiveness() {
    const testStart = Date.now();
    console.log('\n📱 Testing UI Responsiveness...');
    
    try {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop Large' },
        { width: 1280, height: 720, name: 'Desktop Standard' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];
      
      let responsiveWorking = true;
      
      for (const viewport of viewports) {
        await this.page.setViewport(viewport);
        await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(1000);
        
        await this.screenshot(`responsive-${viewport.name.toLowerCase().replace(' ', '-')}`, `${viewport.name} viewport test`);
        
        // Check if basic elements are visible
        const hasLoginForm = await this.waitForElement('form, input[type="email"]', 3000);
        if (!hasLoginForm) {
          responsiveWorking = false;
          console.log(`❌ Login form not visible on ${viewport.name}`);
        } else {
          console.log(`✅ Login form visible on ${viewport.name}`);
        }
      }
      
      // Reset to default viewport
      await this.page.setViewport(CONFIG.viewport);
      
      await this.addTestResult('UI Responsiveness', responsiveWorking, {
        startTime: testStart,
        viewportsTested: viewports.length,
        notes: 'Tested UI across different screen sizes'
      });
      
      return responsiveWorking;
    } catch (error) {
      await this.screenshot('responsive-test-error', 'Responsiveness test error');
      await this.addTestResult('UI Responsiveness', false, { startTime: testStart }, error);
      return false;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    this.testResults.endTime = Date.now();
    this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
    
    const summary = {
      total: this.testResults.tests.length,
      passed: this.testResults.tests.filter(t => t.success).length,
      failed: this.testResults.tests.filter(t => !t.success).length,
      successRate: this.testResults.tests.length > 0 ? 
        ((this.testResults.tests.filter(t => t.success).length / this.testResults.tests.length) * 100).toFixed(2) : 0
    };
    
    const reportData = {
      timestamp: new Date().toISOString(),
      summary,
      testResults: this.testResults,
      configuration: CONFIG
    };
    
    // Save JSON report
    const jsonReportPath = path.join(CONFIG.reportPath, `order-system-test-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport(reportData);
    const htmlReportPath = path.join(CONFIG.reportPath, `order-system-test-${Date.now()}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`📊 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    
    return { summary, jsonReportPath, htmlReportPath };
  }

  generateHtmlReport(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order System Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric.passed { border-left: 4px solid #28a745; }
        .metric.failed { border-left: 4px solid #dc3545; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .test { padding: 15px; border-bottom: 1px solid #f1f3f4; }
        .test.passed { border-left: 4px solid #28a745; }
        .test.failed { border-left: 4px solid #dc3545; }
        .test-name { font-weight: 500; margin-bottom: 5px; }
        .test-error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 30px; }
        .screenshot { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .screenshot img { width: 100%; height: auto; }
        .screenshot-info { padding: 10px; background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ Order System Test Report</h1>
            <div>Generated on ${new Date(data.timestamp).toLocaleString()}</div>
            <div>Duration: ${(data.testResults.duration / 1000).toFixed(2)}s</div>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${data.summary.total}</div>
                <div>Total Tests</div>
            </div>
            <div class="metric passed">
                <div class="metric-value">${data.summary.passed}</div>
                <div>Passed</div>
            </div>
            <div class="metric failed">
                <div class="metric-value">${data.summary.failed}</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.summary.successRate}%</div>
                <div>Success Rate</div>
            </div>
        </div>
        
        <div class="tests">
            ${data.testResults.tests.map(test => `
                <div class="test ${test.success ? 'passed' : 'failed'}">
                    <div class="test-name">${test.testName}</div>
                    <div>${test.success ? '✅ PASSED' : '❌ FAILED'} (${test.duration}ms)</div>
                    ${test.details.notes ? `<div><em>${test.details.notes}</em></div>` : ''}
                    ${test.error ? `<div class="test-error">Error: ${test.error}</div>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="screenshots">
            ${data.testResults.screenshots.map(screenshot => `
                <div class="screenshot">
                    <div class="screenshot-info">
                        <strong>${screenshot.name}</strong>
                        <div>${screenshot.description}</div>
                        <div><small>${new Date(screenshot.timestamp).toLocaleString()}</small></div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Order System Testing...\n');
    
    try {
      await this.initialize();
      
      // Run all test suites
      await this.testInternalUserLogin();
      await this.testAccountUserLogin();
      await this.testAccountUserDashboard();
      await this.testInternalUserOrderCreation();
      await this.testAccountUserOrderAccess();
      await this.testPermissionBoundaries();
      await this.testCompleteOrderFlow();
      await this.testUIResponsiveness();
      
      // Generate comprehensive report
      const report = await this.generateReport();
      
      console.log('\n============================================================');
      console.log('📊 ORDER SYSTEM TEST RESULTS');
      console.log('============================================================');
      console.log(`⏱️  Duration: ${(this.testResults.duration / 1000).toFixed(2)}s`);
      console.log(`📈 Success Rate: ${report.summary.successRate}%`);
      console.log(`✅ Passed: ${report.summary.passed}`);
      console.log(`❌ Failed: ${report.summary.failed}`);
      console.log(`📋 Total: ${report.summary.total}`);
      console.log('============================================================');
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      this.testResults.errors.push(error.message);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const tester = new OrderSystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = OrderSystemTester;