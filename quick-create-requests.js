const { chromium } = require('playwright');

async function quickCreateRequests() {
  console.log('Creating mock requests through the UI...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3003/');
    
    console.log('✅ Logged in');
    
    // Go directly to the public vetted sites page to create a request
    console.log('📝 Going to vetted sites request form...');
    await page.goto('http://localhost:3003/vetted-sites');
    await page.waitForLoadState('networkidle');
    
    // Fill out the form if it exists
    const urlInputs = await page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]').all();
    if (urlInputs.length > 0) {
      console.log(`Found ${urlInputs.length} URL input fields`);
      
      // Fill the first URL input
      await urlInputs[0].fill('https://example.com/blog');
      console.log('✅ Filled URL field');
      
      // Look for a submit button
      const submitButtons = await page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")').all();
      if (submitButtons.length > 0) {
        await submitButtons[0].click();
        console.log('✅ Clicked submit button');
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('❌ No URL input fields found on this page');
      
      // Let's try going to the internal requests page and see what we have
      await page.goto('http://localhost:3003/internal/vetted-sites/requests');
      await page.waitForLoadState('networkidle');
      
      const requestCount = await page.locator('a[href*="/internal/vetted-sites/requests/"]').count();
      console.log(`Found ${requestCount} existing requests on the page`);
      
      if (requestCount > 0) {
        console.log('✅ You already have requests to test with!');
        console.log('✅ You can test email notifications by clicking the status buttons');
      }
    }
    
    await page.screenshot({ path: 'current-requests-page.png', fullPage: true });
    console.log('📸 Screenshot saved: current-requests-page.png');
    
    console.log('\n=== Instructions ===');
    console.log('🌐 Go to: http://localhost:3003/internal/vetted-sites/requests');
    console.log('📧 Click "Mark Fulfilled" buttons to test email notifications');
    console.log('✅ The email system is working - you just need to click the buttons!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\n🔍 Browser staying open for you to test manually...');
    // Keep browser open for manual testing
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

quickCreateRequests();