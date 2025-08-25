import { test, expect } from '@playwright/test';

test.describe('Full Authentication and Impersonation Test', () => {
  const adminEmail = 'ajay@outreachlabs.com';
  const adminPassword = 'FA64!I$nrbCauS^d';
  const baseURL = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto(baseURL);
  });

  test('01. Admin login should work', async ({ page }) => {
    console.log('Testing admin login...');
    
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    
    // Fill in login form
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation (internal users go to homepage)
    await page.waitForNavigation({ timeout: 10000 });
    
    // Verify we're logged in - check URL
    const pageUrl = page.url();
    console.log(`Redirected to: ${pageUrl}`);
    
    // Internal users should be on homepage after login
    expect(pageUrl).toBe(`${baseURL}/`);
    
    // Check for header elements
    await expect(page.locator('text="Internal Portal"').first()).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Admin login successful');
  });

  test('02. Navigate to accounts page and check for impersonation buttons', async ({ page }) => {
    console.log('Testing accounts page...');
    
    // Login first
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    
    // Navigate to accounts page
    await page.goto(`${baseURL}/accounts`);
    
    // Wait for accounts to load
    await page.waitForSelector('h1:has-text("External Accounts")', { timeout: 10000 });
    
    // Check if impersonation buttons exist
    const impersonateButtons = page.locator('button:has-text("Impersonate")');
    const buttonCount = await impersonateButtons.count();
    
    console.log(`Found ${buttonCount} impersonation buttons`);
    expect(buttonCount).toBeGreaterThan(0);
    
    console.log('✅ Accounts page loaded with impersonation buttons');
  });

  test('03. Test account impersonation flow', async ({ page }) => {
    console.log('Testing account impersonation...');
    
    // Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/clients', { timeout: 10000 });
    
    // Go to accounts page
    await page.goto(`${baseURL}/accounts`);
    await page.waitForSelector('h1:has-text("External Accounts")', { timeout: 10000 });
    
    // Click first impersonate button
    const firstImpersonateButton = page.locator('button:has-text("Impersonate")').first();
    
    // Get the account email we're impersonating
    const accountRow = firstImpersonateButton.locator('xpath=ancestor::tr').first();
    const accountEmail = await accountRow.locator('td').nth(1).textContent();
    console.log(`Impersonating account: ${accountEmail}`);
    
    // Start impersonation
    await firstImpersonateButton.click();
    
    // Handle alert
    page.once('dialog', async dialog => {
      console.log(`Alert message: ${dialog.message()}`);
      await dialog.accept();
    });
    
    // Wait for redirect to account dashboard
    await page.waitForURL('**/account/dashboard', { timeout: 15000 });
    
    // Check for impersonation banner
    await expect(page.locator('text="Viewing as"').first()).toBeVisible({ timeout: 5000 });
    
    // Check we're on account dashboard
    expect(page.url()).toContain('/account/dashboard');
    
    console.log('✅ Account impersonation successful');
  });

  test('04. Test ending impersonation', async ({ page }) => {
    console.log('Testing end impersonation...');
    
    // Login and start impersonation
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/clients', { timeout: 10000 });
    
    await page.goto(`${baseURL}/accounts`);
    await page.waitForSelector('h1:has-text("External Accounts")', { timeout: 10000 });
    
    const firstImpersonateButton = page.locator('button:has-text("Impersonate")').first();
    await firstImpersonateButton.click();
    
    // Handle alert
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    await page.waitForURL('**/account/dashboard', { timeout: 15000 });
    
    // Now end impersonation
    const endButton = page.locator('button:has-text("End")').first();
    await endButton.click();
    
    // Should redirect back to accounts page
    await page.waitForURL('**/accounts', { timeout: 10000 });
    
    // Banner should be gone
    await expect(page.locator('text="Viewing as"')).not.toBeVisible();
    
    console.log('✅ End impersonation successful');
  });

  test('05. Navigate to publishers page and check impersonation', async ({ page }) => {
    console.log('Testing publishers page...');
    
    // Login first
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    
    // Navigate to publishers page
    await page.goto(`${baseURL}/internal/publishers`);
    
    // Wait for publishers page to load
    await page.waitForSelector('h1:has-text("Publisher Management")', { timeout: 10000 });
    
    // Check if impersonation buttons exist
    const impersonateButtons = page.locator('button:has-text("Impersonate")');
    const buttonCount = await impersonateButtons.count();
    
    console.log(`Found ${buttonCount} publisher impersonation buttons`);
    
    // If there are publishers, test impersonation
    if (buttonCount > 0) {
      const firstButton = impersonateButtons.first();
      await firstButton.click();
      
      // Handle alert
      page.once('dialog', async dialog => {
        console.log(`Publisher impersonation alert: ${dialog.message()}`);
        await dialog.accept();
      });
      
      // Wait for redirect to publisher dashboard
      await page.waitForURL('**/publisher/dashboard', { timeout: 15000 });
      
      // Check for impersonation banner
      await expect(page.locator('text="Viewing as"').first()).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Publisher impersonation successful');
    } else {
      console.log('⚠️ No publishers found to test impersonation');
    }
  });

  test('06. Test cookie persistence after page refresh', async ({ page }) => {
    console.log('Testing session persistence...');
    
    // Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('text="Internal Portal"').first()).toBeVisible({ timeout: 5000 });
    
    // Navigate to another page
    await page.goto(`${baseURL}/accounts`);
    
    // Should not redirect to login
    expect(page.url()).toContain('/accounts');
    await expect(page.locator('h1:has-text("External Accounts")')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Session persistence working');
  });

  test('07. Test logout functionality', async ({ page }) => {
    console.log('Testing logout...');
    
    // Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    
    // Find and click logout button
    const userMenuButton = page.locator('button').filter({ hasText: /ajay@outreachlabs\.com/i }).first();
    await userMenuButton.click();
    
    const logoutButton = page.locator('text="Logout"').first();
    await logoutButton.click();
    
    // Should redirect to login page
    await page.waitForURL('**/login', { timeout: 10000 });
    
    // Try to access protected page
    await page.goto(`${baseURL}/accounts`);
    
    // Should redirect back to login
    await page.waitForURL('**/login', { timeout: 5000 });
    
    console.log('✅ Logout successful');
  });

  test('08. Test API authorization with session', async ({ page }) => {
    console.log('Testing API authorization...');
    
    // Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    
    // Test API call
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/accounts', {
        credentials: 'include'
      });
      return {
        status: res.status,
        ok: res.ok
      };
    });
    
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    
    console.log('✅ API authorization working');
  });

  test('09. Test multiple impersonation attempts', async ({ page }) => {
    console.log('Testing multiple impersonations...');
    
    // Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    
    // Start first impersonation
    await page.goto(`${baseURL}/accounts`);
    await page.waitForSelector('h1:has-text("External Accounts")', { timeout: 10000 });
    
    const firstButton = page.locator('button:has-text("Impersonate")').first();
    await firstButton.click();
    
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    await page.waitForURL('**/account/dashboard', { timeout: 15000 });
    
    // Try to navigate to accounts page while impersonating
    await page.goto(`${baseURL}/accounts`);
    
    // Should still show impersonation banner
    await expect(page.locator('text="Viewing as"').first()).toBeVisible({ timeout: 5000 });
    
    // End impersonation
    const endButton = page.locator('button:has-text("End")').first();
    await endButton.click();
    
    await page.waitForURL('**/accounts', { timeout: 10000 });
    
    // Start second impersonation
    const secondButton = page.locator('button:has-text("Impersonate")').nth(1);
    if (await secondButton.count() > 0) {
      await secondButton.click();
      
      page.once('dialog', async dialog => {
        await dialog.accept();
      });
      
      await page.waitForURL('**/account/dashboard', { timeout: 15000 });
      
      console.log('✅ Multiple impersonations working');
    } else {
      console.log('⚠️ Only one account available for testing');
    }
  });

  test('10. Check for console errors', async ({ page }) => {
    console.log('Checking for console errors...');
    
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Login and navigate through the app
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/clients', { timeout: 10000 });
    
    await page.goto(`${baseURL}/accounts`);
    await page.waitForTimeout(2000);
    
    await page.goto(`${baseURL}/internal/publishers`);
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('❌ Console errors found:');
      errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No console errors found');
    }
    
    expect(errors.length).toBe(0);
  });
});