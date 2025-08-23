import { test, expect } from '@playwright/test';

test.describe('Vetted Sites Pagination', () => {
  test('pagination should work without page refresh', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3004/login');
    
    // Fill in login form
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or vetted-sites
    await page.waitForNavigation();
    
    // Navigate to vetted sites
    await page.goto('http://localhost:3004/vetted-sites');
    
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check initial state - should be on page 1
    const url1 = page.url();
    console.log('Initial URL:', url1);
    
    // Count initial rows
    const initialRows = await page.locator('tbody tr').count();
    console.log('Initial row count:', initialRows);
    
    // Click page 2
    console.log('Clicking page 2...');
    await page.click('button:has-text("2")');
    
    // Wait a moment for the update
    await page.waitForTimeout(2000);
    
    // Check if URL changed
    const url2 = page.url();
    console.log('URL after clicking page 2:', url2);
    expect(url2).toContain('page=2');
    
    // Check if content changed
    const page2Rows = await page.locator('tbody tr').count();
    console.log('Page 2 row count:', page2Rows);
    
    // Try clicking back to page 1
    console.log('Clicking page 1...');
    await page.click('button:has-text("1")');
    
    await page.waitForTimeout(2000);
    
    const url3 = page.url();
    console.log('URL after clicking page 1:', url3);
    
    const page1RowsAgain = await page.locator('tbody tr').count();
    console.log('Page 1 row count (second time):', page1RowsAgain);
    
    // Check if we're back to the initial state
    expect(page1RowsAgain).toBe(initialRows);
  });
});