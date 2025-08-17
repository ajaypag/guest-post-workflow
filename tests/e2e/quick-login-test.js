#!/usr/bin/env node

/**
 * Quick Login Test
 * Test to verify login credentials and page structure
 */

const { setupBrowser, closeBrowser, captureScreenshot } = require('./utils/browser-utils');
const puppeteer = require('puppeteer');

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

async function quickLoginTest() {
  console.log('🧪 Quick Login Test Starting...');
  
  let browser = null;
  let page = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Use visible browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test internal user login
    console.log('\n🔐 Testing internal user login...');
    await testLogin(page, INTERNAL_USER, '/login');

    // Test account user login
    console.log('\n👤 Testing account user login...');
    await testLogin(page, ACCOUNT_USER, '/account/login');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testLogin(page, user, loginPath) {
  try {
    console.log(`   Navigating to ${BASE_URL}${loginPath}`);
    
    // Navigate to login page
    await page.goto(`${BASE_URL}${loginPath}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('   ✅ Page loaded');

    // Check if login form exists
    const emailInput = await page.$('input[name="email"]');
    const passwordInput = await page.$('input[name="password"]');
    const submitButton = await page.$('button[type="submit"]');

    if (!emailInput || !passwordInput || !submitButton) {
      console.log('   ❌ Login form elements not found');
      console.log(`   Email input: ${!!emailInput}`);
      console.log(`   Password input: ${!!passwordInput}`);
      console.log(`   Submit button: ${!!submitButton}`);
      return;
    }

    console.log('   ✅ Login form found');

    // Fill in credentials
    await page.type('input[name="email"]', user.email);
    await page.type('input[name="password"]', user.password);

    console.log(`   ✅ Filled credentials for ${user.email}`);

    // Take screenshot before submit
    await page.screenshot({ 
      path: `./reports/screenshots/before-login-${user.type}.png`,
      fullPage: true 
    });

    // Submit form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    const currentUrl = page.url();
    console.log(`   📍 Redirected to: ${currentUrl}`);

    // Take screenshot after login
    await page.screenshot({ 
      path: `./reports/screenshots/after-login-${user.type}.png`,
      fullPage: true 
    });

    // Check for success indicators
    const isLoginPage = currentUrl.includes('/login');
    const cookies = await page.cookies();
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name.includes('auth') || 
      cookie.name.includes('session') ||
      cookie.name.includes('token')
    );

    console.log(`   Login page: ${isLoginPage}`);
    console.log(`   Auth cookie: ${hasAuthCookie}`);
    console.log(`   Cookies found: ${cookies.map(c => c.name).join(', ')}`);

    if (!isLoginPage && hasAuthCookie) {
      console.log('   ✅ Login appears successful');
    } else {
      console.log('   ❌ Login may have failed');
      
      // Check for error messages
      const errorElements = await page.$$('.error, .alert, [class*="error"]');
      if (errorElements.length > 0) {
        const errorTexts = await Promise.all(
          errorElements.map(el => page.evaluate(element => element.textContent, el))
        );
        console.log(`   Error messages: ${errorTexts.join(', ')}`);
      }
    }

  } catch (error) {
    console.log(`   ❌ Login test failed: ${error.message}`);
  }
}

// Run test
quickLoginTest();