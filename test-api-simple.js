const { chromium } = require('playwright');

async function testAPI() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable request/response logging
  page.on('response', async response => {
    if (response.url().includes('/api/publisher/websites')) {
      console.log('API Response URL:', response.url());
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Response Body:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }
  });
  
  // Login
  await page.goto('http://localhost:3001/publisher/login');
  await page.fill('input[type="email"]', 'testpublisher@example.com');
  await page.fill('input[type="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  // Navigate to websites page which will trigger the API call
  console.log('Navigating to websites page to trigger API call...\n');
  await page.goto('http://localhost:3001/publisher/websites');
  await page.waitForTimeout(3000);
  
  await browser.close();
}

testAPI().catch(console.error);
