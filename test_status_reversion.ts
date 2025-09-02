import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('2. Filling in login credentials...');
    await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3003/', { timeout: 15000 });
    
    console.log('3. First, checking the current order status on details page...');
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202');
    await page.waitForLoadState('networkidle');
    
    // Check current status on the order page
    const pageContent = await page.textContent('body');
    const hasAwaitingConfirmation = pageContent?.includes('Awaiting Confirmation') || pageContent?.includes('awaiting confirmation');
    const hasPendingConfirmation = pageContent?.includes('pending_confirmation');
    console.log('   Order currently awaiting confirmation:', hasAwaitingConfirmation);
    
    console.log('4. Navigating to edit page...');
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202/edit');
    await page.waitForLoadState('networkidle');
    
    console.log('5. Clicking Resubmit button to open modal...');
    const resubmitButton = page.locator('button:has-text("Resubmit")');
    await resubmitButton.click();
    
    // Wait for modal
    await page.waitForSelector('div.fixed.inset-0', { timeout: 5000 });
    console.log('6. Modal opened');
    
    console.log('7. Clicking "Save as Draft" button...');
    const saveAsDraftButton = page.locator('.fixed.inset-0 button:has-text("Save as Draft")');
    
    // Listen for API calls to track the status change
    const apiCalls = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/orders/474e3625-4140-4919-870e-94497bc81202')) {
        apiCalls.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status()
        });
        console.log(`   API Call: ${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });
    
    await saveAsDraftButton.click();
    
    console.log('8. Waiting for redirect back to order details...');
    try {
      await page.waitForURL(/\/orders\/474e3625-4140-4919-870e-94497bc81202$/, { timeout: 15000 });
      console.log('9. Successfully redirected to order details page');
      
      // Wait for page to load and check the new status
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Give it time to update
      
      console.log('10. Checking if order status has been reverted...');
      const updatedPageContent = await page.textContent('body');
      const stillAwaitingConfirmation = updatedPageContent?.includes('Awaiting Confirmation');
      const nowDraft = updatedPageContent?.includes('Draft Order') || updatedPageContent?.includes('draft');
      
      console.log('   Still showing "Awaiting Confirmation":', stillAwaitingConfirmation);
      console.log('   Now showing "Draft" status:', nowDraft);
      
      if (!stillAwaitingConfirmation && nowDraft) {
        console.log('11. ✅ SUCCESS! Order status successfully reverted from pending_confirmation back to draft');
      } else if (!stillAwaitingConfirmation) {
        console.log('11. ✅ PARTIAL SUCCESS! Order no longer shows "Awaiting Confirmation" (status may have changed)');
      } else {
        console.log('11. ❌ Status reversion may not have worked - still shows awaiting confirmation');
      }
      
      // Check what edit buttons are now available
      const editButtons = await page.locator('a:has-text("Edit"), button:has-text("Edit")').count();
      console.log('12. Edit buttons now available:', editButtons);
      
    } catch (e) {
      console.log('9. Timeout waiting for redirect - checking current state...');
      const currentUrl = page.url();
      console.log('   Current URL:', currentUrl);
      
      // Check for any error messages
      const errorElements = await page.locator('.error, [data-testid="error"], .text-red-500').all();
      if (errorElements.length > 0) {
        console.log('   Errors found:');
        for (const errorEl of errorElements) {
          const errorText = await errorEl.textContent();
          console.log('     -', errorText);
        }
      }
    }
    
    console.log('API calls made:', apiCalls);
    console.log('Keeping browser open for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/status_reversion_error.png', fullPage: true });
  }
  
  await browser.close();
})();