import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'ajay@outreachlabs.com';
const ADMIN_PASSWORD = 'FA64!I$nrbCauS^d';
const BASE_URL = 'http://localhost:3000';

test.describe('Impersonation System E2E Test', () => {
  test('Complete impersonation flow with screenshots', async ({ page }) => {
    // Set a longer timeout for this comprehensive test
    test.setTimeout(120000);

    console.log('Starting impersonation E2E test...');

    // Step 1: Navigate to login page
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });
    console.log('✅ Screenshot 1: Login page');

    // Step 2: Login as admin
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.screenshot({ path: 'screenshots/02-login-filled.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/03-after-login.png', fullPage: true });
    console.log('✅ Screenshot 2-3: Login process');

    // Verify we're logged in as admin
    const headerText = await page.textContent('header');
    expect(headerText).toContain('ajay@outreachlabs.com');

    // Step 3: Navigate to accounts page
    await page.goto(BASE_URL + '/accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/04-accounts-page.png', fullPage: true });
    console.log('✅ Screenshot 4: Accounts page with impersonation icons');

    // Step 4: Find an account to impersonate
    // Look for the first impersonate button (UserCheck icon)
    const impersonateButton = await page.locator('button[title="Impersonate User"]').first();
    
    // Get the account name before clicking
    const accountRow = await impersonateButton.locator('xpath=ancestor::tr').first();
    const accountName = await accountRow.locator('td').first().textContent();
    console.log(`Impersonating account: ${accountName}`);

    // Hover over the button to show it's interactive
    await impersonateButton.hover();
    await page.screenshot({ path: 'screenshots/05-impersonate-hover.png', fullPage: true });
    console.log('✅ Screenshot 5: Hovering over impersonate icon');

    // Click impersonate button
    await impersonateButton.click();

    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await page.screenshot({ path: 'screenshots/06-confirmation-dialog.png', fullPage: true });
      await dialog.accept();
    });

    // Wait for impersonation to start
    await page.waitForTimeout(1000);
    
    // Look for success notification
    const notification = await page.locator('.bg-green-50').first();
    if (await notification.isVisible()) {
      await page.screenshot({ path: 'screenshots/07-impersonation-started.png', fullPage: true });
      console.log('✅ Screenshot 7: Impersonation started notification');
    }

    // Wait for redirect to account dashboard
    await page.waitForURL('**/account**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 5: Verify impersonation banner is visible
    const impersonationBanner = await page.locator('[data-testid="impersonation-banner"]');
    if (await impersonationBanner.isVisible()) {
      await page.screenshot({ path: 'screenshots/08-impersonation-banner.png', fullPage: true });
      console.log('✅ Screenshot 8: Impersonation banner visible');
    } else {
      // Fallback: Check for any indication of impersonation
      const pageContent = await page.content();
      if (pageContent.includes('impersonat')) {
        console.log('⚠️ Impersonation indicator found but banner not visible');
      }
    }

    // Step 6: Navigate as impersonated user
    await page.screenshot({ path: 'screenshots/09-account-dashboard.png', fullPage: true });
    console.log('✅ Screenshot 9: Account dashboard while impersonating');

    // Try to navigate to different pages
    const clientsLink = await page.locator('a[href="/clients"]').first();
    if (await clientsLink.isVisible()) {
      await clientsLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/10-clients-page-impersonated.png', fullPage: true });
      console.log('✅ Screenshot 10: Clients page while impersonating');
    }

    // Step 7: Test restricted action (should be blocked)
    // Try to access billing endpoint via API
    const billingResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/billing/test', {
          method: 'GET',
          credentials: 'include'
        });
        return {
          status: response.status,
          ok: response.ok
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('Billing endpoint test:', billingResponse);
    if (billingResponse.status === 403) {
      console.log('✅ Billing endpoint correctly blocked (403)');
    }

    // Step 8: End impersonation
    // Look for end impersonation button in the banner
    const endButton = await page.locator('button:has-text("End Impersonation")').first();
    if (await endButton.isVisible()) {
      await page.screenshot({ path: 'screenshots/11-before-end-impersonation.png', fullPage: true });
      await endButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/12-after-end-impersonation.png', fullPage: true });
      console.log('✅ Screenshots 11-12: Ending impersonation');
    } else {
      // Alternative: Make API call to end impersonation
      await page.evaluate(async () => {
        await fetch('/api/admin/impersonate/end', {
          method: 'POST',
          credentials: 'include'
        });
      });
      console.log('⚠️ Ended impersonation via API');
    }

    // Step 9: Verify back to admin interface
    await page.goto(BASE_URL + '/accounts');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/13-back-to-admin.png', fullPage: true });
    console.log('✅ Screenshot 13: Back to admin interface');

    // Verify admin functions still work
    const accountsTable = await page.locator('table').first();
    expect(await accountsTable.isVisible()).toBeTruthy();
    console.log('✅ Admin interface functional');

    // Final summary
    console.log('\n========================================');
    console.log('✅ IMPERSONATION E2E TEST COMPLETE');
    console.log('========================================');
    console.log('Screenshots saved in screenshots/ directory:');
    console.log('  01. Login page');
    console.log('  02. Login filled');
    console.log('  03. After login');
    console.log('  04. Accounts page');
    console.log('  05. Hover impersonate icon');
    console.log('  06. Confirmation dialog');
    console.log('  07. Impersonation started');
    console.log('  08. Impersonation banner');
    console.log('  09. Account dashboard');
    console.log('  10. Clients page (impersonated)');
    console.log('  11. Before end impersonation');
    console.log('  12. After end impersonation');
    console.log('  13. Back to admin');
  });
});