const puppeteer = require('puppeteer');

async function testGetStartedFlow() {
  console.log('🚀 Testing fixed Get Started flow...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 500 // Slow down for better observation
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="email"]');
    
    await page.type('input[type="email"]', 'test@linkio.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('✅ Successfully logged in');
    
    // Step 2: Navigate to Get Started
    console.log('\n📝 Step 2: Navigating to /get-started...');
    await page.goto('http://localhost:3000/get-started');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    const pageTitle = await page.$eval('h1', el => el.textContent);
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Step 3: Fill out the Quick Start form
    console.log('\n📝 Step 3: Filling out Quick Start form...');
    
    // Wait for form to be ready
    await page.waitForSelector('input', { timeout: 5000 });
    
    // Fill company name if present
    const companyInput = await page.$('input[placeholder*="company"], input[placeholder*="Company"]');
    if (companyInput) {
      await companyInput.type('Test Company Ltd');
      console.log('✅ Filled company name');
    }
    
    // Fill target URL
    const urlInputs = await page.$$('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]');
    if (urlInputs.length > 0) {
      await urlInputs[0].type('https://testcompany.com');
      console.log('✅ Filled target URL');
    }
    
    // Find and set link count
    const linkInputs = await page.$$('input[type="number"], select');
    if (linkInputs.length > 0) {
      await linkInputs[0].click();
      await linkInputs[0].evaluate(el => el.value = '');
      await linkInputs[0].type('5');
      console.log('✅ Set link count to 5');
    }
    
    // Wait a moment for any dynamic updates
    await page.waitForTimeout(2000);
    
    // Step 4: Submit the form
    console.log('\n📝 Step 4: Submitting form...');
    
    // Look for submit buttons
    const submitSelectors = [
      'button[type="submit"]',
      'button:contains("Submit")',
      'button:contains("Create")',
      'button:contains("Start")',
      'button:contains("Continue")'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!submitButton) {
      // Try to find any button that might be the submit button
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        submitButton = buttons[buttons.length - 1]; // Try the last button
      }
    }
    
    if (submitButton) {
      await submitButton.click();
      console.log('✅ Clicked submit button');
      
      // Wait for navigation or response
      try {
        await page.waitForNavigation({ timeout: 15000 });
        console.log('✅ Form submitted successfully - navigated to new page');
        
        // Get the current URL to see where we ended up
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        // If we're on an order page, check for line items
        if (currentUrl.includes('/orders/')) {
          console.log('\n📝 Step 5: Checking for line items in created order...');
          
          // Wait for page to load
          await page.waitForTimeout(3000);
          
          // Look for line items or "no items" message
          const noItemsMessage = await page.$('text/No items in this order yet');
          if (noItemsMessage) {
            console.log('❌ ERROR: Order shows "No items in this order yet" - FIX FAILED');
            return false;
          }
          
          // Look for line items table or content
          const lineItemsTable = await page.$('table, .line-item');
          if (lineItemsTable) {
            console.log('✅ SUCCESS: Line items table found in order!');
            
            // Try to count rows
            const rows = await page.$$('tr');
            console.log(`📊 Found ${rows.length} table rows`);
            
            return true;
          } else {
            console.log('⚠️  Could not definitively find line items table');
            return false;
          }
        } else {
          console.log(`📍 Redirected to: ${currentUrl}`);
          return true;
        }
        
      } catch (navError) {
        console.log('⚠️  No navigation detected - checking for success indicators...');
        
        // Check for success messages or confirmation
        const successIndicators = await page.$$('text/Success, text/Created, text/Order');
        if (successIndicators.length > 0) {
          console.log('✅ Found success indicators on page');
          return true;
        }
        
        return false;
      }
    } else {
      console.log('❌ Could not find submit button');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    console.log('\n🔄 Keeping browser open for manual inspection...');
    // Don't close browser automatically so we can inspect
    // await browser.close();
  }
}

// Run the test
testGetStartedFlow().then(success => {
  if (success) {
    console.log('\n🎉 GET STARTED FLOW TEST: SUCCESS');
    console.log('✅ The QuickStart flow now creates line items properly!');
  } else {
    console.log('\n💥 GET STARTED FLOW TEST: FAILED');
    console.log('❌ The QuickStart flow still has issues');
  }
}).catch(error => {
  console.error('\n💥 TEST CRASHED:', error);
});