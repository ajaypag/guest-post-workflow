import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
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
    
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
    console.log('4. Login successful, navigating to order edit page...');
    
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202/edit');
    await page.waitForLoadState('networkidle');
    
    console.log('5. Order edit page loaded');
    
    // Look for "Save changes" button and click it
    console.log('6. Looking for Save changes button...');
    const saveChangesButton = page.locator('button:has-text("Save changes")');
    const saveChangesExists = await saveChangesButton.count() > 0;
    console.log('   Save changes button found:', saveChangesExists);
    
    if (saveChangesExists) {
      console.log('7. Clicking Save changes to open modal...');
      await saveChangesButton.click();
      
      // Wait for the modal to appear
      await page.waitForSelector('div:has-text("Continue Editing")', { timeout: 5000 });
      console.log('8. Modal appeared');
      
      // Check what buttons are available
      const modalButtons = await page.locator('button').allTextContents();
      console.log('9. Modal buttons found:', modalButtons.filter(text => text && text.trim()));
      
      // Look specifically for "Save as Draft" button
      const saveAsDraftButton = page.locator('button:has-text("Save as Draft")');
      const saveAsDraftExists = await saveAsDraftButton.count() > 0;
      console.log('10. "Save as Draft" button found:', saveAsDraftExists);
      
      // Look for the resubmit button
      const resubmitButton = page.locator('button:has-text("Save & Resubmit for Review"), button:has-text("Save & Request Changes")');
      const resubmitExists = await resubmitButton.count() > 0;
      console.log('11. Resubmit button found:', resubmitExists);
      
      if (resubmitExists) {
        const resubmitText = await resubmitButton.textContent();
        console.log('    Resubmit button text:', resubmitText);
      }
      
      // Check modal heading to understand the flow type
      const modalHeading = await page.locator('h2').first().textContent();
      console.log('12. Modal heading:', modalHeading);
      
      // Test the Save as Draft functionality if available
      if (saveAsDraftExists) {
        console.log('13. Testing Save as Draft functionality...');
        
        // Listen for API responses
        page.on('response', (response) => {
          if (response.url().includes('/api/orders/')) {
            console.log(`    API Response: ${response.status()} ${response.url()}`);
          }
        });
        
        await saveAsDraftButton.click();
        
        // Wait for either success redirect or error
        try {
          await page.waitForURL(/\/orders\/474e3625-4140-4919-870e-94497bc81202$/, { timeout: 10000 });
          console.log('14. Successfully redirected after Save as Draft');
        } catch (e) {
          console.log('14. Did not redirect - checking for errors...');
          
          // Check for error messages
          const errorElements = await page.locator('.error, [data-testid="error"], .text-red-500').all();
          if (errorElements.length > 0) {
            for (const errorEl of errorElements) {
              const errorText = await errorEl.textContent();
              console.log('    Error:', errorText);
            }
          }
        }
      } else {
        console.log('13. Save as Draft button not available for this order status');
      }
      
    } else {
      console.log('7. Save changes button not found');
    }
    
    console.log('Test completed, keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/error_save_as_draft_resubmit.png', fullPage: true });
  }
  
  await browser.close();
})();