#!/usr/bin/env node
/**
 * Quick Authentication Test
 * Simple test to verify login works with real credentials
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3003';
const TEST_USERS = {
  internal: {
    email: 'ajay@outreachlabs.com',
    password: 'FA64!I$nrbCauS^d',
    type: 'internal'
  },
  account: {
    email: 'Abelino@factbites.com', 
    password: 'zKz2OQgCKN!4yZI4',
    type: 'account'
  }
};

async function testLogin(userType, user) {
  console.log(`\n🧪 Testing ${userType} user login: ${user.email}`);
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Take screenshot of login page
    await page.screenshot({ path: `login-page-${userType}.png` });
    console.log(`📸 Screenshot saved: login-page-${userType}.png`);
    
    // Fill in credentials
    console.log('✏️  Filling in credentials...');
    await page.type('input[name="email"]', user.email);
    await page.type('input[name="password"]', user.password);
    
    // Click login button
    console.log('🔘 Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check current URL to see where we ended up
    const currentUrl = page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);
    
    // Take screenshot of result page
    await page.screenshot({ path: `login-result-${userType}.png` });
    console.log(`📸 Screenshot saved: login-result-${userType}.png`);
    
    // Check if login was successful
    const isLoginPage = currentUrl.includes('/login');
    const hasErrorMessage = await page.$('.error, .alert-error, [role="alert"]').then(el => el !== null);
    
    if (isLoginPage && hasErrorMessage) {
      const errorText = await page.$eval('.error, .alert-error, [role="alert"]', el => el.textContent).catch(() => 'Unknown error');
      console.log(`❌ Login failed for ${userType} user: ${errorText}`);
      return false;
    } else if (!isLoginPage) {
      console.log(`✅ Login successful for ${userType} user! Redirected to: ${currentUrl}`);
      
      // Try to access expected dashboard
      if (userType === 'internal') {
        console.log('🏠 Testing internal dashboard access...');
        await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0' });
        await page.screenshot({ path: `admin-dashboard-${userType}.png` });
        console.log(`📸 Admin dashboard screenshot: admin-dashboard-${userType}.png`);
      } else if (userType === 'account') {
        console.log('🏠 Testing account dashboard access...');
        await page.goto(`${BASE_URL}/account/dashboard`, { waitUntil: 'networkidle0' });
        await page.screenshot({ path: `account-dashboard-${userType}.png` });
        console.log(`📸 Account dashboard screenshot: account-dashboard-${userType}.png`);
      }
      
      return true;
    } else {
      console.log(`⚠️  Unexpected state for ${userType} user - still on login page but no clear error`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error testing ${userType} user login:`, error.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function runQuickAuthTest() {
  console.log('🔐 Quick Authentication Test');
  console.log('==========================');
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log('');
  
  const results = {};
  
  // Test internal user
  results.internal = await testLogin('internal', TEST_USERS.internal);
  
  // Test account user  
  results.account = await testLogin('account', TEST_USERS.account);
  
  // Summary
  console.log('\n📊 QUICK TEST RESULTS');
  console.log('====================');
  console.log(`Internal user (${TEST_USERS.internal.email}): ${results.internal ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Account user (${TEST_USERS.account.email}): ${results.account ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n📈 Overall: ${successCount}/${totalCount} users can login successfully`);
  
  if (successCount === totalCount) {
    console.log('🎉 All authentication tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some authentication tests failed');
    process.exit(1);
  }
}

// Run the test
runQuickAuthTest().catch(error => {
  console.error('💥 Quick auth test failed:', error);
  process.exit(1);
});