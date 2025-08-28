const { chromium } = require('playwright');

async function createAndTestRequest() {
  console.log('Creating and testing vetted sites request...');
  
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
    
    console.log('2. Going to vetted sites requests page...');
    await page.goto('http://localhost:3003/internal/vetted-sites/requests');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot to see current requests
    await page.screenshot({ path: 'requests-list.png' });
    console.log('Screenshot saved: requests-list.png');
    
    // Look for existing requests with links
    console.log('3. Looking for existing requests...');
    const requestLinks = await page.locator('a[href*="/internal/vetted-sites/requests/"]').all();
    console.log(`Found ${requestLinks.length} request links`);
    
    if (requestLinks.length > 0) {
      // Get the first request URL
      const firstRequestUrl = await requestLinks[0].getAttribute('href');
      console.log('4. Testing with existing request:', firstRequestUrl);
      
      await page.click(`a[href="${firstRequestUrl}"]`);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of the request page
      await page.screenshot({ path: 'request-detail.png' });
      console.log('Screenshot saved: request-detail.png');
      
      // Monitor API calls
      page.on('response', response => {
        if (response.url().includes('/api/vetted-sites/requests/')) {
          console.log('🔄 API Call:', response.method(), response.url(), 'Status:', response.status());
        }
      });
      
      // Look for status controls
      console.log('5. Looking for status controls...');
      
      // Try to find status dropdown or buttons
      const statusSelectors = [
        'select[name*="status"]',
        'select',
        '[data-testid*="status"]',
        'button:has-text("Approved")',
        'button:has-text("Rejected")',
        'button:has-text("Fulfilled")'
      ];
      
      let statusControl = null;
      for (const selector of statusSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log(`Found status control: ${selector}`);
          statusControl = element;
          break;
        }
      }
      
      if (statusControl) {
        // Try to change status
        const tagName = await statusControl.evaluate(el => el.tagName.toLowerCase());
        console.log('6. Status control type:', tagName);
        
        if (tagName === 'select') {
          // Get current value
          const currentValue = await statusControl.inputValue();
          console.log('Current status:', currentValue);
          
          // Try to change to approved
          if (currentValue !== 'approved') {
            console.log('7. Changing status to approved...');
            await statusControl.selectOption('approved');
            
            // Look for submit button
            const submitButton = page.locator('button:has-text("Update"), button:has-text("Save"), button[type="submit"]').first();
            if (await submitButton.count() > 0) {
              console.log('8. Clicking submit button...');
              await submitButton.click();
              
              // Wait for response
              await page.waitForTimeout(5000);
              console.log('✅ Status change attempt completed - check backend logs for email');
            } else {
              console.log('❌ No submit button found');
            }
          } else {
            console.log('Status already approved, trying fulfilled...');
            await statusControl.selectOption('fulfilled');
            const submitButton = page.locator('button:has-text("Update"), button:has-text("Save"), button[type="submit"]').first();
            if (await submitButton.count() > 0) {
              await submitButton.click();
              await page.waitForTimeout(5000);
              console.log('✅ Status change to fulfilled completed');
            }
          }
        }
      } else {
        console.log('❌ No status controls found on the page');
        
        // Show what elements we do have
        console.log('Available elements:');
        const allButtons = await page.locator('button').all();
        console.log(`Buttons: ${allButtons.length}`);
        for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
          const text = await allButtons[i].textContent();
          console.log(`  Button ${i}: "${text}"`);
        }
        
        const allSelects = await page.locator('select').all();
        console.log(`Selects: ${allSelects.length}`);
        for (let i = 0; i < allSelects.length; i++) {
          const name = await allSelects[i].getAttribute('name');
          console.log(`  Select ${i}: name="${name}"`);
        }
      }
      
    } else {
      console.log('❌ No existing requests found. You may need to create one first.');
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    // Keep browser open for manual inspection
    console.log('Test completed. Browser left open for manual inspection.');
    // await browser.close();
  }
}

createAndTestRequest();