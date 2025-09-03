import { test, expect } from '@playwright/test';

test.describe('Login Authentication Test', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    // Navigate directly to admin page (should redirect to login)
    await page.goto('/admin/manyreach-import');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
    console.log('✓ Redirected to login page');
    
    // Fill in login credentials
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'password123');
    console.log('✓ Filled in credentials');
    
    // Click login button
    await page.click('button[type="submit"]');
    console.log('✓ Clicked login button');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // Should now be on admin page
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Check if we're on the admin page
    await expect(page).toHaveURL(/.*\/admin\/manyreach-import/);
    console.log('✓ Successfully redirected to admin page');
    
    // Verify we can see the page title
    await expect(page.locator('h1')).toContainText('ManyReach Import');
    console.log('✓ Page title found - login successful!');
  });
});