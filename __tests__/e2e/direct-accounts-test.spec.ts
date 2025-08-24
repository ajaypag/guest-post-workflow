import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Direct Accounts Test', () => {
  test('Load accounts page directly without login', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Testing direct accounts page access...');
    
    // Listen for network requests
    page.on('response', response => {
      if (response.url().includes('/accounts') || response.url().includes('page_tsx')) {
        console.log(`${response.status()} ${response.url()}`);
      }
    });

    // Listen for console logs
    page.on('console', msg => {
      if (msg.text().includes('TEST AccountsPage') || msg.text().includes('WorkflowListEnhanced')) {
        console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
      }
    });

    // Step 1: Navigate directly to accounts page
    console.log('🔍 Navigating directly to /accounts...');
    await page.goto(BASE_URL + '/accounts', { waitUntil: 'load', timeout: 30000 });
    
    // Wait a moment for any redirects or rendering
    await page.waitForTimeout(3000);

    // Step 2: Check page title and content
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    const bodyText = await page.locator('body').textContent();
    const hasTestAccounts = bodyText?.includes('TEST ACCOUNTS PAGE');
    const hasWorkflowText = bodyText?.includes('Guest Post Automation Platform');
    const hasLoginText = bodyText?.includes('Log in to your account');
    
    console.log(`Has "TEST ACCOUNTS PAGE": ${hasTestAccounts}`);
    console.log(`Has workflow homepage text: ${hasWorkflowText}`);
    console.log(`Has login text (redirected): ${hasLoginText}`);

    // Step 3: Take screenshot
    await page.screenshot({ path: 'screenshots/direct-accounts-test.png', fullPage: true });
    console.log('📸 Screenshot saved to screenshots/direct-accounts-test.png');

    console.log('✅ Direct accounts test completed');
  });
});