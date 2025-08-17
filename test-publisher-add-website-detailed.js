const { chromium } = require('playwright');

async function testPublisherAddWebsite() {
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Testing Publisher Add Website Flow');
  console.log('==============================');
  
  try {
    // Step 1: Login to publisher account
    console.log('1. Logging in to publisher account...');
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    
    // Submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    
    await page.waitForTimeout(2000);
    
    const afterLoginUrl = page.url();
    console.log('   After login URL: ' + afterLoginUrl);
    
    if (!afterLoginUrl.includes('/publisher')) {
      console.log('   ERROR: Login failed, not on publisher page');
      return;
    }
    console.log('   SUCCESS: Logged in');
    
    // Step 2: Navigate directly to add website page
    console.log('2. Navigating to add website page...');
    await page.goto('http://localhost:3001/publisher/websites/new');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('   Current URL: ' + currentUrl);
    
    // Step 3: Fill the form
    console.log('3. Filling the form...');
    
    const testDomain = 'test-website-' + Date.now() + '.com';
    const testName = 'Test Blog Site';
    
    console.log('   Domain: ' + testDomain);
    console.log('   Name: ' + testName);
    
    // Fill domain
    await page.fill('input[name="domain"]', testDomain);
    
    // Fill name
    await page.fill('input[name="name"]', testName);
    
    // Select category
    await page.selectOption('select[name="category"]', 'Technology');
    console.log('   Category: Technology');
    
    // Submit the form
    console.log('4. Submitting the form...');
    
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   BROWSER ERROR:', msg.text());
      }
    });
    
    // Click submit and wait
    await page.click('button[type="submit"]');
    
    // Wait for either navigation or error message
    await page.waitForTimeout(3000);
    
    // Check result
    const afterSubmitUrl = page.url();
    console.log('   After submit URL: ' + afterSubmitUrl);
    
    // Check for error messages
    const errorElement = await page.locator('.bg-red-50, .text-red-800, [role="alert"]').first();
    if (await errorElement.count() > 0) {
      const errorText = await errorElement.textContent();
      console.log('   ERROR MESSAGE: ' + errorText);
    }
    
    // Check for success
    if (afterSubmitUrl.includes('/publisher/websites') && !afterSubmitUrl.includes('/new')) {
      console.log('   SUCCESS: Redirected to websites list');
      
      // Check if our website appears in the list
      const websiteInList = await page.locator('text=' + testDomain).count();
      if (websiteInList > 0) {
        console.log('   VERIFIED: Website appears in the list');
      }
    } else {
      console.log('   NOTICE: Still on add website page');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'publisher-add-website-debug.png' });
      console.log('   Screenshot saved: publisher-add-website-debug.png');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    await page.screenshot({ path: 'publisher-add-website-error.png' });
    console.log('Screenshot saved: publisher-add-website-error.png');
  } finally {
    console.log('==============================');
    console.log('Test completed. Browser will remain open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testPublisherAddWebsite().catch(console.error);
