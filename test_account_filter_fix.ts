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
    
    // Look for account dropdown
    const accountDropdown = page.locator('[data-testid="account-dropdown"], .searchable-account-dropdown, input[placeholder*="account"], input[placeholder*="Account"]').first();
    const accountDropdownExists = await accountDropdown.count() > 0;
    console.log('6. Account dropdown found:', accountDropdownExists);
    
    if (accountDropdownExists) {
      // Test account selection
      console.log('7. Testing account selection...');
      
      // Get initial client count
      const initialClientCount = await page.evaluate(() => {
        const clientElements = document.querySelectorAll('[data-client-id], .client-item, .brand-item');
        return clientElements.length;
      });
      console.log('   Initial client count:', initialClientCount);
      
      // Try to select an account
      await accountDropdown.click();
      await page.waitForTimeout(1000);
      
      // Look for account options
      const accountOptions = page.locator('[role="option"], .dropdown-option, .account-option');
      const optionsCount = await accountOptions.count();
      console.log('   Account options found:', optionsCount);
      
      if (optionsCount > 0) {
        // Click the first account option
        await accountOptions.first().click();
        console.log('8. Selected first account, waiting for client list to update...');
        
        // Wait a moment for the client list to reload
        await page.waitForTimeout(3000);
        
        // Get updated client count
        const updatedClientCount = await page.evaluate(() => {
          const clientElements = document.querySelectorAll('[data-client-id], .client-item, .brand-item');
          return clientElements.length;
        });
        console.log('   Updated client count:', updatedClientCount);
        
        // Check if the count changed (indicating filtering worked)
        const filteringWorked = initialClientCount !== updatedClientCount;
        console.log('9. Account filtering working:', filteringWorked);
        
        if (!filteringWorked) {
          console.log('   WARNING: Client count did not change, filtering may not be working');
        }
        
        // Check for console logs that might indicate the fix is working
        const consoleLogs = await page.evaluate(() => {
          // Look for our debug message
          return window.console && window.console.log ? 'Console logging available' : 'No console logging';
        });
        console.log('   Console status:', consoleLogs);
        
      } else {
        console.log('8. No account options found in dropdown');
      }
    } else {
      console.log('7. No account dropdown found - this might be normal for account users');
    }
    
    // Take a screenshot for reference
    await page.screenshot({ path: '/tmp/account_filter_test.png', fullPage: true });
    
    console.log('10. Test completed, screenshot saved');
    
    // Keep browser open for a few seconds to see the result
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: '/tmp/error_screenshot.png', fullPage: true });
  }
  
  await browser.close();
})();