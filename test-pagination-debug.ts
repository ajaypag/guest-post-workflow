import { chromium } from 'playwright';

async function testPagination() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('Browser console:', msg.text());
    }
  });
  
  try {
    // Navigate to login page
    console.log('Going to login page...');
    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    
    // Fill in login form
    console.log('Logging in...');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Navigate to vetted sites
    console.log('Going to vetted sites...');
    await page.goto('http://localhost:3004/vetted-sites', { waitUntil: 'networkidle' });
    
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });
    console.log('Table loaded');
    
    // Check if pagination buttons exist
    const paginationButtons = await page.locator('.flex.items-center.space-x-1 button').count();
    console.log('Pagination buttons found:', paginationButtons);
    
    // Try to click page 2 using different selectors
    console.log('\nTrying to click page 2...');
    
    // Method 1: Click by exact text
    const page2Button = page.locator('button', { hasText: '2' }).first();
    if (await page2Button.isVisible()) {
      console.log('Found page 2 button, clicking...');
      await page2Button.click();
      await page.waitForTimeout(3000);
      
      const url = page.url();
      console.log('URL after click:', url);
    } else {
      console.log('Page 2 button not visible');
      
      // Check what buttons are visible
      const visibleButtons = await page.locator('button:visible').allTextContents();
      console.log('Visible buttons:', visibleButtons);
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testPagination();