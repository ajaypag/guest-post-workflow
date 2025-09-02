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
    
    console.log('2. Waiting for login form to be ready...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('3. Filling in login credentials...');
    await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"]', 'FA64!I$nrbCauS^d');
    
    console.log('4. Clicking sign in...');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('http://localhost:3003/', { timeout: 15000 });
    console.log('5. Login successful, navigating to order edit page...');
    
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202/edit');
    await page.waitForLoadState('networkidle');
    
    console.log('6. Order edit page loaded - checking for Save changes button...');
    
    // Look for the Save changes button - try different variations
    const saveButtons = [
      'button:has-text("Save changes")',
      'button:has-text("Save Changes")', 
      'button:has-text("Save")',
      'button[type="submit"]'
    ];
    
    let saveButton = null;
    for (const selector of saveButtons) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        saveButton = button.first();
        console.log(`   Found button with selector: ${selector}`);
        break;
      }
    }
    
    if (!saveButton) {
      // List all buttons to see what's available
      const allButtons = await page.locator('button').all();
      console.log('7. All buttons on page:');
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        console.log(`   ${i + 1}. "${text}"`);
      }
    } else {
      console.log('7. Clicking Save button to open modal...');
      await saveButton.click();
      
      // Wait for the modal to appear
      await page.waitForSelector('h2:has-text("Confirm"), h2:has-text("Resubmit"), div:has-text("Continue Editing")', { timeout: 5000 });
      console.log('8. Modal appeared');
      
      // Check what buttons are in the modal
      const modalButtons = await page.locator('button').allTextContents();
      const visibleButtons = modalButtons.filter(text => text && text.trim());
      console.log('9. Modal buttons:', visibleButtons);
      
      // Look specifically for "Save as Draft" button
      const saveAsDraftButton = page.locator('button:has-text("Save as Draft")');
      const saveAsDraftExists = await saveAsDraftButton.count() > 0;
      console.log('10. "Save as Draft" button found:', saveAsDraftExists);
      
      // Check the modal title to understand the flow
      const modalTitle = await page.locator('h2').first().textContent();
      console.log('11. Modal title:', modalTitle);
      
      if (saveAsDraftExists) {
        console.log('12. SUCCESS! Save as Draft option is available in the modal');
      } else {
        console.log('12. Save as Draft option is NOT available - may need to check order status');
      }
    }
    
    console.log('Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/login_error.png', fullPage: true });
  }
  
  await browser.close();
})();