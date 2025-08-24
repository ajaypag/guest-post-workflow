import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'test123';
const BASE_URL = 'http://localhost:3001';

test.describe('Simple Accounts Test', () => {
  test('Load accounts page and inspect what renders', async ({ page }) => {
    test.setTimeout(60000);

    // Listen for all network requests
    page.on('response', response => {
      console.log(`${response.status()} ${response.url()}`);
    });

    // Listen for console logs
    page.on('console', msg => {
      console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
    });

    // Step 1: Login
    await page.goto(BASE_URL + '/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Step 2: Go to accounts page
    console.log('🔍 Navigating to accounts page...');
    await page.goto(BASE_URL + '/accounts');
    
    // Wait a moment for the page to load
    await page.waitForTimeout(5000);

    // Step 3: Check what's actually rendered
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    const bodyText = await page.locator('body').textContent();
    console.log(`Body contains "Account Management": ${bodyText?.includes('Account Management')}`);
    console.log(`Body contains "Accounts": ${bodyText?.includes('Accounts')}`);
    console.log(`Body contains "Loading": ${bodyText?.includes('Loading')}`);
    console.log(`Body contains "Error": ${bodyText?.includes('Error')}`);

    // Check for specific elements
    const hasHeader = await page.locator('header').isVisible();
    const hasTable = await page.locator('table').isVisible();
    const hasAccountsHeader = await page.locator('h1:has-text("Account Management")').isVisible();
    
    console.log(`Header visible: ${hasHeader}`);
    console.log(`Table visible: ${hasTable}`);
    console.log(`Accounts header visible: ${hasAccountsHeader}`);

    // Count different elements
    const buttonCount = await page.locator('button').count();
    const linkCount = await page.locator('a').count();
    const divCount = await page.locator('div').count();

    console.log(`Elements: ${buttonCount} buttons, ${linkCount} links, ${divCount} divs`);

    // Take screenshot for analysis
    await page.screenshot({ path: 'screenshots/accounts-debug.png', fullPage: true });
    console.log('📸 Screenshot saved to screenshots/accounts-debug.png');

    // Check network requests that were made
    console.log('🔍 Test completed - check console output above for details');
  });
});