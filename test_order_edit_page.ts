import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false, // Show browser so we can see what's happening
    slowMo: 1000 // Slow down actions
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
    
    // Take a screenshot for reference
    await page.screenshot({ path: '/tmp/order_edit_page.png', fullPage: true });
    
    // Extract some data from the page to verify it loaded correctly
    const pageData = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent?.trim();
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(el => 
        el.textContent?.includes('Edit')).length;
      const setupButtons = Array.from(document.querySelectorAll('button, a')).filter(el => 
        el.textContent?.includes('Setup')).length;
      const targetInputs = document.querySelectorAll('input[placeholder*="target"], input[placeholder*="URL"], input[placeholder*="Target"]').length;
      const anchorInputs = document.querySelectorAll('input[placeholder*="anchor"], input[placeholder*="text"], input[placeholder*="Anchor"]').length;
      
      return {
        title,
        editButtons,
        setupButtons,
        targetInputs,
        anchorInputs,
        url: window.location.href,
        pageContent: document.body.textContent?.substring(0, 200) + '...'
      };
    });
    
    console.log('6. Page data extracted:', JSON.stringify(pageData, null, 2));
    
    // Keep browser open for a few seconds to see the result
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/error_screenshot.png', fullPage: true });
  }
  
  await browser.close();
})();