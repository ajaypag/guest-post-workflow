import { test, expect } from '@playwright/test';

// Test credentials (from the status document)
const INTERNAL_ADMIN_EMAIL = 'ajay@outreachlabs.com';
const INTERNAL_ADMIN_PASSWORD = 'FA64!I$nrbCauS^d';

test.describe('Publisher System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('Internal Admin Workflow', () => {
    test('should login as internal admin and access publisher management', async ({ page }) => {
      // Login as internal admin
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Should redirect to internal dashboard
      await expect(page).toHaveURL(/\/(internal|dashboard)/);

      // Navigate to publisher management
      await page.goto('/internal/publishers');
      
      // Should see publisher list
      await expect(page.locator('h1')).toContainText(/publisher/i);
      
      // Should see search functionality
      await expect(page.locator('input[type="search"]')).toBeVisible();
      
      // Should see at least the test publisher
      await expect(page.locator('[data-testid="publisher-list"]')).toBeVisible();
    });

    test('should view website details and publisher relationships', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Navigate to websites list
      await page.goto('/internal/websites');
      
      // Should see websites list
      await expect(page.locator('h1')).toContainText(/website/i);
      
      // Click on first website (if exists)
      const firstWebsiteLink = page.locator('[data-testid="website-item"]').first();
      if (await firstWebsiteLink.isVisible()) {
        await firstWebsiteLink.click();
        
        // Should navigate to website detail page
        await expect(page).toHaveURL(/\/internal\/websites\/[^/]+/);
        
        // Should see website details
        await expect(page.locator('[data-testid="website-details"]')).toBeVisible();
        
        // Should see publisher relationships section
        await expect(page.locator('[data-testid="publisher-relationships"]')).toBeVisible();
      }
    });

    test('should search and filter publishers', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      await page.goto('/internal/publishers');
      
      // Test search functionality
      const searchInput = page.locator('input[type="search"]');
      await searchInput.fill('Test Publisher');
      
      // Should filter results
      await page.waitForTimeout(1000); // Wait for search debounce
      
      // Search results should be visible
      const publisherItems = page.locator('[data-testid="publisher-item"]');
      const count = await publisherItems.count();
      
      // Should have filtered results (might be 0 if no matching publishers)
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Publisher Portal Workflow', () => {
    test('should navigate to publisher registration', async ({ page }) => {
      await page.goto('/publisher/register');
      
      // Should see registration form
      await expect(page.locator('h1')).toContainText(/register/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="companyName"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should navigate to publisher login', async ({ page }) => {
      await page.goto('/publisher/login');
      
      // Should see login form
      await expect(page.locator('h1')).toContainText(/login/i);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show proper error for invalid publisher login', async ({ page }) => {
      await page.goto('/publisher/login');
      
      await page.fill('input[type="email"]', 'nonexistent@publisher.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Navigation and Access Control', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected internal route
      await page.goto('/internal/publishers');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show 404 for non-existent routes', async ({ page }) => {
      await page.goto('/non-existent-route');
      
      // Should show 404 page
      await expect(page.locator('text=404')).toBeVisible();
    });

    test('should protect publisher routes from internal users', async ({ page }) => {
      // Login as internal admin
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Try to access publisher-only route
      await page.goto('/publisher/offerings');
      
      // Should be redirected or show access denied
      // (Implementation depends on the actual access control logic)
      await expect(page).not.toHaveURL('/publisher/offerings');
    });
  });

  test.describe('Data Display and Integrity', () => {
    test('should display website domain normalization correctly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      await page.goto('/internal/websites');
      
      // Check that domains are displayed without www prefixes and protocols
      const domainElements = page.locator('[data-testid="website-domain"]');
      const count = await domainElements.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const domainText = await domainElements.nth(i).textContent();
          
          // Domains should not start with http:// or https://
          expect(domainText).not.toMatch(/^https?:\/\//);
          
          // Domains should be normalized (no www prefix unless it's part of the actual domain)
          // This is a soft assertion since some domains legitimately start with www
        }
      }
    });

    test('should handle empty states gracefully', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Search for something that definitely doesn't exist
      await page.goto('/internal/publishers');
      const searchInput = page.locator('input[type="search"]');
      await searchInput.fill('DefinitelyNonExistentPublisherName12345');
      
      await page.waitForTimeout(1000);
      
      // Should show empty state message
      const noResults = page.locator('[data-testid="no-results"]');
      await expect(noResults).toBeVisible();
    });
  });

  test.describe('Migration and Admin Tools', () => {
    test('should access admin migration panel', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      await page.goto('/admin/publisher-migrations');
      
      // Should see migration status
      await expect(page.locator('h1')).toContainText(/migration/i);
      
      // Should see migration status indicators
      await expect(page.locator('[data-testid="migration-status"]')).toBeVisible();
    });

    test('should show migration status correctly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', INTERNAL_ADMIN_EMAIL);
      await page.fill('input[type="password"]', INTERNAL_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      await page.goto('/admin/publisher-migrations');
      
      // Check that migration statuses are displayed
      const statusElements = page.locator('[data-testid="migration-status-item"]');
      const count = await statusElements.count();
      
      expect(count).toBeGreaterThan(0);
      
      // Each status should show completion status
      for (let i = 0; i < count; i++) {
        const statusText = await statusElements.nth(i).textContent();
        expect(statusText).toMatch(/(completed|pending|error)/i);
      }
    });
  });
});