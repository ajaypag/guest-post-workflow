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
    
    console.log('2. Navigating to order edit page...');
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202/edit');
    await page.waitForLoadState('networkidle');
    
    console.log('3. Order edit page loaded, checking all buttons...');
    
    // Get all buttons on the page
    const allButtons = await page.locator('button').all();
    console.log('4. Found', allButtons.length, 'buttons:');
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      console.log(`   ${i + 1}. "${text}" (visible: ${isVisible}, enabled: ${isEnabled})`);
    }
    
    // Also check for any text that might indicate the order status
    console.log('5. Checking page content for status information...');
    const pageText = await page.textContent('body');
    
    if (pageText?.includes('Save changes')) {
      console.log('   "Save changes" text found on page');
    }
    if (pageText?.includes('resubmit')) {
      console.log('   "resubmit" text found on page');
    }
    if (pageText?.includes('pending_confirmation')) {
      console.log('   "pending_confirmation" text found on page');
    }
    if (pageText?.includes('confirmed')) {
      console.log('   "confirmed" text found on page');  
    }
    
    console.log('6. Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();