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
    console.log('4. Login successful, navigating to vetted sites...');
    
    await page.goto('http://localhost:3003/vetted-sites');
    await page.waitForLoadState('networkidle');
    
    console.log('5. Looking for resident.com checkbox...');
    
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for resident.com in the table and click its checkbox
    const residentRow = page.locator('tr:has-text("resident.com")');
    if (await residentRow.count() > 0) {
      console.log('6. Found resident.com, clicking checkbox...');
      const checkbox = residentRow.locator('input[type="checkbox"]').first();
      await checkbox.click();
      
      console.log('7. Clicking Create Order button...');
      await page.click('text=Create Order');
      
      // Wait for the modal to appear
      await page.waitForSelector('text=Create Quick Order', { timeout: 5000 });
      
      console.log('8. Modal appeared, checking data...');
      
      // Screenshot the modal
      await page.screenshot({ path: '/tmp/modal_screenshot.png', fullPage: true });
      
      // Extract the data from the modal
      const modalData = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="domain-config-card"]') || 
                     document.querySelector('.bg-white.shadow-sm');
        if (!modal) return { error: 'Modal not found' };
        
        const domainName = modal.querySelector('.text-lg.font-medium')?.textContent?.trim();
        const metricsText = modal.querySelector('.text-sm.text-gray-500')?.textContent?.trim();
        const priceText = modal.querySelector('.text-lg.font-semibold')?.textContent?.trim();
        
        return {
          domainName,
          metricsText,
          priceText,
          fullModalHTML: modal.innerHTML.substring(0, 500) // First 500 chars for debugging
        };
      });
      
      console.log('9. Modal data extracted:', JSON.stringify(modalData, null, 2));
      
      // Keep browser open for a few seconds to see the result
      await page.waitForTimeout(5000);
      
    } else {
      console.log('6. ERROR: resident.com not found in table');
      
      // Let's see what domains are available
      const domains = await page.evaluate(() => {
        const rows = document.querySelectorAll('tr');
        const domainList: string[] = [];
        rows.forEach(row => {
          const text = row.textContent || '';
          if (text.includes('.com') || text.includes('.org') || text.includes('.net')) {
            domainList.push(text.substring(0, 200));
          }
        });
        return domainList.slice(0, 5); // First 5 domains
      });
      
      console.log('Available domains:', domains);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/error_screenshot.png', fullPage: true });
  }
  
  await browser.close();
})();