import { test, expect } from '@playwright/test';

test.describe('Publisher Navigation', () => {
  // Login once before all tests
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/publisher/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', 'test.publisher@example.com');
    await page.fill('input#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForTimeout(2000);
  });

  test('should show navigation menu after login', async ({ page }) => {
    // Check if we're on the dashboard
    const url = page.url();
    console.log('Current URL:', url);
    
    // Check for navigation items (use first() to avoid duplicate issue)
    await expect(page.locator('nav a:has-text("Dashboard")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("My Websites")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("Offerings")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("Orders")').first()).toBeVisible();
    
    console.log('✅ Navigation menu is visible');
  });

  test('should navigate to websites page', async ({ page }) => {
    // Click on My Websites
    await page.locator('nav a:has-text("My Websites")').first().click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Check URL
    await expect(page).toHaveURL(/\/publisher\/websites/);
    
    // Check for page content
    const pageTitle = await page.textContent('h1');
    console.log('Page title:', pageTitle);
    
    console.log('✅ Navigated to websites page');
  });

  test('should navigate to offerings page', async ({ page }) => {
    // Click on Offerings
    await page.locator('nav a:has-text("Offerings")').first().click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Check URL
    await expect(page).toHaveURL(/\/publisher\/offerings/);
    
    // Check for page content
    const pageTitle = await page.textContent('h1');
    console.log('Page title:', pageTitle);
    
    console.log('✅ Navigated to offerings page');
  });
});