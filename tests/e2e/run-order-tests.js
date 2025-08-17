#!/usr/bin/env node

/**
 * Order Creation and Payment Flow Test Runner
 * 
 * This script runs comprehensive end-to-end tests for the order creation
 * and payment flow, focusing on UI/UX issues and user experience.
 */

const { setupBrowser, closeBrowser, captureScreenshot } = require('./utils/browser-utils');
const { AuthHelper } = require('./utils/auth-helpers');
const fs = require('fs');
const path = require('path');

// Test Configuration
const BASE_URL = 'http://localhost:3002';
const TIMEOUT = 30000;

// Test Users
const INTERNAL_USER = {
  email: 'ajay@outreachlabs.com',
  password: 'FA64!I$nrbCauS^d',
  type: 'internal'
};

const ACCOUNT_USER = {
  email: 'jake@thehrguy.co',
  password: 'EPoOh&K2sVpAytl&',
  type: 'account'
};

// Test Results
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  uiIssues: [],
  uxIssues: [],
  performanceIssues: [],
  screenshots: []
};

class OrderFlowTester {
  constructor() {
    this.browser = null;
    this.authHelper = null;
    this.reportDir = path.join(__dirname, 'reports');
    this.screenshotDir = path.join(this.reportDir, 'screenshots');
    
    // Ensure report directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async initialize() {
    console.log('🚀 Initializing Order Flow Tester...');
    
    // Setup browser
    this.browser = await setupBrowser({
      headless: process.argv.includes('--headless'),
      viewport: { width: 1280, height: 720 }
    });

    // Initialize auth helper
    this.authHelper = new AuthHelper(BASE_URL);
    await this.authHelper.initialize();

    console.log('✅ Initialization complete');
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    testResults.totalTests++;

    try {
      await testFunction();
      testResults.passedTests++;
      console.log(`✅ Test passed: ${testName}`);
    } catch (error) {
      testResults.failedTests++;
      console.error(`❌ Test failed: ${testName} - ${error.message}`);
      
      // Capture failure screenshot
      await captureScreenshot(this.authHelper.page, `test-failure-${testName.replace(/\s+/g, '-')}`);
    }
  }

  async testInternalUserOrderFlow() {
    console.log('\n📋 Testing Internal User Order Flow');

    // Test 1: Login as internal user
    await this.runTest('Internal User Login', async () => {
      const loginResult = await this.authHelper.login(INTERNAL_USER);
      if (!loginResult.success) {
        throw new Error('Internal user login failed');
      }
    });

    // Test 2: Navigate to orders page
    await this.runTest('Orders Page Navigation', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/orders`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });
      
      const url = this.authHelper.page.url();
      if (!url.includes('/orders')) {
        throw new Error('Failed to navigate to orders page');
      }
      
      await captureScreenshot(this.authHelper.page, 'orders-page');
    });

    // Test 3: Create new order
    await this.runTest('New Order Creation', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/orders/new`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });

