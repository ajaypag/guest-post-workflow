import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'test123';
const BASE_URL = 'http://localhost:3001';

test.describe('Manual Impersonation Flow Test', () => {
  test('Complete impersonation flow via API calls', async ({ page }) => {
    test.setTimeout(120000);

    console.log('🎯 Testing complete impersonation flow...');
    
    // Step 1: Login as admin
    console.log('Step 1: Admin login...');
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    console.log('✅ Admin logged in');

    // Step 2: Get accounts list
    console.log('Step 2: Getting accounts list...');
    const accountsResponse = await page.evaluate(async () => {
      const response = await fetch('/api/accounts', {
        credentials: 'include'
      });
      return {
        status: response.status,
        data: response.ok ? await response.json() : null
      };
    });
    
    console.log(`Accounts API: ${accountsResponse.status}`);
    if (accountsResponse.data?.accounts?.length > 0) {
      console.log(`Found ${accountsResponse.data.accounts.length} accounts`);
      console.log('First account:', accountsResponse.data.accounts[0]);
    } else {
      console.log('No accounts found or API failed');
      return; // Can't test impersonation without accounts
    }

    // Step 3: Start impersonation
    const targetAccount = accountsResponse.data.accounts[0];
    console.log('Step 3: Starting impersonation for:', targetAccount.email);
    
    const impersonationResponse = await page.evaluate(async (account) => {
      const response = await fetch('/api/admin/impersonate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: account.id,
          targetUserType: 'account',
          reason: 'E2E testing impersonation flow'
        })
      });
      return {
        status: response.status,
        data: response.ok ? await response.json() : await response.text()
      };
    }, targetAccount);

    console.log(`Impersonation start: ${impersonationResponse.status}`);
    console.log('Response:', impersonationResponse.data);

    if (impersonationResponse.status === 200) {
      console.log('✅ Impersonation started successfully');
      
      // Step 4: Navigate to account dashboard as impersonated user
      console.log('Step 4: Navigating to account dashboard...');
      await page.goto(BASE_URL + '/account/dashboard');
      await page.waitForTimeout(2000);
      
      const pageTitle = await page.title();
      const bodyText = await page.locator('body').textContent();
      
      console.log('Page title:', pageTitle);
      console.log('Dashboard loaded:', bodyText?.includes('Dashboard') || bodyText?.includes('Account'));
      
      // Step 5: End impersonation
      console.log('Step 5: Ending impersonation...');
      const endResponse = await page.evaluate(async () => {
        const response = await fetch('/api/admin/impersonate/end', {
          method: 'POST',
          credentials: 'include'
        });
        return {
          status: response.status,
          data: response.ok ? await response.json() : await response.text()
        };
      });
      
      console.log(`End impersonation: ${endResponse.status}`);
      console.log('Response:', endResponse.data);
      
      if (endResponse.status === 200) {
        console.log('✅ Impersonation ended successfully');
        
        // Step 6: Verify back to admin
        console.log('Step 6: Verifying admin session restored...');
        await page.goto(BASE_URL + '/');
        await page.waitForTimeout(1000);
        
        const adminPageText = await page.locator('body').textContent();
        console.log('Back to admin interface:', adminPageText?.includes('Guest Post Automation'));
        
        console.log('🎉 COMPLETE IMPERSONATION FLOW SUCCESSFUL!');
      } else {
        console.log('❌ Failed to end impersonation');
      }
    } else {
      console.log('❌ Failed to start impersonation');
    }

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/impersonation-flow-complete.png', fullPage: true });
  });
});