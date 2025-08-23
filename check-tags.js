const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to the bulk analysis page
    console.log('Navigating to bulk analysis page...');
    await page.goto('http://localhost:3000/clients/aca65919-c0f9-49d0-888b-2c488f7580dc/bulk-analysis');
    await page.waitForLoadState('networkidle');
    
    // Check for target-page tags
    const targetPageElements = await page.$$('text=/target-page:/');
    console.log(`\nFound ${targetPageElements.length} elements with "target-page:" text`);
    
    if (targetPageElements.length > 0) {
      console.log('\nSample tags found:');
      for (let i = 0; i < Math.min(3, targetPageElements.length); i++) {
        const text = await targetPageElements[i].textContent();
        console.log(`  - ${text}`);
        
        // Check if it's still an ID or now a URL
        if (text.includes('http')) {
          console.log('    ✅ This is a URL (fixed!)');
        } else if (text.match(/[0-9a-f]{8}-[0-9a-f]{4}/)) {
          console.log('    ❌ This is still an ID');
        }
      }
    } else {
      console.log('✅ No target-page tags found (might be good if no projects exist)');
    }
    
    // Check for order-group tags
    const orderGroupElements = await page.$$('text=/order-group:/');
    if (orderGroupElements.length > 0) {
      console.log(`\n❌ Still found ${orderGroupElements.length} elements with "order-group:" (legacy system)`);
    } else {
      console.log('\n✅ No order-group tags found (good!)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();