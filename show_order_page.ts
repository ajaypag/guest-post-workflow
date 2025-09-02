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
    
    // Wait for navigation after login
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
    console.log('4. Login successful, navigating to order page...');
    
    await page.goto('http://localhost:3003/orders/474e3625-4140-4919-870e-94497bc81202');
    await page.waitForLoadState('networkidle');
    
    console.log('5. Order page loaded - checking current status...');
    
    // Get the order status from the page
    const statusInfo = await page.evaluate(() => {
      // Look for status indicators
      const statusCards = document.querySelectorAll('[class*="bg-yellow"], [class*="bg-blue"], [class*="bg-green"]');
      const statusText = Array.from(statusCards).map(card => card.textContent?.trim()).filter(Boolean);
      
      // Look for specific text that indicates order status
      const bodyText = document.body.textContent || '';
      const hasAwaitingConfirmation = bodyText.includes('Awaiting Confirmation') || bodyText.includes('awaiting confirmation');
      const hasPendingConfirmation = bodyText.includes('pending_confirmation');
      const hasSubmitted = bodyText.includes('submitted');
      
      // Get all headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean);
      
      return {
        statusCards: statusText,
        hasAwaitingConfirmation,
        hasPendingConfirmation,
        hasSubmitted,
        headings,
        url: window.location.href
      };
    });
    
    console.log('6. Order status info:', JSON.stringify(statusInfo, null, 2));
    
    // Look for edit buttons specifically
    const editButtons = await page.locator('a:has-text("Edit"), button:has-text("Edit")').all();
    console.log('7. Found', editButtons.length, 'edit elements:');
    
    for (let i = 0; i < editButtons.length; i++) {
      const element = editButtons[i];
      const text = await element.textContent();
      const href = await element.getAttribute('href');
      const classes = await element.getAttribute('class');
      console.log(`   ${i + 1}. "${text}" - href: ${href}`);
      console.log(`      classes: ${classes}`);
    }
    
    console.log('\n8. Page is now open - you can inspect it!');
    console.log('   URL:', statusInfo.url);
    console.log('\n   Keeping browser open for 5 minutes for inspection...');
    
    // Keep the browser open for 5 minutes so you can inspect
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('Error:', error);
    // Even if there's an error, keep browser open for inspection
    await page.waitForTimeout(60000);
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
})();