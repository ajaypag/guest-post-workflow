const { chromium } = require('playwright');

async function testLoginOnly() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing publisher login...\n');
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  
  // Monitor network requests
  page.on('response', async response => {
    if (response.url().includes('/api/auth/publisher/login')) {
      console.log('Login API response:');
      console.log('  Status:', response.status());
      try {
        const body = await response.text();
        console.log('  Body:', body);
      } catch (e) {
        console.log('  Could not read body');
      }
    }
  });
  
  try {
    // Go to login page
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForTimeout(2000);
    
    // Fill form
    console.log('Filling login form...');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'before-login.png' });
    
    // Submit
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check where we are
    const currentUrl = page.url();
    console.log('\nAfter login:');
    console.log('  Current URL:', currentUrl);
    
    // Take screenshot after
    await page.screenshot({ path: 'after-login.png' });
    
    // Check for error messages
    const errorElement = await page.$('.text-red-700, .bg-red-50');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('  Error displayed:', errorText);
    }
    
    // Check if we're authenticated
    const authCheckResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/dashboard/stats');
      return { status: res.status, ok: res.ok };
    });
    
    console.log('\nAuth check:');
    console.log('  Dashboard API:', authCheckResponse.ok ? '✅ Authenticated' : `❌ Not authenticated (${authCheckResponse.status})`);
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await browser.close();
}

testLoginOnly().catch(console.error);