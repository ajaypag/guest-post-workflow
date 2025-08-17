const { chromium } = require('playwright');

async function testAddWebsiteFinal() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();
  
  console.log('FINAL TEST - ADD WEBSITE WITH FIXED DOMAIN HANDLING');
  console.log('=====================================================\n');
  
  try {
    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('   Logged in successfully\n');
    
    // Go to add website page
    console.log('2. Navigating to add website page...');
    await page.goto('http://localhost:3001/publisher/websites/new');
    await page.waitForLoadState('networkidle');
    
    // Fill form with a new test website
    const timestamp = Date.now();
    const testDomain = 'final-test-' + timestamp + '.com';
    
    console.log('3. Filling form with:');
    console.log('   Domain: ' + testDomain);
    console.log('   Category: Business\n');
    
    await page.fill('input[name="domain"]', testDomain);
    await page.selectOption('select[name="category"]', 'Business');
    
    // Submit
    console.log('4. Submitting form...');
    await page.click('button[type="submit"]:has-text("Add Website")');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('   Current URL: ' + currentUrl);
    
    // Check if redirected to websites list
    if (currentUrl.includes('/publisher/websites') && !currentUrl.includes('/new')) {
      console.log('   SUCCESS: Redirected to websites list!\n');
      
      // Wait for table to load
      await page.waitForTimeout(2000);
      
      // Check the table
      console.log('5. Checking websites table:');
      
      // Get all domain cells
      const domainCells = await page.locator('table tbody tr td:first-child').allTextContents();
      console.log('   Websites in table: ' + domainCells.length);
      
      domainCells.forEach((domain, index) => {
        console.log('   Website ' + (index + 1) + ': ' + domain.trim());
      });
      
      // Check if our new website is there
      const ourWebsite = domainCells.find(d => d.includes(testDomain));
      if (ourWebsite) {
        console.log('\n   SUCCESS! Our website "' + testDomain + '" is in the table!');
        console.log('   Table is displaying correctly!');
      } else {
        console.log('\n   ERROR: Our website not found in table');
      }
      
      // Take final screenshot
      await page.screenshot({ path: 'final-test-websites-table.png', fullPage: true });
      console.log('\n6. Screenshot saved: final-test-websites-table.png');
      
    } else {
      console.log('   ERROR: Did not redirect to websites list');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\n=====================================================');
    console.log('Test complete - browser will close in 10 seconds');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testAddWebsiteFinal().catch(console.error);
