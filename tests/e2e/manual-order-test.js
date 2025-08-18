#!/usr/bin/env node

/**
 * Manual Order System Testing Script
 * Focuses on actual functionality testing with proper login flows
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:3002',
  timeout: 30000,
  screenshotPath: path.join(__dirname, 'reports', 'screenshots'),
  users: {
    internal: {
      email: 'ajay@outreachlabs.com',
      password: 'FA64!I$nrbCauS^d',
      loginUrl: '/login',  // Internal users use main login
      expectedDashboard: '/admin'
    },
    account: {
      email: 'jake@thehrguy.co',
      password: 'EPoOh&K2sVpAytl&',
      loginUrl: '/account/login',  // Account users use account login
      expectedDashboard: '/account/dashboard'
    }
  }
};

class ManualOrderTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Starting Manual Order System Testing...\n');
    
    // Create screenshot directory
    if (!fs.existsSync(CONFIG.screenshotPath)) {
      fs.mkdirSync(CONFIG.screenshotPath, { recursive: true });
    }

    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      defaultViewport: { width: 1280, height: 720 }
    });

    this.page = await this.browser.newPage();
    await this.page.setDefaultTimeout(CONFIG.timeout);
    
    console.log('✅ Browser initialized');
  }

  async screenshot(name) {
    const filepath = path.join(CONFIG.screenshotPath, `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot: ${name}`);
    return filepath;
  }

  async log(action, success, details = '') {
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${action}${details ? ' - ' + details : ''}`);
    this.results.push({ action, success, details, timestamp: new Date().toISOString() });
  }

  async waitAndClick(selector, description) {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.click(selector);
      await this.page.waitForTimeout(1000);
      await this.log(`Click ${description}`, true);
      return true;
    } catch (error) {
      await this.log(`Click ${description}`, false, error.message);
      return false;
    }
  }

  async waitAndType(selector, text, description) {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.click(selector);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.type(selector, text);
      await this.log(`Type ${description}`, true);
      return true;
    } catch (error) {
      await this.log(`Type ${description}`, false, error.message);
      return false;
    }
  }

  async testInternalLogin() {
    console.log('\n🔐 Testing Internal User Login...');
    
    try {
      // Navigate to internal login
      await this.page.goto(`${CONFIG.baseUrl}${CONFIG.users.internal.loginUrl}`);
      await this.screenshot('internal-login-page');
      
      // Fill credentials
      await this.waitAndType('input[name="email"], input[type="email"]', CONFIG.users.internal.email, 'internal email');
      await this.waitAndType('input[name="password"], input[type="password"]', CONFIG.users.internal.password, 'internal password');
      
      // Submit form
      await this.waitAndClick('button[type="submit"], input[type="submit"]', 'login submit');
      
      // Wait for navigation
      await this.page.waitForTimeout(5000);
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      
      const currentUrl = this.page.url();
      await this.screenshot('internal-login-result');
      
      const loginSuccess = currentUrl.includes('/admin') || currentUrl.includes('/dashboard') || !currentUrl.includes('/login');
      await this.log('Internal user login', loginSuccess, `Redirected to: ${currentUrl}`);
      
      return loginSuccess;
    } catch (error) {
      await this.log('Internal user login', false, error.message);
      await this.screenshot('internal-login-error');
      return false;
    }
  }

  async testAccountLogin() {
    console.log('\n🔐 Testing Account User Login...');
    
    try {
      // Logout first
      await this.page.goto(`${CONFIG.baseUrl}/api/auth/logout`);
      await this.page.waitForTimeout(2000);
      
      // Navigate to account login
      await this.page.goto(`${CONFIG.baseUrl}${CONFIG.users.account.loginUrl}`);
      await this.screenshot('account-login-page');
      
      // Fill credentials
      await this.waitAndType('input[name="email"], input[type="email"]', CONFIG.users.account.email, 'account email');
      await this.waitAndType('input[name="password"], input[type="password"]', CONFIG.users.account.password, 'account password');
      
      // Submit form
      await this.waitAndClick('button[type="submit"], input[type="submit"]', 'account login submit');
      
      // Wait for navigation
      await this.page.waitForTimeout(5000);
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      
      const currentUrl = this.page.url();
      await this.screenshot('account-login-result');
      
      const loginSuccess = currentUrl.includes('/account') || !currentUrl.includes('/login');
      await this.log('Account user login', loginSuccess, `Redirected to: ${currentUrl}`);
      
      return loginSuccess;
    } catch (error) {
      await this.log('Account user login', false, error.message);
      await this.screenshot('account-login-error');
      return false;
    }
  }

  async testOrderCreation() {
    console.log('\n📝 Testing Order Creation Flow...');
    
    try {
      // Ensure logged in as internal user
      await this.testInternalLogin();
      
      // Navigate to orders page
      await this.page.goto(`${CONFIG.baseUrl}/orders`);
      await this.page.waitForTimeout(3000);
      await this.screenshot('orders-list');
      
      const ordersPageLoaded = await this.page.waitForSelector('h1, h2, .orders, table', { timeout: 10000 }).then(() => true).catch(() => false);
      await this.log('Access orders page', ordersPageLoaded);
      
      // Try to create new order
      await this.page.goto(`${CONFIG.baseUrl}/orders/new`);
      await this.page.waitForTimeout(5000);
      await this.screenshot('order-creation');
      
      const currentUrl = this.page.url();
      const orderCreationWorks = currentUrl.includes('/orders/') && (currentUrl.includes('/edit') || currentUrl.includes('/new'));
      await this.log('Order creation flow', orderCreationWorks, `Current URL: ${currentUrl}`);
      
      return orderCreationWorks;
    } catch (error) {
      await this.log('Order creation flow', false, error.message);
      await this.screenshot('order-creation-error');
      return false;
    }
  }

  async testOrderEditInterface() {
    console.log('\n✏️ Testing Order Edit Interface...');
    
    try {
      // Should be on order edit page from previous test
      const hasFormElements = await this.page.evaluate(() => {
        const forms = document.querySelectorAll('form, input, select, textarea, button');
        return forms.length > 0;
      });
      
      await this.screenshot('order-edit-interface');
      await this.log('Order edit interface has form elements', hasFormElements);
      
      // Look for specific order elements
      const orderElements = await this.page.evaluate(() => {
        const elements = {
          hasAddItemButton: !!document.querySelector('[data-testid*="add"], button:contains("Add"), .add-item, button[class*="add"]'),
          hasTable: !!document.querySelector('table, .table, .line-items'),
          hasSaveButton: !!document.querySelector('button[type="submit"], .save, .submit'),
          hasOrderInfo: !!document.querySelector('.order-info, .order-details, .order-summary')
        };
        return elements;
      });
      
      await this.log('Order interface elements', Object.values(orderElements).some(v => v), JSON.stringify(orderElements));
      
      return hasFormElements;
    } catch (error) {
      await this.log('Order edit interface', false, error.message);
      return false;
    }
  }

  async testAccountUserAccess() {
    console.log('\n🔒 Testing Account User Access...');
    
    try {
      // Login as account user
      const accountLoginSuccess = await this.testAccountLogin();
      if (!accountLoginSuccess) {
        await this.log('Account user access test', false, 'Could not login as account user');
        return false;
      }
      
      // Test access to account dashboard
      await this.page.goto(`${CONFIG.baseUrl}/account/dashboard`);
      await this.page.waitForTimeout(3000);
      await this.screenshot('account-dashboard');
      
      const dashboardAccess = !this.page.url().includes('/login');
      await this.log('Account dashboard access', dashboardAccess);
      
      // Test access to account orders
      await this.page.goto(`${CONFIG.baseUrl}/account/orders`);
      await this.page.waitForTimeout(3000);
      await this.screenshot('account-orders');
      
      const ordersAccess = !this.page.url().includes('/login');
      await this.log('Account orders access', ordersAccess);
      
      return dashboardAccess && ordersAccess;
    } catch (error) {
      await this.log('Account user access', false, error.message);
      return false;
    }
  }

  async testPermissionBoundaries() {
    console.log('\n🚨 Testing Permission Boundaries...');
    
    try {
      // Should be logged in as account user
      const restrictedPaths = ['/admin', '/clients', '/workflows'];
      let blockedCount = 0;
      
      for (const path of restrictedPaths) {
        await this.page.goto(`${CONFIG.baseUrl}${path}`);
        await this.page.waitForTimeout(3000);
        
        const currentUrl = this.page.url();
        const wasBlocked = currentUrl.includes('/login') || currentUrl.includes('/account') || currentUrl.includes('/unauthorized');
        
        if (wasBlocked) blockedCount++;
        await this.log(`Access to ${path} blocked`, wasBlocked, `Redirected to: ${currentUrl}`);
        await this.screenshot(`permission-test-${path.replace('/', '')}`);
      }
      
      const allBlocked = blockedCount === restrictedPaths.length;
      await this.log('Permission boundaries enforced', allBlocked, `${blockedCount}/${restrictedPaths.length} routes blocked`);
      
      return allBlocked;
    } catch (error) {
      await this.log('Permission boundaries test', false, error.message);
      return false;
    }
  }

  async testApiEndpoints() {
    console.log('\n🔌 Testing API Endpoints...');
    
    try {
      // Test unauthenticated API access
      await this.page.goto(`${CONFIG.baseUrl}/api/auth/logout`);
      await this.page.waitForTimeout(1000);
      
      const response = await this.page.goto(`${CONFIG.baseUrl}/api/orders`);
      const status = response.status();
      
      await this.log('API authentication required', status === 401 || status === 403, `Status: ${status}`);
      
      // Login and test authenticated access
      await this.testInternalLogin();
      const authResponse = await this.page.goto(`${CONFIG.baseUrl}/api/orders`);
      const authStatus = authResponse.status();
      
      await this.log('Authenticated API access', authStatus === 200, `Status: ${authStatus}`);
      
      return status !== 200 && authStatus === 200; // Should deny unauth, allow auth
    } catch (error) {
      await this.log('API endpoints test', false, error.message);
      return false;
    }
  }

  async runCompleteTest() {
    await this.init();
    
    console.log('🧪 Running Complete Order System Test Suite...\n');
    
    // Run all tests
    const tests = [
      () => this.testInternalLogin(),
      () => this.testAccountLogin(),
      () => this.testOrderCreation(),
      () => this.testOrderEditInterface(),
      () => this.testAccountUserAccess(),
      () => this.testPermissionBoundaries(),
      () => this.testApiEndpoints()
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (const test of tests) {
      try {
        const result = await test();
        if (result) passed++;
      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
      }
    }
    
    // Generate summary
    console.log('\n============================================================');
    console.log('📊 COMPREHENSIVE ORDER SYSTEM TEST RESULTS');
    console.log('============================================================');
    console.log(`✅ Passed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${total-passed}/${total}`);
    console.log('============================================================\n');
    
    // Detailed results
    console.log('📋 Detailed Test Results:');
    this.results.forEach((result, index) => {
      const emoji = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${emoji} ${result.action}${result.details ? ' - ' + result.details : ''}`);
    });
    
    console.log('\n📸 Screenshots saved to:', CONFIG.screenshotPath);
    
    await this.cleanup();
    return { passed, total, results: this.results };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('\n🧹 Browser closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new ManualOrderTester();
  tester.runCompleteTest().catch(console.error);
}

module.exports = ManualOrderTester;