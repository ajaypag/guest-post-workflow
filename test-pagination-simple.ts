import { chromium } from 'playwright';

async function testPagination() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
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
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('Did not redirect to dashboard, continuing...');
    });
    
    // Navigate to vetted sites
    console.log('Going to vetted sites...');
    await page.goto('http://localhost:3004/vetted-sites', { waitUntil: 'networkidle' });
    
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });
    console.log('Table loaded');
    
    // Check initial state
    const url1 = page.url();
    console.log('Initial URL:', url1);
    
    // Count initial rows
    const initialRows = await page.locator('tbody tr').count();
    console.log('Initial row count:', initialRows);
    
    // Find and click page 2 button
    console.log('Looking for page 2 button...');
    const page2Button = await page.locator('button').filter({ hasText: '2' }).first();
    
    if (await page2Button.isVisible()) {
      console.log('Clicking page 2...');
      await page2Button.click();
      
      // Wait for URL to change
      await page.waitForTimeout(3000);
      
      // Check if URL changed
      const url2 = page.url();
      console.log('URL after clicking page 2:', url2);
      
      if (url2.includes('page=2')) {
        console.log('✅ URL updated correctly!');
      } else {
        console.log('❌ URL did not update');
      }
      
      // Check if content changed
      const page2Rows = await page.locator('tbody tr').count();
      console.log('Page 2 row count:', page2Rows);
      
      if (page2Rows !== initialRows) {
        console.log('✅ Content changed!');
      } else {
        console.log('❌ Content did not change');
      }
      
      // Try clicking back to page 1
      console.log('Clicking page 1...');
      const page1Button = await page.locator('button').filter({ hasText: '1' }).first();
      await page1Button.click();
      
      await page.waitForTimeout(3000);
      
      const url3 = page.url();
      console.log('URL after clicking page 1:', url3);
      
      const page1RowsAgain = await page.locator('tbody tr').count();
      console.log('Page 1 row count (second time):', page1RowsAgain);
      
      if (page1RowsAgain === initialRows) {
        console.log('✅ Successfully returned to page 1 content!');
      } else {
        console.log('❌ Page 1 content different from initial');
      }
    } else {
      console.log('Page 2 button not found - might not have enough data for pagination');
      console.log('Total pages:', await page.locator('.text-gray-600').filter({ hasText: 'of' }).textContent());
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