import { test, expect } from '@playwright/test';

test.describe('Simple Authentication Test', () => {
  const adminEmail = 'ajay@outreachlabs.com';
  const adminPassword = 'FA64!I$nrbCauS^d';
  const baseURL = 'http://localhost:3001';

  test('Admin can login and navigate', async ({ page }) => {
    console.log('Starting simple auth test...');
    
    // Go to login page
    await page.goto(`${baseURL}/login`);
    console.log('On login page');
    
    // Fill form
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    console.log('Filled login form');
    
    // Submit
    await page.click('button[type="submit"]');
    console.log('Submitted form, waiting for navigation...');
    
    // Wait for any navigation
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    
    // Should not be on login page anymore
    expect(currentUrl).not.toContain('/login');
    
    // Try to navigate to accounts
    console.log('Navigating to accounts page...');
    await page.goto(`${baseURL}/accounts`);
    await page.waitForLoadState('networkidle');
    
    const accountsUrl = page.url();
    console.log(`Accounts page URL: ${accountsUrl}`);
    
    // Should be on accounts page, not redirected to login
    expect(accountsUrl).toContain('/accounts');
    
    // Check for impersonate buttons
    const impersonateButtons = await page.locator('button:has-text("Impersonate")').count();
    console.log(`Found ${impersonateButtons} impersonate buttons`);
    
    // Click first impersonate button if available
    if (impersonateButtons > 0) {
      console.log('Clicking impersonate button...');
      
      // Set up dialog handler before clicking
      page.once('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        await dialog.accept();
      });
      
      await page.locator('button:has-text("Impersonate")').first().click();
      
      // Wait a bit for redirect
      await page.waitForTimeout(5000);
      
      const afterImpersonateUrl = page.url();
      console.log(`URL after impersonate: ${afterImpersonateUrl}`);
      
      // Check for impersonation banner
      const bannerVisible = await page.locator('text="Viewing as"').isVisible().catch(() => false);
      console.log(`Impersonation banner visible: ${bannerVisible}`);
      
      if (bannerVisible) {
        // Try to end impersonation
        console.log('Ending impersonation...');
        await page.locator('button:has-text("End")').first().click();
        await page.waitForTimeout(3000);
        
        const afterEndUrl = page.url();
        console.log(`URL after ending impersonation: ${afterEndUrl}`);
      }
    }
    
    console.log('Test completed');
  });
});