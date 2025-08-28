const { chromium } = require('playwright');

async function clickAndTestEmails() {
  console.log('Testing email notifications by clicking status buttons...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login first
    console.log('1. Logging in...');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3003/');
    console.log('✅ Logged in successfully');
    
    // Go directly to the known working request
    const requestUrl = 'http://localhost:3003/internal/vetted-sites/requests/7456ccfa-b7a7-42f6-b12e-1d5680f3d133';
    console.log('2. Going to request page...');
    await page.goto(requestUrl);
    await page.waitForLoadState('networkidle');
    
    // Monitor API calls for email sending
    const apiCalls = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/vetted-sites/requests/') || url.includes('email')) {
        apiCalls.push({
          method: response.request().method(),
          url: url,
          status: response.status()
        });
        console.log(`🔄 API: ${response.request().method()} ${url} → ${response.status()}`);
      }
    });
    
    console.log('3. Taking screenshot of current state...');
    await page.screenshot({ path: 'before-click.png', fullPage: true });
    
    // Look for current status
    console.log('4. Checking current status...');
    const statusElements = await page.locator('[data-status], .status, *:has-text("Status:")').all();
    for (let i = 0; i < statusElements.length; i++) {
      const text = await statusElements[i].textContent();
      console.log(`Status element ${i}: "${text}"`);
    }
    
    // Test sequence: Try to trigger different status changes
    const statusButtons = ['approved', 'fulfilled', 'rejected'];
    
    for (const status of statusButtons) {
      console.log(`\n=== Testing ${status.toUpperCase()} email notification ===`);
      
      // Look for button with this status text
      const buttonSelectors = [
        `button:has-text("${status}")`,
        `button:has-text("${status.charAt(0).toUpperCase() + status.slice(1)}")`,
        `[data-action="${status}"]`,
        `[data-status="${status}"]`
      ];
      
      let statusButton = null;
      for (const selector of buttonSelectors) {
        const button = page.locator(selector).first();
        if (await button.count() > 0 && await button.isVisible()) {
          statusButton = button;
          console.log(`Found ${status} button: ${selector}`);
          break;
        }
      }
      
      if (statusButton) {
        console.log(`5. Clicking ${status} button...`);
        await statusButton.click();
        
        // Wait for potential API calls
        await page.waitForTimeout(3000);
        
        console.log(`6. Taking screenshot after ${status} click...`);
        await page.screenshot({ path: `after-${status}-click.png`, fullPage: true });
        
        // Check if any PATCH request was made to update status
        const patchCalls = apiCalls.filter(call => call.method === 'PATCH' && call.url.includes('vetted-sites/requests'));
        if (patchCalls.length > 0) {
          console.log(`✅ PATCH request made for ${status} - email should have been sent`);
        } else {
          console.log(`❌ No PATCH request detected for ${status}`);
        }
        
        // Clear API calls for next test
        apiCalls.length = 0;
        
        // Wait a bit before next test
        await page.waitForTimeout(2000);
      } else {
        console.log(`❌ No ${status} button found`);
      }
    }
    
    console.log('\n=== Test Summary ===');
    console.log('Screenshots taken:');
    console.log('- before-click.png');
    console.log('- after-approved-click.png (if approved button found)');
    console.log('- after-fulfilled-click.png (if fulfilled button found)');
    console.log('- after-rejected-click.png (if rejected button found)');
    console.log('\nCheck backend logs for email sending notifications');
    
  } catch (error) {
    console.error('Error during test:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    // Keep browser open briefly for inspection
    console.log('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

clickAndTestEmails();