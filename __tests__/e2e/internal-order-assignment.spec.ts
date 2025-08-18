/**
 * E2E Tests for Internal Order Assignment Flow
 * Tests the order assignment interface for internal team
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_ORDER_ID = 'd2dfa51b-ae73-4603-b021-d24a9d2ed490';
const TEST_LINE_ITEM_ID = '8cf33331-a4f3-41b5-8aeb-210e70bd60a7';

// Helper function for internal user authentication
async function loginAsInternal(page: Page) {
  await page.goto('/admin/login');
  await page.fill('[data-testid="email"]', 'internal@test.com');
  await page.fill('[data-testid="password"]', 'internal123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/admin');
}

test.describe('Internal Order Assignment E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsInternal(page);
  });

  test('should display order details and assignment interface', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Verify page loads with order details
    await expect(page.locator('h1')).toContainText('Order Assignment');
    
    // Check order information is displayed
    await expect(page.locator('[data-testid="order-id"]')).toContainText(TEST_ORDER_ID);
    
    // Verify line items are shown
    await expect(page.locator('[data-testid="line-items"]')).toBeVisible();
    
    // Check assignment controls are available
    await expect(page.locator('[data-testid="publisher-assignment"]')).toBeVisible();
  });

  test('should show available publishers for assignment', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Click assignment button for a line item
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    
    // Should show publisher selection modal/dropdown
    await expect(page.locator('[data-testid="publisher-selector"]')).toBeVisible();
    
    // Should show available domains
    await expect(page.locator('[data-testid="domain-select"]')).toBeVisible();
    
    // Verify publishers are listed
    const publisherOptions = page.locator('[data-testid="publisher-option"]');
    await expect(publisherOptions.count()).resolves.toBeGreaterThanOrEqual(1);
  });

  test('should filter publishers by domain compatibility', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Open assignment interface
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    
    // Select a specific domain
    await page.selectOption('[data-testid="domain-select"]', { index: 0 });
    
    // Publishers should be filtered based on domain
    await expect(page.locator('[data-testid="compatible-publishers"]')).toBeVisible();
    
    // Should show publisher pricing information
    await expect(page.locator('[data-testid="publisher-price"]')).toBeVisible();
  });

  test('should complete publisher assignment successfully', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Start assignment process
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    
    // Select domain
    await page.selectOption('[data-testid="domain-select"]', { index: 0 });
    
    // Select publisher
    await page.click('[data-testid="publisher-option"]:first-child');
    
    // Add assignment notes
    await page.fill('[data-testid="assignment-notes"]', 'Test assignment for high-priority client');
    
    // Confirm assignment
    await page.click('[data-testid="confirm-assignment"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="assignment-success"]')).toBeVisible();
    await expect(page.locator('text=Publisher assigned successfully')).toBeVisible();
    
    // Line item status should update
    await expect(page.locator(`[data-testid="status-${TEST_LINE_ITEM_ID}"]`)).toContainText('assigned');
  });

  test('should handle bulk assignment of multiple line items', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Select multiple line items
    await page.check('[data-testid="select-line-item"]:nth-child(1)');
    await page.check('[data-testid="select-line-item"]:nth-child(2)');
    
    // Click bulk assign
    await page.click('[data-testid="bulk-assign"]');
    
    // Should show bulk assignment interface
    await expect(page.locator('[data-testid="bulk-assignment-modal"]')).toBeVisible();
    
    // Select domain for all items
    await page.selectOption('[data-testid="bulk-domain-select"]', { index: 0 });
    
    // Should show compatible publishers
    await expect(page.locator('[data-testid="bulk-publisher-options"]')).toBeVisible();
    
    // Complete bulk assignment
    await page.click('[data-testid="bulk-publisher-option"]:first-child');
    await page.click('[data-testid="confirm-bulk-assignment"]');
    
    // Should show bulk success message
    await expect(page.locator('text=Bulk assignment completed')).toBeVisible();
  });

  test('should show publisher performance metrics', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Open assignment interface
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    
    // Publisher cards should show performance data
    await expect(page.locator('[data-testid="publisher-completion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="publisher-avg-turnaround"]')).toBeVisible();
    await expect(page.locator('[data-testid="publisher-rating"]')).toBeVisible();
    
    // Should show recent order history
    await page.click('[data-testid="view-publisher-details"]');
    await expect(page.locator('[data-testid="publisher-order-history"]')).toBeVisible();
  });

  test('should handle assignment conflicts and errors', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Mock assignment conflict
    await page.route('/api/orders/*/assign-publisher', route => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Publisher already assigned to this domain for overlapping timeframe' 
        })
      });
    });
    
    // Attempt assignment
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    await page.selectOption('[data-testid="domain-select"]', { index: 0 });
    await page.click('[data-testid="publisher-option"]:first-child');
    await page.click('[data-testid="confirm-assignment"]');
    
    // Should show conflict error
    await expect(page.locator('[data-testid="assignment-error"]')).toBeVisible();
    await expect(page.locator('text=already assigned')).toBeVisible();
    
    // Should suggest alternative publishers
    await expect(page.locator('[data-testid="alternative-publishers"]')).toBeVisible();
  });

  test('should track assignment history and changes', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // View assignment history
    await page.click('[data-testid="view-assignment-history"]');
    
    // Should show assignment timeline
    await expect(page.locator('[data-testid="assignment-timeline"]')).toBeVisible();
    
    // Should show who made assignments
    await expect(page.locator('[data-testid="assignment-user"]')).toBeVisible();
    
    // Should show assignment reasons/notes
    await expect(page.locator('[data-testid="assignment-notes"]')).toBeVisible();
  });

  test('should handle urgent order prioritization', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Mark order as urgent
    await page.click('[data-testid="mark-urgent"]');
    
    // Should show urgent indicator
    await expect(page.locator('[data-testid="urgent-badge"]')).toBeVisible();
    
    // Publisher selection should prioritize fast turnaround
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    await expect(page.locator('[data-testid="fast-turnaround-publishers"]')).toBeVisible();
    
    // Should show expedited options
    await expect(page.locator('[data-testid="expedited-pricing"]')).toBeVisible();
  });

  test('should validate assignment requirements', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Try to assign without selecting domain
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    await page.click('[data-testid="confirm-assignment"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('text=Please select a domain')).toBeVisible();
    
    // Try to assign without selecting publisher
    await page.selectOption('[data-testid="domain-select"]', { index: 0 });
    await page.click('[data-testid="confirm-assignment"]');
    
    // Should show publisher selection error
    await expect(page.locator('text=Please select a publisher')).toBeVisible();
  });

  test('should show real-time assignment updates', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Mock real-time update via WebSocket or polling
    await page.evaluate(() => {
      // Simulate another user making an assignment
      window.dispatchEvent(new CustomEvent('assignmentUpdate', {
        detail: { lineItemId: '8cf33331-a4f3-41b5-8aeb-210e70bd60a7', status: 'assigned' }
      }));
    });
    
    // Should show updated status
    await expect(page.locator(`[data-testid="status-${TEST_LINE_ITEM_ID}"]`)).toContainText('assigned');
    
    // Should show notification of change
    await expect(page.locator('[data-testid="real-time-update"]')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto(`/orders/${TEST_ORDER_ID}/internal`);
    
    // Mock network failure
    await page.route('/api/orders/*/assign-publisher', route => {
      route.abort('failed');
    });
    
    // Attempt assignment
    await page.click(`[data-testid="assign-publisher-${TEST_LINE_ITEM_ID}"]`);
    await page.selectOption('[data-testid="domain-select"]', { index: 0 });
    await page.click('[data-testid="publisher-option"]:first-child');
    await page.click('[data-testid="confirm-assignment"]');
    
    // Should show network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('text=Please try again')).toBeVisible();
    
    // Should retain form state for retry
    const domainSelect = page.locator('[data-testid="domain-select"]');
    await expect(domainSelect).toHaveValue('');
  });
});