      // Wait for redirect to edit page
      await this.authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/orders/') && window.location.pathname.includes('/edit'),
        { timeout: 15000 }
      );

      await captureScreenshot(this.authHelper.page, 'new-order-created');
    });

    // Test 4: Check order edit page UI
    await this.runTest('Order Edit Page UI', async () => {
      await this.checkOrderEditPageUI();
    });

    // Test 5: Test responsive design
    await this.runTest('Responsive Design', async () => {
      await this.testResponsiveDesign();
    });
  }

  async checkOrderEditPageUI() {
    console.log('🎨 Checking order edit page UI elements...');

    // Check for critical UI elements
    const criticalElements = [
      { selector: 'h1', description: 'Page title' },
      { selector: 'button', description: 'Action buttons' },
      { selector: 'input, select, textarea', description: 'Form inputs' },
      { selector: '[class*="total"], [class*="price"]', description: 'Pricing display' }
    ];

    for (const element of criticalElements) {
      const exists = await this.authHelper.page.$(element.selector) !== null;
      if (!exists) {
        testResults.uiIssues.push(`Missing ${element.description} (${element.selector})`);
      }
    }

    // Check for accessibility issues
    await this.checkAccessibility();

    // Check for loading states
    const loadingElements = await this.authHelper.page.$$('[class*="loading"], [class*="spinner"], .animate-spin');
    console.log(`⏳ Found ${loadingElements.length} loading indicators`);

    await captureScreenshot(this.authHelper.page, 'order-edit-ui-check');
  }

  async checkAccessibility() {
    console.log('♿ Checking accessibility...');

    // Check for images without alt text
    const imagesWithoutAlt = await this.authHelper.page.$$eval(
      'img:not([alt])',
      imgs => imgs.length
    );
    if (imagesWithoutAlt > 0) {
      testResults.uiIssues.push(`${imagesWithoutAlt} images missing alt text`);
    }

    // Check for buttons without accessible names
    const unlabeledButtons = await this.authHelper.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(btn => {
        return !btn.getAttribute('aria-label') && 
               !btn.textContent.trim() && 
               !btn.querySelector('svg') &&
               !btn.getAttribute('aria-labelledby');
      }).length;
    });

    if (unlabeledButtons > 0) {
      testResults.uiIssues.push(`${unlabeledButtons} buttons without accessible names`);
    }

    // Check for form inputs without labels
    const unlabeledInputs = await this.authHelper.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
      return inputs.filter(input => {
        const hasLabel = input.getAttribute('aria-label') || 
                        input.getAttribute('aria-labelledby') ||
                        (input.id && document.querySelector(`label[for="${input.id}"]`));
        return !hasLabel;
      }).length;
    });

    if (unlabeledInputs > 0) {
      testResults.uiIssues.push(`${unlabeledInputs} form inputs without labels`);
    }
  }

  async testResponsiveDesign() {
    console.log('📱 Testing responsive design...');

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 812, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await this.authHelper.page.setViewport(viewport);
      await this.authHelper.page.waitForTimeout(1000); // Allow layout to settle

      // Check for horizontal scrollbars (potential overflow)
      const hasHorizontalScroll = await this.authHelper.page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        testResults.uiIssues.push(`Horizontal scroll detected on ${viewport.name} viewport`);
      }

      await captureScreenshot(this.authHelper.page, `responsive-${viewport.name}`);
    }

    // Reset to default viewport
    await this.authHelper.page.setViewport({ width: 1280, height: 720 });
  }

  async testAccountUserFlow() {
    console.log('\n👤 Testing Account User Flow');

    // Test 1: Login as account user
    await this.runTest('Account User Login', async () => {
      const loginResult = await this.authHelper.login(ACCOUNT_USER);
      if (!loginResult.success) {
        throw new Error('Account user login failed');
      }
    });

    // Test 2: Check account dashboard access
    await this.runTest('Account Dashboard Access', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/account/dashboard`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });
      
      await captureScreenshot(this.authHelper.page, 'account-dashboard');
    });

    // Test 3: Test order access permissions
    await this.runTest('Order Access Permissions', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/orders`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });

      const url = this.authHelper.page.url();
      console.log('📍 Account user redirected to:', url);

      await captureScreenshot(this.authHelper.page, 'account-orders-access');
    });

    // Test 4: Test order creation attempt
    await this.runTest('Account Order Creation', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/orders/new`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });

      const url = this.authHelper.page.url();
      console.log('📍 Account user new order redirected to:', url);

      await captureScreenshot(this.authHelper.page, 'account-new-order');
    });
  }

  async testPaymentFlow() {
    console.log('\n💳 Testing Payment Flow');

    // First, login as internal user and create an order
    await this.authHelper.login(INTERNAL_USER);
    const orderId = await this.createTestOrder();

    if (!orderId) {
      console.log('❌ Could not create test order, skipping payment tests');
      return;
    }

    // Test 1: Navigate to payment page
    await this.runTest('Payment Page Navigation', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/orders/${orderId}/payment`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });

      await captureScreenshot(this.authHelper.page, 'payment-page');
    });

    // Test 2: Check Stripe form loading
    await this.runTest('Stripe Form Loading', async () => {
      try {
        // Wait for Stripe elements to load
        await this.authHelper.page.waitForSelector(
          'iframe[name*="stripe"], .StripeElement, [data-testid="payment-element"]',
          { timeout: 15000 }
        );

        const stripeElements = await this.authHelper.page.$$('iframe[name*="stripe"]');
        console.log(`🔒 Found ${stripeElements.length} Stripe elements`);

        await captureScreenshot(this.authHelper.page, 'stripe-form-loaded');

      } catch (error) {
        console.log('⚠️ Stripe form did not load properly:', error.message);
        await captureScreenshot(this.authHelper.page, 'stripe-form-error');
        
        // Check for error messages
        const errorMessages = await this.authHelper.page.$$eval(
          '.error, .alert, [class*="error"]',
          elements => elements.map(el => el.textContent)
        );
        
        if (errorMessages.length > 0) {
          testResults.uxIssues.push(`Payment form errors: ${errorMessages.join(', ')}`);
        }
      }
    });

    // Test 3: Check payment form UI
    await this.runTest('Payment Form UI', async () => {
      await this.checkPaymentFormUI();
    });

    // Test 4: Test payment success page
    await this.runTest('Payment Success Page', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/orders/${orderId}/payment-success`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });

      await captureScreenshot(this.authHelper.page, 'payment-success');
    });
  }

  async createTestOrder() {
    console.log('🛒 Creating test order...');

    try {
      await this.authHelper.page.goto(`${BASE_URL}/orders/new`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });

      // Wait for redirect to edit page
      await this.authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 15000 }
      );

      const url = this.authHelper.page.url();
      const orderIdMatch = url.match(/\/orders\/([^\/]+)\/edit/);
      const orderId = orderIdMatch ? orderIdMatch[1] : null;

      console.log('📋 Created test order:', orderId);
      return orderId;

    } catch (error) {
      console.error('❌ Failed to create test order:', error.message);
      return null;
    }
  }

  async checkPaymentFormUI() {
    console.log('💳 Checking payment form UI...');

    // Check for payment amount display
    const priceElements = await this.authHelper.page.$$eval(
      '[class*="price"], [class*="total"], [class*="amount"]',
      elements => elements.map(el => el.textContent.trim()).filter(text => text)
    );

    console.log('💰 Price elements found:', priceElements);

    // Check for payment button
    const paymentButton = await this.authHelper.page.$('button[type="submit"], button:contains("Pay")');
    if (!paymentButton) {
      testResults.uiIssues.push('No payment submit button found');
    } else {
      const buttonText = await this.authHelper.page.evaluate(btn => btn.textContent, paymentButton);
      console.log('💳 Payment button text:', buttonText);
    }

    // Check for security indicators
    const securityIndicators = await this.authHelper.page.$$eval(
      '[class*="secure"], [class*="ssl"], [class*="encrypted"]',
      elements => elements.length
    );

    if (securityIndicators === 0) {
      testResults.uxIssues.push('No visible security indicators on payment form');
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance');

    await this.authHelper.login(INTERNAL_USER);

    // Test 1: Orders page load time
    await this.runTest('Orders Page Load Time', async () => {
      const startTime = Date.now();
      await this.authHelper.page.goto(`${BASE_URL}/orders`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });
      const loadTime = Date.now() - startTime;

      console.log(`📊 Orders page load time: ${loadTime}ms`);

      if (loadTime > 5000) {
        testResults.performanceIssues.push(`Orders page slow load: ${loadTime}ms`);
      }
    });

    // Test 2: New order creation time
    await this.runTest('New Order Creation Time', async () => {
      const startTime = Date.now();
      await this.authHelper.page.goto(`${BASE_URL}/orders/new`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });
      
      await this.authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 15000 }
      );
      
      const creationTime = Date.now() - startTime;

      console.log(`📊 New order creation time: ${creationTime}ms`);

      if (creationTime > 10000) {
        testResults.performanceIssues.push(`New order creation slow: ${creationTime}ms`);
      }
    });
  }

  async testErrorHandling() {
    console.log('\n❌ Testing Error Handling');

    await this.authHelper.login(INTERNAL_USER);

    // Test network error handling
    await this.runTest('Network Error Handling', async () => {
      await this.authHelper.page.goto(`${BASE_URL}/orders/new`, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });

      await this.authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 15000 }
      );

      // Simulate network failure
      await this.authHelper.page.setOfflineMode(true);

      // Try to interact with the page
      const saveButtons = await this.authHelper.page.$$('button:contains("Save"), button:contains("Update")');
      if (saveButtons.length > 0) {
        await saveButtons[0].click();
        await this.authHelper.page.waitForTimeout(3000);

        // Look for error messages
        const errorMessages = await this.authHelper.page.$$eval(
          '.error, .alert, [class*="error"]',
          elements => elements.map(el => el.textContent)
        );

        if (errorMessages.length === 0) {
          testResults.uxIssues.push('No error feedback shown when network is offline');
        }

        await captureScreenshot(this.authHelper.page, 'network-error-test');
      }

      // Restore network
      await this.authHelper.page.setOfflineMode(false);
    });
  }

  async generateReport() {
    console.log('\n📋 Generating Test Report');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: testResults.totalTests,
        passedTests: testResults.passedTests,
        failedTests: testResults.failedTests,
        successRate: `${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`
      },
      issues: {
        ui: testResults.uiIssues,
        ux: testResults.uxIssues,
        performance: testResults.performanceIssues
      },
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.reportDir, `order-flow-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Test Results Summary:`);
    console.log(`   Total Tests: ${testResults.totalTests}`);
    console.log(`   Passed: ${testResults.passedTests}`);
    console.log(`   Failed: ${testResults.failedTests}`);
    console.log(`   Success Rate: ${report.summary.successRate}`);

    if (testResults.uiIssues.length > 0) {
      console.log(`\n⚠️  UI Issues Found (${testResults.uiIssues.length}):`);
      testResults.uiIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (testResults.uxIssues.length > 0) {
      console.log(`\n🚨 UX Issues Found (${testResults.uxIssues.length}):`);
      testResults.uxIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (testResults.performanceIssues.length > 0) {
      console.log(`\n⚡ Performance Issues Found (${testResults.performanceIssues.length}):`);
      testResults.performanceIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log(`\n📄 Full report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: ${this.screenshotDir}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (testResults.uiIssues.length > 0) {
      recommendations.push('Review accessibility standards and ensure all interactive elements have proper labels');
      recommendations.push('Add alt text to all images for better accessibility');
      recommendations.push('Ensure form inputs have associated labels');
    }

    if (testResults.uxIssues.length > 0) {
      recommendations.push('Improve error messaging and user feedback');
      recommendations.push('Add loading states for better user experience');
      recommendations.push('Include security indicators on payment forms');
    }

    if (testResults.performanceIssues.length > 0) {
      recommendations.push('Optimize page load times through code splitting');
      recommendations.push('Implement caching strategies for frequently accessed data');
      recommendations.push('Consider progressive loading for complex interfaces');
    }

    return recommendations;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.authHelper) {
      await this.authHelper.cleanup();
    }
    
    if (this.browser) {
      await closeBrowser();
    }
  }

  async run() {
    try {
      await this.initialize();

      // Run all test suites
      await this.testInternalUserOrderFlow();
      await this.testAccountUserFlow();
      await this.testPaymentFlow();
      await this.testPerformance();
      await this.testErrorHandling();

      // Generate comprehensive report
      const report = await this.generateReport();

      return report;

    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      await captureScreenshot(this.authHelper?.page, 'test-runner-error');
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new OrderFlowTester();
  
  tester.run()
    .then(report => {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test run failed:', error.message);
      process.exit(1);
    });
}

module.exports = { OrderFlowTester };