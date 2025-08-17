const { chromium } = require('playwright');

async function testCompletePublisherFlow() {
  const browser = await chromium.launch({ 
    headless: false, // Show browser
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('COMPLETE PUBLISHER WEBSITE ADD TEST');
  console.log('=====================================\n');
  
  try {
    // Step 1: Navigate to publisher login
    console.log('STEP 1: NAVIGATING TO PUBLISHER LOGIN');
    console.log('----------------------------------------');
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForLoadState('networkidle');
    console.log('Loaded: /publisher/login');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-1-login-page.png' });
    console.log('Screenshot saved: test-1-login-page.png\n');
    
    // Step 2: Login with credentials
    console.log('STEP 2: LOGGING IN');
    console.log('---------------------');
    console.log('Email: testpublisher@example.com');
    console.log('Password: TestPass123!');
    
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    
    // Click login and wait
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    
    await page.waitForTimeout(2000);
    
    const afterLoginUrl = page.url();
    console.log('Current URL: ' + afterLoginUrl);
    
    if (afterLoginUrl.includes('/publisher')) {
      console.log('Successfully logged in and on publisher dashboard\n');
      await page.screenshot({ path: 'test-2-dashboard.png' });
      console.log('Screenshot saved: test-2-dashboard.png\n');
    } else {
      console.log('ERROR: Login failed or redirected incorrectly');
      return;
    }
    
    // Step 3: Navigate to websites page
    console.log('STEP 3: CHECKING EXISTING WEBSITES');
    console.log('--------------------------------------');
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Count existing websites
    const existingWebsites = await page.locator('table tbody tr').count();
    console.log('Existing websites in list: ' + existingWebsites);
    
    await page.screenshot({ path: 'test-3-websites-list-before.png' });
    console.log('Screenshot saved: test-3-websites-list-before.png\n');
    
    // Step 4: Navigate to add website page
    console.log('STEP 4: NAVIGATING TO ADD WEBSITE PAGE');
    console.log('------------------------------------------');
    
    // Try clicking Add Website button
    const addButton = await page.locator('a:has-text("Add Website"), a:has-text("Add Your First Website")').first();
    if (await addButton.count() > 0) {
      console.log('Found "Add Website" button, clicking...');
      await addButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      console.log('Navigating directly to /publisher/websites/new');
      await page.goto('http://localhost:3001/publisher/websites/new');
      await page.waitForLoadState('networkidle');
    }
    
    await page.waitForTimeout(1000);
    console.log('Current URL: ' + page.url());
    
    await page.screenshot({ path: 'test-4-add-website-form.png' });
    console.log('Screenshot saved: test-4-add-website-form.png\n');
    
    // Step 5: Fill the form
    console.log('STEP 5: FILLING WEBSITE FORM');
    console.log('--------------------------------');
    
    const timestamp = Date.now();
    const testDomain = 'test-site-' + timestamp + '.com';
    const testName = 'Test Website ' + timestamp;
    
    console.log('Domain: ' + testDomain);
    console.log('Name: ' + testName);
    console.log('Category: Technology');
    console.log('Description: This is a test website added via Playwright');
    
    // Fill form fields
    await page.fill('input[name="domain"]', testDomain);
    await page.fill('input[name="name"]', testName);
    await page.selectOption('select[name="category"]', 'Technology');
    await page.fill('textarea[name="description"]', 'This is a test website added via Playwright automated testing');
    await page.fill('input[name="monthlyTraffic"]', '50000');
    await page.fill('input[name="domainAuthority"]', '45');
    
    await page.screenshot({ path: 'test-5-form-filled.png' });
    console.log('Screenshot saved: test-5-form-filled.png\n');
    
    // Step 6: Submit the form
    console.log('STEP 6: SUBMITTING FORM');
    console.log('---------------------------');
    
    // Listen for any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });
    
    // Click submit
    const submitButton = await page.locator('button[type="submit"]:has-text("Add Website")');
    await submitButton.click();
    console.log('Clicked submit button, waiting for response...');
    
    // Wait for navigation or error
    await page.waitForTimeout(5000);
    
    const afterSubmitUrl = page.url();
    console.log('Current URL after submit: ' + afterSubmitUrl);
    
    // Check for error messages
    const errorElement = await page.locator('.bg-red-50, .text-red-800, [role="alert"]').first();
    if (await errorElement.count() > 0) {
      const errorText = await errorElement.textContent();
      console.log('ERROR message displayed: ' + errorText);
      await page.screenshot({ path: 'test-6-submit-error.png' });
      console.log('Screenshot saved: test-6-submit-error.png\n');
    }
    
    // Step 7: Check if redirected to websites list
    console.log('STEP 7: VERIFYING WEBSITE WAS ADDED');
    console.log('----------------------------------------');
    
    if (afterSubmitUrl.includes('/publisher/websites') && !afterSubmitUrl.includes('/new')) {
      console.log('SUCCESS: Redirected to websites list!');
      
      await page.waitForTimeout(2000);
      
      // Count websites now
      const newWebsiteCount = await page.locator('table tbody tr').count();
      console.log('Websites in list now: ' + newWebsiteCount);
      
      // Check if our website appears
      const ourWebsite = await page.locator('text=' + testDomain).count();
      if (ourWebsite > 0) {
        console.log('SUCCESS! Our website "' + testDomain + '" appears in the list!');
      } else {
        console.log('WARNING: Website was added but not visible in list');
      }
      
      await page.screenshot({ path: 'test-7-websites-list-after.png' });
      console.log('Screenshot saved: test-7-websites-list-after.png');
      
    } else if (afterSubmitUrl.includes('/publisher/websites/new')) {
      console.log('WARNING: Still on add website page - submission may have failed');
      console.log('Checking for our website in the list anyway...');
      
      await page.goto('http://localhost:3001/publisher/websites');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const ourWebsite = await page.locator('text=' + testDomain).count();
      if (ourWebsite > 0) {
        console.log('SUCCESS: Website "' + testDomain + '" was added despite staying on form!');
      } else {
        console.log('ERROR: Website was not added');
      }
      
      await page.screenshot({ path: 'test-7-final-check.png' });
      console.log('Screenshot saved: test-7-final-check.png');
    }
    
  } catch (error) {
    console.error('\nTEST FAILED:', error.message);
    await page.screenshot({ path: 'test-error.png' });
    console.log('Error screenshot saved: test-error.png');
  } finally {
    console.log('\n=====================================');
    console.log('TEST COMPLETE - Browser will close in 15 seconds');
    console.log('Check the screenshot files for visual proof');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

// Run the test
testCompletePublisherFlow().catch(console.error);
