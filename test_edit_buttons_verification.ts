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
    
    await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
    
    console.log('2. Navigating to order details page...');
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202');
    await page.waitForLoadState('networkidle');
    
    // Check what edit buttons/links are available
    const editElements = await page.locator('a:has-text("Edit"), button:has-text("Edit")').all();
    console.log('3. Found', editElements.length, 'edit elements');
    
    for (let i = 0; i < editElements.length; i++) {
      const element = editElements[i];
      const text = await element.textContent();
      const href = await element.getAttribute('href');
      const isButton = await element.evaluate(el => el.tagName.toLowerCase() === 'button');
      
      console.log(`   Edit element ${i + 1}: "${text}" ${isButton ? '(button)' : `(link: ${href})`}`);
    }
    
    // Look specifically for "Edit Order" button/link
    const editOrderElement = page.locator('a:has-text("Edit Order"), button:has-text("Edit Order")').first();
    const editOrderExists = await editOrderElement.count() > 0;
    
    console.log('4. "Edit Order" element found:', editOrderExists);
    
    if (editOrderExists) {
      const href = await editOrderElement.getAttribute('href');
      console.log('   Edit Order href:', href);
      
      console.log('5. Testing Edit Order functionality...');
      await editOrderElement.click();
      
      // Wait for navigation or modal
      try {
        await page.waitForURL(/\/edit/, { timeout: 5000 });
        console.log('6. Successfully navigated to edit page');
      } catch (e) {
        console.log('6. Did not navigate to edit page, checking for modal or other response...');
        
        // Check if we're still on the same page but something happened
        const currentUrl = page.url();
        console.log('   Current URL:', currentUrl);
        
        // Look for any new content or changes
        const modalExists = await page.locator('.modal, [role="dialog"]').count();
        console.log('   Modal found:', modalExists > 0);
      }
    }
    
    // Check the order status on the page
    const statusText = await page.locator('h1, h2, h3').allTextContents();
    console.log('7. Page headings:', statusText.filter(text => text.includes('Order') || text.includes('Status')));
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/edit_buttons_verification.png', fullPage: true });
    console.log('8. Screenshot saved');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();