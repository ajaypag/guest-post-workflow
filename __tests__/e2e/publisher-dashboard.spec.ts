/**
 * E2E Tests for Publisher Dashboard and Order Management
 * Tests publisher login, dashboard, order acceptance, and work submission
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_PUBLISHER_EMAIL = 'test.publisher@example.com';
const TEST_PUBLISHER_PASSWORD = 'testpublisher123';
const TEST_LINE_ITEM_ID = '8cf33331-a4f3-41b5-8aeb-210e70bd60a7';

// Helper function for publisher authentication
async function loginAsPublisher(page: Page, email: string = TEST_PUBLISHER_EMAIL, password: string = TEST_PUBLISHER_PASSWORD) {
  await page.goto('/publisher/login');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/publisher');
}

test.describe('Publisher Dashboard E2E', () => {
  
  test('should display publisher login page correctly', async ({ page }) => {
    await page.goto('/publisher/login');
    
    // Check login form elements
    await expect(page.locator('h1')).toContainText('Publisher Login');
    await expect(page.locator('[data-testid="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Check forgot password link
    await expect(page.locator('text=Forgot password?')).toBeVisible();
    
    // Check signup link
    await expect(page.locator('text=Sign up')).toBeVisible();
  });

  test('should handle login validation errors', async ({ page }) => {
    await page.goto('/publisher/login');
    
    // Try to login without email
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    
    // Try with invalid email format
    await page.fill('[data-testid="email"]', 'invalid-email');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('text=Invalid email format')).toBeVisible();
    
    // Try with valid email but no password
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/publisher/login');
    
    // Try with wrong credentials
    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should login successfully and display dashboard', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Should redirect to dashboard
    await expect(page.url()).toContain('/publisher');
    await expect(page.locator('h1')).toContainText('Publisher Dashboard');
    
    // Check dashboard elements
    await expect(page.locator('[data-testid="earnings-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
    
    // Check navigation
    await expect(page.locator('[data-testid="nav-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-invoices"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-earnings"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
  });

  test('should display earnings summary correctly', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Check earnings cards
    await expect(page.locator('[data-testid="total-earnings"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-earnings"]')).toBeVisible();
    await expect(page.locator('[data-testid="paid-earnings"]')).toBeVisible();
    
    // Earnings should be formatted as currency
    await expect(page.locator('[data-testid="total-earnings"]')).toContainText('$');
    
    // Check earnings trend indicators
    await expect(page.locator('[data-testid="earnings-trend"]')).toBeVisible();
  });

  test('should navigate to orders page and display assigned orders', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Navigate to orders
    await page.click('[data-testid="nav-orders"]');
    await page.waitForURL('/publisher/orders');
    
    // Check orders page
    await expect(page.locator('h1')).toContainText('Orders');
    
    // Should show order filters
    await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-filter"]')).toBeVisible();
    
    // Should display orders table
    await expect(page.locator('[data-testid="orders-table"]')).toBeVisible();
    
    // Check order columns
    await expect(page.locator('text=Anchor Text')).toBeVisible();
    await expect(page.locator('text=Domain')).toBeVisible();
    await expect(page.locator('text=Price')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Actions')).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // Filter by pending orders
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    
    // Should only show pending orders
    await expect(page.locator('[data-testid="order-status"]:visible')).toHaveText(['pending', 'pending', 'pending']);
    
    // Filter by completed orders
    await page.selectOption('[data-testid="status-filter"]', 'completed');
    
    // Should update order list
    await page.waitForFunction(() => {
      const statuses = Array.from(document.querySelectorAll('[data-testid="order-status"]:visible'));
      return statuses.every(el => el.textContent?.includes('completed'));
    });
  });

  test('should view order details and accept order', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // Click on first pending order
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    
    // Should show order details page
    await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
    
    // Check order information
    await expect(page.locator('[data-testid="anchor-text"]')).toBeVisible();
    await expect(page.locator('[data-testid="target-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="publisher-price"]')).toContainText('$');
    await expect(page.locator('[data-testid="platform-fee"]')).toContainText('$');
    await expect(page.locator('[data-testid="net-earnings"]')).toContainText('$');
    
    // Check requirements
    await expect(page.locator('[data-testid="requirements"]')).toBeVisible();
    
    // Accept the order
    await page.click('[data-testid="accept-order"]');
    
    // Should show acceptance confirmation
    await expect(page.locator('[data-testid="order-accepted"]')).toBeVisible();
    await expect(page.locator('text=Order accepted successfully')).toBeVisible();
    
    // Status should update to accepted
    await expect(page.locator('[data-testid="order-status"]')).toContainText('accepted');
  });

  test('should reject order with reason', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // View a pending order
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    
    // Click reject button
    await page.click('[data-testid="reject-order"]');
    
    // Should show rejection modal
    await expect(page.locator('[data-testid="rejection-modal"]')).toBeVisible();
    
    // Fill rejection reason
    await page.fill('[data-testid="rejection-reason"]', 'Content topic not suitable for our audience');
    
    // Confirm rejection
    await page.click('[data-testid="confirm-rejection"]');
    
    // Should show rejection confirmation
    await expect(page.locator('[data-testid="order-rejected"]')).toBeVisible();
    
    // Status should update
    await expect(page.locator('[data-testid="order-status"]')).toContainText('rejected');
  });

  test('should start work on accepted order', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // Assume order is already accepted, view it
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    
    // Start work
    await page.click('[data-testid="start-work"]');
    
    // Should show work in progress status
    await expect(page.locator('[data-testid="status-in-progress"]')).toBeVisible();
    
    // Should show work submission form
    await expect(page.locator('[data-testid="work-submission-form"]')).toBeVisible();
    
    // Check required fields
    await expect(page.locator('[data-testid="published-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-notes"]')).toBeVisible();
  });

  test('should submit completed work', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // View an in-progress order
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    
    // Fill work submission form
    await page.fill('[data-testid="published-url"]', 'https://example.com/published-content');
    await page.fill('[data-testid="completion-notes"]', 'Content has been published successfully with the required anchor text and link pointing to the target URL.');
    
    // Submit work
    await page.click('[data-testid="submit-work"]');
    
    // Should show submission confirmation
    await expect(page.locator('[data-testid="work-submitted"]')).toBeVisible();
    await expect(page.locator('text=Your work has been submitted for review')).toBeVisible();
    
    // Status should update
    await expect(page.locator('[data-testid="order-status"]')).toContainText('submitted');
  });

  test('should validate work submission form', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    
    // Try to submit without required fields
    await page.click('[data-testid="submit-work"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="url-required"]')).toBeVisible();
    await expect(page.locator('[data-testid="notes-required"]')).toBeVisible();
    
    // Try with invalid URL
    await page.fill('[data-testid="published-url"]', 'not-a-valid-url');
    await page.click('[data-testid="submit-work"]');
    
    await expect(page.locator('[data-testid="url-invalid"]')).toBeVisible();
    
    // Try with too short notes
    await page.fill('[data-testid="published-url"]', 'https://example.com/valid');
    await page.fill('[data-testid="completion-notes"]', 'too short');
    await page.click('[data-testid="submit-work"]');
    
    await expect(page.locator('text=Please provide more detailed notes')).toBeVisible();
  });

  test('should handle work submission errors', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // Mock submission error
    await page.route('/api/publisher/orders/*/submit', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'URL already published by another publisher' })
      });
    });
    
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    
    // Fill and submit form
    await page.fill('[data-testid="published-url"]', 'https://example.com/duplicate');
    await page.fill('[data-testid="completion-notes"]', 'Valid completion notes');
    await page.click('[data-testid="submit-work"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="submission-error"]')).toBeVisible();
    await expect(page.locator('text=URL already published')).toBeVisible();
  });

  test('should display order history and status timeline', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    
    // View order timeline
    await page.click('[data-testid="view-timeline"]');
    
    // Should show status timeline
    await expect(page.locator('[data-testid="order-timeline"]')).toBeVisible();
    
    // Should show status changes with timestamps
    await expect(page.locator('[data-testid="timeline-item"]')).toHaveCount({ min: 1 });
    
    // Check timeline items have timestamps
    await expect(page.locator('[data-testid="timeline-timestamp"]')).toHaveCount({ min: 1 });
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click logout
    await page.click('[data-testid="logout"]');
    
    // Should redirect to login page
    await page.waitForURL('/publisher/login');
    await expect(page.locator('h1')).toContainText('Publisher Login');
    
    // Should not be able to access dashboard
    await page.goto('/publisher');
    await page.waitForURL('/publisher/login');
  });

  test('should handle session expiration', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Mock session expiration
    await page.route('/api/publisher/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' })
      });
    });
    
    // Try to navigate to orders
    await page.click('[data-testid="nav-orders"]');
    
    // Should redirect to login with session expired message
    await page.waitForURL('/publisher/login');
    await expect(page.locator('[data-testid="session-expired"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAsPublisher(page);
    
    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Check mobile order cards
    await page.click('[data-testid="nav-orders"]');
    await expect(page.locator('[data-testid="mobile-order-card"]')).toHaveCount({ min: 1 });
    
    // Check mobile-friendly forms
    await page.click(`[data-testid="view-order-${TEST_LINE_ITEM_ID}"]`);
    await expect(page.locator('[data-testid="mobile-order-details"]')).toBeVisible();
  });
});