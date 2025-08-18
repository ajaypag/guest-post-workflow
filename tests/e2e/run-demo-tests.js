#!/usr/bin/env node

/**
 * Demo Order Flow Testing Script
 * 
 * Comprehensive demonstration of frontend testing for order creation and payment flow
 */

const { setupBrowser, closeBrowser, captureScreenshot } = require('./utils/browser-utils');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';

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

class OrderFlowDemo {
  constructor() {
    this.browser = null;
    this.reportDir = path.join(__dirname, 'reports');
    this.screenshotDir = path.join(this.reportDir, 'screenshots');
    this.results = {
      tests: [],
      uiIssues: [],
      uxIssues: [],
      performance: {},
      screenshots: []
    };
    
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
    console.log('🚀 Starting Order Flow Demo Tests...');
    
    this.browser = await puppeteer.launch({
      headless: process.argv.includes('--headless'),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });

    console.log('✅ Browser initialized');
  }

  async takeScreenshot(page, name, description = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${name}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await page.screenshot({ 
      path: filepath,
      fullPage: true 
    });

    this.results.screenshots.push({
      name,
      filename,
      description,
      timestamp: new Date().toISOString()
    });

    console.log(`📸 Screenshot: ${name}`);
    return filepath;
  }

  async testUserLogin(userType, user, loginPath) {
    console.log(`\n🔐 Testing ${userType} User Login`);
    console.log('=' .repeat(50));

    const page = await this.browser.newPage();
    
    try {
      const startTime = Date.now();
      
      // Navigate to login page
      await page.goto(`${BASE_URL}${loginPath}`, { waitUntil: 'networkidle2' });
      await this.takeScreenshot(page, `${userType}-login-page`, 'Login page loaded');

      // Fill credentials
      await page.type('input[name="email"]', user.email);
      await page.type('input[name="password"]', user.password);
      await this.takeScreenshot(page, `${userType}-credentials-filled`, 'Credentials entered');

      // Submit form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
      ]);

      const loginTime = Date.now() - startTime;
      const currentUrl = page.url();

      await this.takeScreenshot(page, `${userType}-post-login`, 'After login redirect');

      // Analyze login result
      const isLoginPage = currentUrl.includes('/login');
      const cookies = await page.cookies();
      const hasAuthCookie = cookies.some(c => c.name.includes('auth') || c.name.includes('session'));

      const loginSuccess = !isLoginPage && hasAuthCookie;

      this.results.tests.push({
        name: `${userType} User Login`,
        success: loginSuccess,
        duration: loginTime,
        details: {
          redirectUrl: currentUrl,
          hasAuthCookie,
          loginTime
        }
      });

      console.log(`   📍 Redirected to: ${currentUrl}`);
      console.log(`   🔑 Has auth cookie: ${hasAuthCookie}`);
      console.log(`   ⏱️  Login time: ${loginTime}ms`);
      console.log(`   ${loginSuccess ? '✅' : '❌'} Login ${loginSuccess ? 'successful' : 'failed'}`);

