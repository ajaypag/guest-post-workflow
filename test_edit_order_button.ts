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
    console.log('4. Login successful, navigating to order details page...');
    
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202');
    await page.waitForLoadState('networkidle');
    
    console.log('5. Order details page loaded successfully');
    
    // Check order status and look for notification card
    const orderStatus = await page.evaluate(() => {
      // Look for order status indicators
      const statusElements = document.querySelectorAll('[data-status], .status');
      return Array.from(statusElements).map(el => el.textContent?.trim()).filter(Boolean);
    });
    console.log('6. Order status elements:', orderStatus);
    
    // Look for "Order Awaiting Confirmation" notification card
    const awaitingConfirmationCard = await page.locator('h3:has-text("Order Awaiting Confirmation")').count();
    console.log('7. "Order Awaiting Confirmation" card found:', awaitingConfirmationCard > 0);
    
    if (awaitingConfirmationCard > 0) {
      // Look for Edit Order button within the notification card
      const editOrderButton = page.locator('a:has-text("Edit Order")');
      const editButtonExists = await editOrderButton.count() > 0;
      console.log('8. "Edit Order" button found:', editButtonExists);
      
      if (editButtonExists) {
        // Get the href of the edit button
        const editHref = await editOrderButton.getAttribute('href');
        console.log('9. Edit Order button href:', editHref);
        
        // Click the Edit Order button
        console.log('10. Clicking "Edit Order" button...');
        await editOrderButton.click();
        
        // Wait for navigation to edit page
        await page.waitForURL(/\/orders\/474e3625-4140-4919-870e-94497bc81202\/edit/, { timeout: 10000 });
        console.log('11. Successfully navigated to edit page');
        
        // Verify we're on the edit page by looking for edit-specific elements
        const saveChangesButton = await page.locator('button:has-text("Save changes")').count();
        console.log('12. Edit page verified - "Save changes" button found:', saveChangesButton > 0);
        
      } else {
        console.log('8. Edit Order button not found in the notification card');
      }
    } else {
      // Check what status the order is actually in
      const statusText = await page.textContent('body');
      if (statusText?.includes('pending_confirmation')) {
        console.log('7. Order is pending confirmation but notification card not found');
      } else {
        console.log('7. Order may not be in pending_confirmation status');
      }
      
      // Look for any Edit buttons on the page
      const anyEditButtons = await page.locator('button:has-text("Edit"), a:has-text("Edit")').count();
      console.log('   Any edit buttons found on page:', anyEditButtons);
    }
    
    // Take a screenshot for reference
    await page.screenshot({ path: '/tmp/edit_order_button_test.png', fullPage: true });
    console.log('13. Screenshot saved');
    
    // Keep browser open for inspection
    console.log('Test completed, keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/error_edit_order_test.png', fullPage: true });
  }
  
  await browser.close();
})();