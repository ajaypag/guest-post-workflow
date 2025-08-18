const { chromium } = require('playwright');

async function checkWebsitesTable() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('CHECKING WEBSITES TABLE DISPLAY');
  console.log('================================\n');
  
  try {
    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('   Logged in successfully\n');
    
    // Navigate to websites
    console.log('2. Navigating to websites page...');
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check table structure
    console.log('3. Analyzing table structure:');
    
    // Check headers
    const headers = await page.locator('table thead th').allTextContents();
    console.log('   Table Headers:', headers);
    
    // Check number of rows
    const rowCount = await page.locator('table tbody tr').count();
    console.log('   Number of rows:', rowCount);
    
    // Check first row data
    if (rowCount > 0) {
      console.log('\n4. First row data:');
      const firstRowCells = await page.locator('table tbody tr:first-child td').allTextContents();
      console.log('   Cell count:', firstRowCells.length);
      firstRowCells.forEach((cell, index) => {
        console.log('   Cell ' + (index + 1) + ':', cell || '(empty)');
      });
    }
    
    // Check for any error messages
    const errors = await page.locator('.text-red-500, .text-red-600, .text-red-800').allTextContents();
    if (errors.length > 0) {
      console.log('\n5. Error messages found:');
      errors.forEach(err => console.log('   -', err));
    }
    
    // Take screenshot
    await page.screenshot({ path: 'websites-table-check.png', fullPage: true });
    console.log('\n6. Full page screenshot saved: websites-table-check.png');
    
    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\n================================');
    console.log('Check complete - browser will close in 10 seconds');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

checkWebsitesTable().catch(console.error);
