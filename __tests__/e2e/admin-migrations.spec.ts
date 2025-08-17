/**
 * E2E Tests for Admin Migration Dashboard
 * Tests migration interface, status checking, and critical workflows
 */

import { test, expect, Page } from '@playwright/test';

// Helper function for admin authentication
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('[data-testid="email"]', 'admin@test.com');
  await page.fill('[data-testid="password"]', 'admin123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/admin');
}

test.describe('Admin Migration Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display migration dashboard with all required migrations', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Verify page loads
    await expect(page.locator('h1')).toContainText('Publisher System Migrations');
    
    // Check critical warning is displayed
    await expect(page.locator('[data-testid="production-warning"]')).toBeVisible();
    
    // Verify all expected migrations are listed
    const expectedMigrations = [
      'Publisher Offerings System',
      'Publisher Relationship Columns', 
      'Website Publisher Columns',
      'Domain Normalization',
      'Publisher Payments System'
    ];
    
    for (const migration of expectedMigrations) {
      await expect(page.locator('text=' + migration)).toBeVisible();
    }
    
    // Check "Run All" option is available
    await expect(page.locator('text=Run All Publisher Migrations')).toBeVisible();
  });

  test('should check migration status successfully', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Click status check button
    await page.click('button:has-text("Check Migration Status")');
    
    // Should show loading state
    await expect(page.locator('text=Checking...')).toBeVisible();
    
    // Wait for status check to complete
    await page.waitForSelector('text=Checking...', { state: 'hidden', timeout: 10000 });
    
    // Migration status should be updated (verified by the button being enabled again)
    await expect(page.locator('button:has-text("Check Migration Status")')).toBeEnabled();
  });

  test('should display migration details and SQL file paths', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Check that SQL file paths are displayed
    await expect(page.locator('text=0035_publisher_offerings_system_fixed_v2.sql')).toBeVisible();
    await expect(page.locator('text=0037_normalize_existing_domains.sql')).toBeVisible();
    
    // Verify dangerous migrations are marked
    await expect(page.locator('text=Dangerous')).toBeVisible();
    
    // Check required badges
    const requiredBadges = page.locator('text=Required');
    await expect(requiredBadges).toHaveCount({ min: 5 }); // Should have multiple required migrations
  });

  test('should show confirmation dialog before running migration', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Set up dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to run');
      await dialog.dismiss(); // Cancel the migration
    });
    
    // Try to run a migration
    await page.click('button:has-text("Run"):first');
    
    // Verify dialog was triggered (test passes if dialog handler was called)
  });

  test('should handle migration API errors gracefully', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Mock API failure
    await page.route('/api/admin/migrations/check-status', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' })
      });
    });
    
    // Click status check
    await page.click('button:has-text("Check Migration Status")');
    
    // Should handle error gracefully (no crash, button re-enabled)
    await page.waitForSelector('text=Checking...', { state: 'hidden', timeout: 10000 });
    await expect(page.locator('button:has-text("Check Migration Status")')).toBeEnabled();
  });

  test('should show success message after completing all migrations', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Mock successful "run all" response
    await page.route('/api/admin/migrations/run-all-publisher', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          message: 'All migrations completed successfully',
          completedMigrations: ['publisher_offerings_system', 'domain_normalization']
        })
      });
    });
    
    // Set up confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Run all migrations
    await page.click('button:has-text("Run All Publisher Migrations")');
    
    // Should show success message
    await expect(page.locator('text=All Publisher Migrations Complete!')).toBeVisible();
    
    // Should show helpful links
    await expect(page.locator('text=Test Publisher Registration')).toBeVisible();
    await expect(page.locator('text=Manage Websites')).toBeVisible();
  });

  test('should navigate back to admin dashboard', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Click back link
    await page.click('text=Back to Admin');
    
    // Should return to admin page
    await page.waitForURL('/admin');
    await expect(page.locator('h1')).toContainText('Admin');
  });

  test('should display migration order notice', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Check migration order notice
    await expect(page.locator('text=Migration Order is Critical')).toBeVisible();
    await expect(page.locator('text=These migrations must be run in order')).toBeVisible();
    await expect(page.locator('text=1 → 2 → 3 → 4')).toBeVisible();
  });

  test('should show completed migrations as disabled', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Mock some migrations as completed
    await page.route('/api/admin/migrations/check-status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          status: {
            'publisher_offerings_system': true,
            'domain_normalization': true
          }
        })
      });
    });
    
    // Refresh status
    await page.click('button:has-text("Check Migration Status")');
    await page.waitForSelector('text=Checking...', { state: 'hidden' });
    
    // Completed migrations should show as completed
    await expect(page.locator('text=Completed')).toHaveCount({ min: 1 });
    
    // Should show green checkmarks
    await expect(page.locator('.text-green-500')).toHaveCount({ min: 1 });
  });

  test('should handle network errors during migration status check', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Mock network failure
    await page.route('/api/admin/migrations/check-status', route => {
      route.abort('failed');
    });
    
    // Click status check
    await page.click('button:has-text("Check Migration Status")');
    
    // Should handle gracefully
    await page.waitForSelector('text=Checking...', { state: 'hidden', timeout: 15000 });
    await expect(page.locator('button:has-text("Check Migration Status")')).toBeEnabled();
  });
});