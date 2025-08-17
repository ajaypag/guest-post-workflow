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
    
    // Step 2: Navigate to add website page
    console.log('2. Navigating to add website page...');
    
    // Try clicking the "Add Website" button
    const addWebsiteButton = await page.locator('a:has-text("Add Website")').first();
    if (await addWebsiteButton.count() > 0) {
      await addWebsiteButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Navigate directly if button not found
      await page.goto('http://localhost:3001/publisher/websites/new');
      await page.waitForLoadState('networkidle');
    }
    
    const currentUrl = page.url();
    console.log('   Current URL: ' + currentUrl);
    
    if (!currentUrl.includes('/publisher/websites/new')) {
      console.log('   ERROR: Not on add website page');
      console.log('   Taking screenshot...');
      await page.screenshot({ path: 'publisher-add-website-navigation-error.png' });
      return;
    }
    console.log('   SUCCESS: On add website page');
    
    // Step 3: Check if form exists
    console.log('3. Checking for website form elements...');
    
    // Check for form fields
    const domainInput = await page.locator('input[name="domain"], input[placeholder*="domain"], input[placeholder*="example.com"]').count();
    const nameInput = await page.locator('input[name="name"], input[placeholder*="name"], input[placeholder*="Blog"]').count();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Add Website"), button:has-text("Submit")').count();
    
    console.log('   Domain input found: ' + (domainInput > 0 ? 'YES' : 'NO'));
    console.log('   Name input found: ' + (nameInput > 0 ? 'YES' : 'NO'));
    console.log('   Submit button found: ' + (submitButton > 0 ? 'YES' : 'NO'));
    
    if (domainInput === 0 || submitButton === 0) {
      console.log('   ERROR: Form elements not found!');
      console.log('   Taking screenshot...');
      await page.screenshot({ path: 'publisher-add-website-form-missing.png' });
      
      // Get page content for debugging
      const pageTitle = await page.title();
      const pageText = await page.textContent('body');
      console.log('   Page title: ' + pageTitle);
      console.log('   Page content preview: ' + pageText.substring(0, 200) + '...');
      return;
    }
    
    // Step 4: Try to fill and submit the form
    console.log('4. Attempting to add a new website...');
    
    // Fill in the form
    const testDomain = 'test-website-' + Date.now() + '.com';
    const testName = 'Test Blog Site';
    
    console.log('   Domain: ' + testDomain);
    console.log('   Name: ' + testName);
    
    await page.fill('input[name="domain"], input[placeholder*="domain"], input[placeholder*="example.com"]', testDomain);
    
    // Fill name if field exists
    if (nameInput > 0) {
      await page.fill('input[name="name"], input[placeholder*="name"], input[placeholder*="Blog"]', testName);
    }
    
    // Look for any other required fields
    const categorySelect = await page.locator('select[name="category"], select[name="niche"]').count();
    if (categorySelect > 0) {
      await page.selectOption('select[name="category"], select[name="niche"]', { index: 1 });
      console.log('   Selected category');
    }
    
    // Submit the form
    console.log('5. Submitting the form...');
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      page.click('button[type="submit"], button:has-text("Add Website"), button:has-text("Submit")')
    ]);
    
    await page.waitForTimeout(2000);
    
    // Check result
    const afterSubmitUrl = page.url();
    console.log('   After submit URL: ' + afterSubmitUrl);
    
    // Check for success message
    const successMessage = await page.locator('.success, .alert-success, [role="alert"]:has-text("success")').count();
    const errorMessage = await page.locator('.error, .alert-error, [role="alert"]:has-text("error")').count();
    
    if (successMessage > 0) {
      console.log('   SUCCESS: Website added successfully!');
    } else if (errorMessage > 0) {
      const errorText = await page.locator('.error, .alert-error, [role="alert"]').first().textContent();
      console.log('   ERROR adding website: ' + errorText);
    } else if (afterSubmitUrl.includes('/publisher/websites')) {
      console.log('   SUCCESS: Likely successful (redirected to websites list)');
    } else {
      console.log('   WARNING: Unclear result, taking screenshot...');
      await page.screenshot({ path: 'publisher-add-website-result.png' });
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    await page.screenshot({ path: 'publisher-add-website-error.png' });
    console.log('Screenshot saved: publisher-add-website-error.png');
  } finally {
    // Keep browser open for manual inspection
    console.log('==============================');
    console.log('Test completed. Browser will remain open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testPublisherAddWebsite().catch(console.error);