      if (loginSuccess) {
        return { page, success: true };
      } else {
        // Check for error messages
        const errorElements = await page.$$('.error, .alert, [class*="error"]');
        if (errorElements.length > 0) {
          const errorTexts = await Promise.all(
            errorElements.map(el => page.evaluate(element => element.textContent, el))
          );
          console.log(`   🚨 Errors: ${errorTexts.join(', ')}`);
          this.results.uxIssues.push(`${userType} login error: ${errorTexts.join(', ')}`);
        }
        
        await page.close();
        return { page: null, success: false };
      }

    } catch (error) {
      console.log(`   ❌ Login failed: ${error.message}`);
      this.results.tests.push({
        name: `${userType} User Login`,
        success: false,
        error: error.message
      });
      
      await page.close();
      return { page: null, success: false };
    }
  }

  async testOrderCreationFlow(page, userType) {
    console.log(`\n📋 Testing ${userType} Order Creation Flow`);
    console.log('=' .repeat(50));

    try {
      // Test orders page access
      console.log('   📍 Navigating to orders page...');
      await page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle2' });
      await this.takeScreenshot(page, `${userType}-orders-page`, 'Orders listing page');

      const ordersUrl = page.url();
      if (ordersUrl.includes('/login') || ordersUrl.includes('/403')) {
        console.log('   ⚠️  Access denied to orders page');
        this.results.uxIssues.push(`${userType} user denied access to orders page`);
        return null;
      }

      // Test new order creation
      console.log('   🆕 Creating new order...');
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });
      await this.takeScreenshot(page, `${userType}-new-order-loading`, 'New order creation started');

      // Wait for redirect to edit page
      await page.waitForFunction(
        () => window.location.pathname.includes('/orders/') && window.location.pathname.includes('/edit'),
        { timeout: 15000 }
      );

      const creationTime = Date.now() - startTime;
      const editUrl = page.url();
      const orderIdMatch = editUrl.match(/\/orders\/([^\/]+)\/edit/);
      const orderId = orderIdMatch ? orderIdMatch[1] : null;

      await this.takeScreenshot(page, `${userType}-order-edit-page`, 'Order edit page loaded');

      console.log(`   📋 Order created: ${orderId}`);
      console.log(`   ⏱️  Creation time: ${creationTime}ms`);

      this.results.performance[`${userType}_order_creation`] = creationTime;

      if (creationTime > 10000) {
        this.results.uxIssues.push(`Slow order creation for ${userType}: ${creationTime}ms`);
      }

      // Test order edit page UI
      await this.testOrderEditPageUI(page, userType);

      return orderId;

    } catch (error) {
      console.log(`   ❌ Order creation failed: ${error.message}`);
      this.results.tests.push({
        name: `${userType} Order Creation`,
        success: false,
        error: error.message
      });
      return null;
    }
  }

  async testOrderEditPageUI(page, userType) {
    console.log('   🎨 Testing order edit page UI...');

    // Check for critical UI elements
    const criticalElements = [
      { selector: 'h1, h2', description: 'Page title' },
      { selector: 'button', description: 'Action buttons' },
      { selector: 'input, select, textarea', description: 'Form inputs' },
      { selector: '[class*="total"], [class*="price"], [class*="cost"]', description: 'Pricing display' }
    ];

    for (const element of criticalElements) {
      const exists = await page.$(element.selector) !== null;
      if (!exists) {
        console.log(`   ⚠️  Missing: ${element.description}`);
        this.results.uiIssues.push(`Missing ${element.description} on ${userType} order edit page`);
      } else {
        console.log(`   ✅ Found: ${element.description}`);
      }
    }

    // Test responsive design
    await this.testResponsiveDesign(page, userType);

    // Check for accessibility issues
    await this.checkAccessibility(page, userType);
  }

  async testResponsiveDesign(page, userType) {
    console.log('   📱 Testing responsive design...');

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 812, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.waitForTimeout(1000);

      // Check for horizontal scrollbars
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll && viewport.width < 1280) {
        console.log(`   ⚠️  Horizontal scroll on ${viewport.name}`);
        this.results.uiIssues.push(`Horizontal scroll on ${viewport.name} for ${userType}`);
      }

      await this.takeScreenshot(page, `${userType}-responsive-${viewport.name}`, `${viewport.name} viewport`);
    }

    // Reset to default viewport
    await page.setViewport({ width: 1280, height: 720 });
  }

  async checkAccessibility(page, userType) {
    console.log('   ♿ Checking accessibility...');

    // Check for images without alt text
    const imagesWithoutAlt = await page.$$eval(
      'img:not([alt])',
      imgs => imgs.length
    );
    if (imagesWithoutAlt > 0) {
      console.log(`   ⚠️  ${imagesWithoutAlt} images missing alt text`);
      this.results.uiIssues.push(`${imagesWithoutAlt} images missing alt text on ${userType} page`);
    }

    // Check for buttons without accessible names
    const unlabeledButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(btn => {
        return !btn.getAttribute('aria-label') && 
               !btn.textContent.trim() && 
               !btn.querySelector('svg') &&
               !btn.getAttribute('aria-labelledby');
      }).length;
    });

    if (unlabeledButtons > 0) {
      console.log(`   ⚠️  ${unlabeledButtons} buttons without accessible names`);
      this.results.uiIssues.push(`${unlabeledButtons} buttons without accessible names on ${userType} page`);
    }
  }

  async testPaymentFlow(page, orderId, userType) {
    if (!orderId) {
      console.log('\n💳 Skipping payment tests - no order created');
      return;
    }

    console.log('\n💳 Testing Payment Flow');
    console.log('=' .repeat(50));

    try {
      // Navigate to payment page
      console.log('   📍 Navigating to payment page...');
      await page.goto(`${BASE_URL}/orders/${orderId}/payment`, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });

      await this.takeScreenshot(page, `${userType}-payment-page`, 'Payment page loaded');

      // Check if payment form loads
      try {
        console.log('   🔒 Waiting for Stripe form...');
        await page.waitForSelector(
          'iframe[name*="stripe"], .StripeElement, [data-testid="payment-element"]',
          { timeout: 15000 }
        );

        const stripeElements = await page.$$('iframe[name*="stripe"]');
        console.log(`   ✅ Found ${stripeElements.length} Stripe elements`);

        await this.takeScreenshot(page, `${userType}-stripe-loaded`, 'Stripe payment form loaded');

        // Test payment form UI
        await this.testPaymentFormUI(page, userType);

        this.results.tests.push({
          name: `${userType} Payment Form Loading`,
          success: true,
          details: { stripeElementsCount: stripeElements.length }
        });

      } catch (error) {
        console.log(`   ❌ Stripe form failed to load: ${error.message}`);
        await this.takeScreenshot(page, `${userType}-stripe-error`, 'Stripe form loading error');

        // Check for error messages
        const errorMessages = await page.$$eval(
          '.error, .alert, [class*="error"]',
          elements => elements.map(el => el.textContent)
        );

        if (errorMessages.length > 0) {
          console.log(`   🚨 Error messages: ${errorMessages.join(', ')}`);
          this.results.uxIssues.push(`Payment form errors for ${userType}: ${errorMessages.join(', ')}`);
        }

        this.results.tests.push({
          name: `${userType} Payment Form Loading`,
          success: false,
          error: error.message
        });
      }

      // Test payment success page (mock)
      console.log('   ✅ Testing payment success page...');
      await page.goto(`${BASE_URL}/orders/${orderId}/payment-success`, { 
        waitUntil: 'networkidle2' 
      });

      await this.takeScreenshot(page, `${userType}-payment-success`, 'Payment success page');

    } catch (error) {
      console.log(`   ❌ Payment flow error: ${error.message}`);
      this.results.tests.push({
        name: `${userType} Payment Flow`,
        success: false,
        error: error.message
      });
    }
  }

  async testPaymentFormUI(page, userType) {
    console.log('   💳 Testing payment form UI...');

    // Check for payment amount display
    const priceElements = await page.$$eval(
      '[class*="price"], [class*="total"], [class*="amount"]',
      elements => elements.map(el => el.textContent.trim()).filter(text => text)
    );

    console.log(`   💰 Price elements: ${priceElements.join(', ')}`);

    // Check for payment button
    const paymentButton = await page.$('button[type="submit"], button:contains("Pay")');
    if (!paymentButton) {
      console.log('   ⚠️  No payment submit button found');
      this.results.uiIssues.push(`No payment submit button on ${userType} payment page`);
    } else {
      const buttonText = await page.evaluate(btn => btn.textContent, paymentButton);
      console.log(`   💳 Payment button: "${buttonText}"`);
    }

    // Check for security indicators
    const securityIndicators = await page.$$eval(
      '[class*="secure"], [class*="ssl"], [class*="encrypted"], :contains("Powered by Stripe")',
      elements => elements.length
    );

    if (securityIndicators === 0) {
      console.log('   ⚠️  No security indicators found');
      this.results.uxIssues.push(`No security indicators on ${userType} payment form`);
    } else {
      console.log(`   🔒 Found ${securityIndicators} security indicators`);
    }
  }

  async generateReport() {
    console.log('\n📋 Generating Test Report');
    console.log('=' .repeat(50));

    const totalTests = this.results.tests.length;
    const passedTests = this.results.tests.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? `${((passedTests / totalTests) * 100).toFixed(1)}%` : '0%'
      },
      tests: this.results.tests,
      issues: {
        ui: this.results.uiIssues,
        ux: this.results.uxIssues
      },
      performance: this.results.performance,
      screenshots: this.results.screenshots,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.reportDir, `order-flow-demo-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Console summary
    console.log(`📊 Test Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${report.summary.successRate}`);

    if (this.results.uiIssues.length > 0) {
      console.log(`\n⚠️  UI Issues (${this.results.uiIssues.length}):`);
      this.results.uiIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (this.results.uxIssues.length > 0) {
      console.log(`\n🚨 UX Issues (${this.results.uxIssues.length}):`);
      this.results.uxIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log(`\n📄 Full report: ${reportPath}`);
    console.log(`📸 Screenshots: ${this.screenshotDir}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.results.uiIssues.length > 0) {
      recommendations.push('Improve accessibility by adding alt text to images and labels to form elements');
      recommendations.push('Ensure responsive design works across all viewport sizes');
    }

    if (this.results.uxIssues.length > 0) {
      recommendations.push('Enhance error messaging and user feedback');
      recommendations.push('Add security indicators to payment forms');
      recommendations.push('Optimize page load times for better user experience');
    }

    const slowOperations = Object.entries(this.results.performance)
      .filter(([_, time]) => time > 5000);

    if (slowOperations.length > 0) {
      recommendations.push('Optimize slow operations: ' + slowOperations.map(([op, time]) => `${op} (${time}ms)`).join(', '));
    }

    return recommendations;
  }

  async run() {
    try {
      await this.initialize();

      // Test Internal User Flow
      console.log('\n🏢 INTERNAL USER TESTING');
      console.log('=' .repeat(60));
      
      const internalResult = await this.testUserLogin('Internal', INTERNAL_USER, '/login');
      if (internalResult.success) {
        const orderId = await this.testOrderCreationFlow(internalResult.page, 'Internal');
        await this.testPaymentFlow(internalResult.page, orderId, 'Internal');
        await internalResult.page.close();
      }

      // Test Account User Flow
      console.log('\n👤 ACCOUNT USER TESTING');
      console.log('=' .repeat(60));
      
      const accountResult = await this.testUserLogin('Account', ACCOUNT_USER, '/account/login');
      if (accountResult.success) {
        const orderId = await this.testOrderCreationFlow(accountResult.page, 'Account');
        await this.testPaymentFlow(accountResult.page, orderId, 'Account');
        await accountResult.page.close();
      } else {
        // Test what account user can see without login
        console.log('\n📋 Testing account user order access without login...');
        const accountPage = await this.browser.newPage();
        await accountPage.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle2' });
        await this.takeScreenshot(accountPage, 'account-orders-no-auth', 'Account user trying to access orders');
        await accountPage.close();
      }

      // Generate final report
      const report = await this.generateReport();

      return report;

    } catch (error) {
      console.error('\n❌ Demo test run failed:', error.message);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new OrderFlowDemo();
  
  demo.run()
    .then(report => {
      console.log('\n✅ Demo tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Demo tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = { OrderFlowDemo };