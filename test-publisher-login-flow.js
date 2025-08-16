const { chromium } = require('playwright');

async function testPublisherLogin() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔍 Testing Publisher Login Flow\n');
  console.log('==============================\n');
  
  try {
    // Test 1: Navigate to publisher login page
    console.log('1. Navigating to /publisher/login...');
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForLoadState('networkidle');
    
    const loginUrl = page.url();
    console.log(`   Current URL: ${loginUrl}`);
    
    if (!loginUrl.includes('/publisher/login')) {
      console.log(`   ❌ ERROR: Redirected to wrong page: ${loginUrl}`);
      console.log(`   Expected: /publisher/login`);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'publisher-login-redirect-error.png' });
      console.log('   Screenshot saved: publisher-login-redirect-error.png');
    } else {
      console.log('   ✅ Correctly on publisher login page\n');
    }
    
    // Test 2: Check if login form exists
    console.log('2. Checking for login form elements...');
    const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').count();
    const submitButton = await page.locator('button[type="submit"]').count();
    
    console.log(`   Email input found: ${emailInput > 0 ? '✅' : '❌'}`);
    console.log(`   Password input found: ${passwordInput > 0 ? '✅' : '❌'}`);
    console.log(`   Submit button found: ${submitButton > 0 ? '✅' : '❌'}\n`);
    
    if (emailInput === 0 || passwordInput === 0) {
      console.log('   ❌ Login form not found!');
      await page.screenshot({ path: 'publisher-login-form-missing.png' });
      console.log('   Screenshot saved: publisher-login-form-missing.png');
      return;
    }
    
    // Test 3: Try to login
    console.log('3. Attempting to login with test credentials...');
    console.log('   Email: testpublisher@example.com');
    console.log('   Password: TestPass123!');
    
    await page.fill('input[type="email"], input[name="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'TestPass123!');
    
    // Click submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    
    // Wait a bit for any client-side redirects
    await page.waitForTimeout(3000);
    
    const afterLoginUrl = page.url();
    console.log(`   After login URL: ${afterLoginUrl}\n`);
    
    // Test 4: Check where we ended up
    console.log('4. Checking post-login redirect...');
    if (afterLoginUrl.includes('/publisher')) {
      console.log('   ✅ Successfully redirected to publisher area');
      
      // Check for any auth cookies
      const cookies = await context.cookies();
      const publisherCookie = cookies.find(c => c.name === 'auth-token-publisher');
      console.log(`   Publisher auth cookie: ${publisherCookie ? '✅ Set' : '❌ Missing'}`);
      
    } else if (afterLoginUrl.includes('/login')) {
      console.log('   ❌ ERROR: Redirected to /login instead of publisher area!');
      console.log('   This indicates the publisher login is not working correctly.');
      
      // Check for error messages
      const errorText = await page.locator('.error, .alert, [role="alert"]').textContent().catch(() => null);
      if (errorText) {
        console.log(`   Error message: ${errorText}`);
      }
      
      await page.screenshot({ path: 'publisher-login-failed.png' });
      console.log('   Screenshot saved: publisher-login-failed.png');
      
    } else {
      console.log(`   ⚠️  Unexpected redirect to: ${afterLoginUrl}`);
      await page.screenshot({ path: 'publisher-login-unexpected.png' });
      console.log('   Screenshot saved: publisher-login-unexpected.png');
    }
    
    // Test 5: Try accessing protected publisher page
    console.log('\n5. Testing access to protected publisher page...');
    await page.goto('http://localhost:3001/publisher/orders');
    await page.waitForLoadState('networkidle');
    
    const ordersUrl = page.url();
    console.log(`   Current URL: ${ordersUrl}`);
    
    if (ordersUrl.includes('/publisher/orders')) {
      console.log('   ✅ Successfully accessed publisher orders page');
    } else {
      console.log(`   ❌ Could not access publisher orders, redirected to: ${ordersUrl}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'publisher-login-error.png' });
    console.log('Screenshot saved: publisher-login-error.png');
  } finally {
    await browser.close();
    console.log('\n==============================');
    console.log('Test completed');
  }
}

// Run the test
testPublisherLogin().catch(console.error);