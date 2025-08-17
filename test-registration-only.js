const { chromium } = require('playwright');

async function testRegistrationOnly() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  try {
    console.log('🔧 TESTING PUBLISHER REGISTRATION ONLY...\n');
    
    // Navigate to signup page
    await page.goto('http://localhost:3001/publisher/signup');
    await page.waitForTimeout(2000);
    
    console.log('✅ Signup page loaded');
    
    // Generate unique test email
    const testEmail = `test.publisher.${Date.now()}@example.com`;
    console.log(`Attempting to register: ${testEmail}`);
    
    // Fill form fields
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="contactName"]', 'Test Publisher');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    
    console.log('✅ All form fields filled');
    
    // Listen to network requests to see what's being sent
    page.on('request', request => {
      if (request.url().includes('/api/auth/publisher/register')) {
        console.log('📤 Registration request:', {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/auth/publisher/register')) {
        console.log('📥 Registration response:', {
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`Final URL: ${currentUrl}`);
    
    // Check for any error messages on page
    const errorMessages = await page.locator('.text-red-700, .text-red-600, [class*="error"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:', errorMessages);
    } else {
      console.log('✅ No error messages visible');
    }
    
    if (currentUrl.includes('verify-pending')) {
      console.log('✅ Registration successful! Redirected to verification page');
    } else if (currentUrl === 'http://localhost:3001/publisher/signup') {
      console.log('❌ Registration failed - stayed on signup page');
    } else {
      console.log(`🤔 Unexpected redirect to: ${currentUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testRegistrationOnly();