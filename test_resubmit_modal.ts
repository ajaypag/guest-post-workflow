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
    
    console.log('6. Order edit page loaded - looking for Resubmit button...');
    
    // Look for the Resubmit button
    const resubmitButton = page.locator('button:has-text("Resubmit")');
    const resubmitExists = await resubmitButton.count() > 0;
    console.log('   Resubmit button found:', resubmitExists);
    
    if (resubmitExists) {
      console.log('7. Clicking Resubmit button to open modal...');
      await resubmitButton.click();
      
      // Wait for the modal to appear
      await page.waitForSelector('div.fixed.inset-0', { timeout: 5000 });
      console.log('8. Modal appeared!');
      
      // Get modal title
      const modalTitle = await page.locator('h2').first().textContent();
      console.log('9. Modal title:', modalTitle);
      
      // Check all buttons in the modal
      console.log('10. Checking modal buttons...');
      const modalButtons = await page.locator('.fixed.inset-0 button').allTextContents();
      const visibleButtons = modalButtons.filter(text => text && text.trim());
      console.log('    Modal buttons found:', visibleButtons);
      
      // Look specifically for "Save as Draft" button
      const saveAsDraftInModal = page.locator('.fixed.inset-0 button:has-text("Save as Draft")');
      const saveAsDraftExists = await saveAsDraftInModal.count() > 0;
      console.log('11. "Save as Draft" button in modal:', saveAsDraftExists);
      
      // Look for Continue Editing button
      const continueEditingButton = page.locator('.fixed.inset-0 button:has-text("Continue Editing")');
      const continueExists = await continueEditingButton.count() > 0;
      console.log('12. "Continue Editing" button in modal:', continueExists);
      
      // Look for the main action button (resubmit)
      const mainActionButton = page.locator('.fixed.inset-0 button:has-text("Save & Resubmit"), .fixed.inset-0 button:has-text("Save & Request")');
      const mainActionExists = await mainActionButton.count() > 0;
      console.log('13. Main action button in modal:', mainActionExists);
      
      if (mainActionExists) {
        const mainActionText = await mainActionButton.textContent();
        console.log('    Main action text:', mainActionText);
      }
      
      if (saveAsDraftExists) {
        console.log('14. ✅ SUCCESS! Save as Draft option is now available in the resubmit modal!');
        console.log('    This means users can save changes without immediately resubmitting for review.');
      } else {
        console.log('14. ❌ Save as Draft option is not showing in the modal');
      }
      
      console.log('15. Modal layout summary:');
      console.log(`    - Continue Editing: ${continueExists ? '✅' : '❌'}`);
      console.log(`    - Save as Draft: ${saveAsDraftExists ? '✅' : '❌'}`); 
      console.log(`    - Main Action: ${mainActionExists ? '✅' : '❌'}`);
      
    } else {
      console.log('7. Resubmit button not found');
    }
    
    console.log('Keeping browser open for 45 seconds for inspection...');
    await page.waitForTimeout(45000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/resubmit_modal_error.png', fullPage: true });
  }
  
  await browser.close();
})();