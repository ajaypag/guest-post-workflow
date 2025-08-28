const { chromium } = require('playwright');

async function testEmailNotifications() {
  console.log('Starting manual test of email notifications...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Filling login credentials...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    
    console.log('3. Clicking submit...');
    await page.click('button[type="submit"]');
    
    console.log('4. Waiting for redirect to homepage...');
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
    
    console.log('5. Going to specific vetted sites request...');
    await page.goto('http://localhost:3003/internal/vetted-sites/requests/f5952bff-896f-4bf9-8111-18588cece63b');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what we have
    await page.screenshot({ path: 'vetted-sites-page.png' });
    console.log('6. Screenshot taken: vetted-sites-page.png');
    
    // Find status controls
    console.log('7. Looking for status controls...');
    const statusElements = await page.locator('select, [data-testid*="status"], button:has-text("approved"), button:has-text("fulfilled"), button:has-text("rejected")').all();
    console.log(`Found ${statusElements.length} potential status elements`);
    
    for (let i = 0; i < statusElements.length; i++) {
      const element = statusElements[i];
      const tagName = await element.evaluate(el => el.tagName);
      const textContent = await element.textContent();
      console.log(`Element ${i}: ${tagName} - "${textContent}"`);
    }
    
    // Look for current status
    const currentStatus = await page.locator('[class*="status"], [data-status]').first().textContent().catch(() => 'Not found');
    console.log('8. Current status:', currentStatus);
    
    // Try to find and click approval button/option
    console.log('9. Attempting to trigger approval...');
    
    // Listen for network requests to see if API call happens
    page.on('response', response => {
      if (response.url().includes('/api/vetted-sites/requests/')) {
        console.log('🔄 API Request:', response.method(), response.url(), 'Status:', response.status());
      }
    });
    
    // Try different approaches to change status
    const selectElement = await page.locator('select').first().count();
    if (selectElement > 0) {
      console.log('Found select dropdown, trying to change to approved...');
      await page.locator('select').first().selectOption('approved');
      
      // Look for update button
      const updateButton = await page.locator('button:has-text("Update"), button:has-text("Save"), button[type="submit"]').first();
      if (await updateButton.count() > 0) {
        console.log('Clicking update button...');
        await updateButton.click();
        
        // Wait a bit for the request
        await page.waitForTimeout(3000);
      }
    }
    
    console.log('Test completed - check backend logs for email sending');
    
  } catch (error) {
    console.error('Error during test:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

testEmailNotifications();