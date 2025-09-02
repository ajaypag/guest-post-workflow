import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false, // Show browser so we can see what's happening
    slowMo: 500 // Slow down actions
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3003/login');
    
    console.log('2. Filling in login credentials...');
    await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"]', 'FA64!I$nrbCauS^d');
    
    console.log('3. Clicking sign in...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
    console.log('4. Login successful, navigating to order edit page...');
    
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202/edit');
    await page.waitForLoadState('networkidle');
    
    console.log('5. Order edit page loaded successfully');
    
    // Look for "Save changes" button and click it
    console.log('6. Looking for Save changes button...');
    const saveChangesButton = page.locator('button:has-text("Save changes")');
    const saveChangesExists = await saveChangesButton.count() > 0;
    console.log('   Save changes button found:', saveChangesExists);
    
    if (saveChangesExists) {
      console.log('7. Clicking Save changes...');
      await saveChangesButton.click();
      
      // Wait for the modal to appear
      await page.waitForSelector('[data-testid="confirm-modal"], .modal, div:has-text("Continue Editing")', { timeout: 5000 });
      console.log('8. Modal appeared');
      
      // Look for "Save as Draft" button
      const saveAsDraftButton = page.locator('button:has-text("Save as Draft")');
      const saveAsDraftExists = await saveAsDraftButton.count() > 0;
      console.log('9. Save as Draft button found:', saveAsDraftExists);
      
      if (saveAsDraftExists) {
        console.log('10. Clicking Save as Draft...');
        
        // Listen for network requests to see what API calls are made
        page.on('response', (response) => {
          if (response.url().includes('/api/orders/')) {
            console.log(`   API Response: ${response.status()} ${response.url()}`);
          }
        });
        
        await saveAsDraftButton.click();
        
        // Wait for either success or error
        try {
          // Wait for either success redirect or error message
          await Promise.race([
            page.waitForURL(/\/orders\/474e3625-4140-4919-870e-94497bc81202$/, { timeout: 10000 }),
            page.waitForSelector('.error, [data-testid="error"]', { timeout: 10000 })
          ]);
          
          const currentUrl = page.url();
          console.log('11. After Save as Draft action, current URL:', currentUrl);
          
          // Check for any error messages on the page
          const errorElements = await page.locator('.error, [data-testid="error"], .text-red-500, .text-red-600').all();
          if (errorElements.length > 0) {
            console.log('12. Error messages found:');
            for (const errorEl of errorElements) {
              const errorText = await errorEl.textContent();
              console.log('    -', errorText);
            }
          } else {
            console.log('12. No error messages found');
          }
          
          // Check browser console for errors
          const consoleMessages = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              consoleMessages.push(msg.text());
            }
          });
          
          if (consoleMessages.length > 0) {
            console.log('13. Browser console errors:');
            consoleMessages.forEach(msg => console.log('    -', msg));
          }
          
        } catch (waitError) {
          console.log('11. Timeout waiting for response:', waitError.message);
        }
        
      } else {
        console.log('10. Save as Draft button not found - may not be available for this order');
      }
      
    } else {
      console.log('7. Save changes button not found');
    }
    
    // Keep browser open for inspection
    console.log('Test completed, keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/error_save_as_draft.png', fullPage: true });
  }
  
  await browser.close();
})();