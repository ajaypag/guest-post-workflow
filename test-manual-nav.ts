import { chromium } from 'playwright';

async function testManualNavigation() {
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
    await page.goto('http://localhost:3004/login');
    
    // Fill in login form
    console.log('Logging in...');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    console.log('Waiting for redirect...');
    await page.waitForTimeout(5000);
    
    console.log('Current URL:', page.url());
    
    // Check what's on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Look for navigation links
    const vettedSitesLink = page.locator('a[href="/vetted-sites"]').first();
    if (await vettedSitesLink.isVisible()) {
      console.log('Found vetted sites link, clicking...');
      await vettedSitesLink.click();
      await page.waitForTimeout(3000);
      console.log('New URL:', page.url());
    } else {
      console.log('Vetted sites link not found, navigating directly...');
      await page.goto('http://localhost:3004/vetted-sites');
      await page.waitForTimeout(3000);
      console.log('Direct navigation URL:', page.url());
    }
    
    // Check if we're on vetted sites page
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    console.log('Table visible:', hasTable);
    
    if (hasTable) {
      // Count rows
      const rowCount = await page.locator('tbody tr').count();
      console.log('Number of rows:', rowCount);
      
      // Check pagination
      const paginationContainer = page.locator('div.flex.items-center.space-x-1').first();
      if (await paginationContainer.isVisible()) {
        const buttons = await paginationContainer.locator('button').allTextContents();
        console.log('Pagination buttons:', buttons);
        
        // Try clicking page 2
        const page2Btn = paginationContainer.locator('button:has-text("2")').first();
        if (await page2Btn.isVisible()) {
          console.log('Clicking page 2...');
          await page2Btn.click();
          await page.waitForTimeout(2000);
          console.log('URL after clicking page 2:', page.url());
          
          // Check row count again
          const newRowCount = await page.locator('tbody tr').count();
          console.log('Rows after clicking page 2:', newRowCount);
        }
      }
    } else {
      // Check what's on the page
      const bodyText = await page.locator('body').textContent();
      console.log('Page content (first 500 chars):', bodyText?.substring(0, 500));
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('Browser will stay open for 30 seconds for manual testing...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

testManualNavigation();