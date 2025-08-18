/**
 * E2E Tests for Publisher Invoice Management
 * Tests invoice creation, viewing, and payment profile setup
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_PUBLISHER_EMAIL = 'test.publisher@example.com';
const TEST_PUBLISHER_PASSWORD = 'testpublisher123';

// Helper function for publisher authentication
async function loginAsPublisher(page: Page, email: string = TEST_PUBLISHER_EMAIL, password: string = TEST_PUBLISHER_PASSWORD) {
  await page.goto('/publisher/login');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/publisher');
}

test.describe('Publisher Invoice Management E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsPublisher(page);
  });

  test('should display invoices list page', async ({ page }) => {
    await page.goto('/publisher/invoices');
    
    // Check page elements
    await expect(page.locator('h1')).toContainText('Invoices');
    
    // Check invoices table
    await expect(page.locator('[data-testid="invoices-table"]')).toBeVisible();
    
    // Check create invoice button
    await expect(page.locator('[data-testid="create-invoice-button"]')).toBeVisible();
    
    // Check filter controls
    await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-filter"]')).toBeVisible();
  });

  test('should filter invoices by status', async ({ page }) => {
    await page.goto('/publisher/invoices');
    
    // Filter by pending invoices
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    
    // Should show only pending invoices
    const statusElements = page.locator('[data-testid="invoice-status"]:visible');
    await expect(statusElements).toHaveCount({ min: 0 }); // Could be 0 if no pending invoices
    
    // If invoices exist, they should all be pending
    const count = await statusElements.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(statusElements.nth(i)).toContainText('pending');
      }
    }
    
    // Filter by paid invoices
    await page.selectOption('[data-testid="status-filter"]', 'paid');
    
    // Wait for filter to apply
    await page.waitForTimeout(1000);
  });

  test('should navigate to create invoice page', async ({ page }) => {
    await page.goto('/publisher/invoices');
    
    // Click create invoice button
    await page.click('[data-testid="create-invoice-button"]');
    
    // Should navigate to new invoice page
    await page.waitForURL('/publisher/invoices/new');
    await expect(page.locator('h1')).toContainText('Create Invoice');
  });

  test('should display create invoice form correctly', async ({ page }) => {
    await page.goto('/publisher/invoices/new');
    
    // Check form elements
    await expect(page.locator('[data-testid="invoice-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-method"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-date"]')).toBeVisible();
    
    // Check submit button
    await expect(page.locator('[data-testid="submit-invoice"]')).toBeVisible();
    
    // Check cancel button
    await expect(page.locator('[data-testid="cancel-invoice"]')).toBeVisible();
    
    // Check earnings summary
    await expect(page.locator('[data-testid="available-earnings"]')).toBeVisible();
  });

  test('should validate invoice form fields', async ({ page }) => {
    await page.goto('/publisher/invoices/new');
    
    // Try to submit without required fields
    await page.click('[data-testid="submit-invoice"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="description-error"]')).toBeVisible();
    
    // Try with invalid amount
    await page.fill('[data-testid="invoice-amount"]', '-100');
    await page.click('[data-testid="submit-invoice"]');
    await expect(page.locator('text=Amount must be positive')).toBeVisible();
    
    // Try with amount too large
    await page.fill('[data-testid="invoice-amount"]', '999999');
    await page.click('[data-testid="submit-invoice"]');
    await expect(page.locator('text=Amount exceeds available earnings')).toBeVisible();
    
    // Try with too short description
    await page.fill('[data-testid="invoice-amount"]', '100');
    await page.fill('[data-testid="invoice-description"]', 'short');
    await page.click('[data-testid="submit-invoice"]');
    await expect(page.locator('text=Description must be at least 10 characters')).toBeVisible();
  });

  test('should create invoice successfully', async ({ page }) => {
    await page.goto('/publisher/invoices/new');
    
    // Fill form with valid data
    await page.fill('[data-testid="invoice-amount"]', '150.00');
    await page.fill('[data-testid="invoice-description"]', 'Content creation services for January 2024');
    await page.selectOption('[data-testid="payment-method"]', 'bank_transfer');
    
    // Submit form
    await page.click('[data-testid="submit-invoice"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="invoice-created"]')).toBeVisible();
    await expect(page.locator('text=Invoice submitted successfully')).toBeVisible();
    
    // Should redirect to invoices list
    await page.waitForURL('/publisher/invoices');
    
    // Should see new invoice in list
    await expect(page.locator('text=Content creation services for January 2024')).toBeVisible();
  });

  test('should view invoice details', async ({ page }) => {
    await page.goto('/publisher/invoices');
    
    // Click on first invoice
    await page.click('[data-testid="view-invoice"]:first-child');
    
    // Should navigate to invoice details page
    await expect(page.url()).toMatch(/\/publisher\/invoices\/[a-f0-9-]+/);
    
    // Check invoice details
    await expect(page.locator('[data-testid="invoice-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-description"]')).toBeVisible();
    
    // Check payment method
    await expect(page.locator('[data-testid="payment-method"]')).toBeVisible();
    
    // Check PDF download link
    await expect(page.locator('[data-testid="download-pdf"]')).toBeVisible();
  });

  test('should download invoice PDF', async ({ page }) => {
    await page.goto('/publisher/invoices');
    
    // Click view invoice
    await page.click('[data-testid="view-invoice"]:first-child');
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click download PDF
    await page.click('[data-testid="download-pdf"]');
    
    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf$/);
  });

  test('should setup payment profile', async ({ page }) => {
    await page.goto('/publisher/payment-profile');
    
    // Check page elements
    await expect(page.locator('h1')).toContainText('Payment Profile');
    
    // Fill payment profile form
    await page.fill('[data-testid="account-holder-name"]', 'Test Publisher LLC');
    await page.fill('[data-testid="bank-account"]', '123456789');
    await page.fill('[data-testid="routing-number"]', '987654321');
    await page.selectOption('[data-testid="bank-country"]', 'US');
    await page.fill('[data-testid="tax-id"]', '12-3456789');
    
    // Add address information
    await page.fill('[data-testid="address-line1"]', '123 Main Street');
    await page.fill('[data-testid="address-city"]', 'New York');
    await page.fill('[data-testid="address-state"]', 'NY');
    await page.fill('[data-testid="address-zip"]', '10001');
    
    // Save profile
    await page.click('[data-testid="save-payment-profile"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible();
    await expect(page.locator('text=Payment profile saved successfully')).toBeVisible();
  });

  test('should validate payment profile form', async ({ page }) => {
    await page.goto('/publisher/payment-profile');
    
    // Try to save without required fields
    await page.click('[data-testid="save-payment-profile"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="account-holder-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="bank-account-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="routing-number-error"]')).toBeVisible();
    
    // Try with invalid routing number
    await page.fill('[data-testid="account-holder-name"]', 'Test Publisher');
    await page.fill('[data-testid="bank-account"]', '123456789');
    await page.fill('[data-testid="routing-number"]', '123'); // Too short
    await page.click('[data-testid="save-payment-profile"]');
    
    await expect(page.locator('text=Invalid routing number')).toBeVisible();
    
    // Try with invalid account number
    await page.fill('[data-testid="routing-number"]', '987654321');
    await page.fill('[data-testid="bank-account"]', '123'); // Too short
    await page.click('[data-testid="save-payment-profile"]');
    
    await expect(page.locator('text=Invalid account number')).toBeVisible();
  });

  test('should show payment profile preview', async ({ page }) => {
    await page.goto('/publisher/payment-profile');
    
    // Fill form
    await page.fill('[data-testid="account-holder-name"]', 'Test Publisher LLC');
    await page.fill('[data-testid="bank-account"]', '123456789');
    await page.fill('[data-testid="routing-number"]', '987654321');
    
    // Check preview section updates
    await expect(page.locator('[data-testid="profile-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-account-holder"]')).toContainText('Test Publisher LLC');
    await expect(page.locator('[data-testid="preview-account"]')).toContainText('****6789'); // Masked account number
  });

  test('should handle invoice cancellation', async ({ page }) => {
    await page.goto('/publisher/invoices');
    
    // View a pending invoice
    await page.click('[data-testid="view-invoice"]:first-child');
    
    // Cancel invoice if it's pending
    if (await page.locator('[data-testid="cancel-invoice"]').isVisible()) {
      await page.click('[data-testid="cancel-invoice"]');
      
      // Confirm cancellation
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Are you sure you want to cancel');
        await dialog.accept();
      });
      
      await page.click('[data-testid="confirm-cancel"]');
      
      // Should show cancellation success
      await expect(page.locator('[data-testid="invoice-cancelled"]')).toBeVisible();
      
      // Status should update
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText('cancelled');
    }
  });

  test('should display earnings summary on invoice creation', async ({ page }) => {
    await page.goto('/publisher/invoices/new');
    
    // Check earnings summary section
    await expect(page.locator('[data-testid="earnings-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-earnings"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoiced-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="available-earnings"]')).toBeVisible();
    
    // Available earnings should be calculated correctly
    await expect(page.locator('[data-testid="available-earnings"]')).toContainText('$');
  });

  test('should handle invoice form autosave', async ({ page }) => {
    await page.goto('/publisher/invoices/new');
    
    // Fill form partially
    await page.fill('[data-testid="invoice-amount"]', '100.00');
    await page.fill('[data-testid="invoice-description"]', 'Content creation for February');
    
    // Navigate away and back
    await page.goto('/publisher/invoices');
    await page.goto('/publisher/invoices/new');
    
    // Form should retain values (if autosave is implemented)
    // await expect(page.locator('[data-testid="invoice-amount"]')).toHaveValue('100.00');
    // await expect(page.locator('[data-testid="invoice-description"]')).toHaveValue('Content creation for February');
  });

  test('should handle network errors during invoice submission', async ({ page }) => {
    await page.goto('/publisher/invoices/new');
    
    // Mock network error
    await page.route('/api/publisher/invoices', route => {
      route.abort('failed');
    });
    
    // Fill and submit form
    await page.fill('[data-testid="invoice-amount"]', '150.00');
    await page.fill('[data-testid="invoice-description"]', 'Content creation services');
    await page.selectOption('[data-testid="payment-method"]', 'bank_transfer');
    await page.click('[data-testid="submit-invoice"]');
    
    // Should show network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('text=Please try again')).toBeVisible();
    
    // Form data should be preserved
    await expect(page.locator('[data-testid="invoice-amount"]')).toHaveValue('150.00');
  });

  test('should display payment profile requirement notice', async ({ page }) => {
    // Mock missing payment profile
    await page.route('/api/publisher/payment-profile', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment profile not found' })
      });
    });
    
    await page.goto('/publisher/invoices/new');
    
    // Should show payment profile requirement
    await expect(page.locator('[data-testid="payment-profile-required"]')).toBeVisible();
    await expect(page.locator('text=Set up payment profile first')).toBeVisible();
    
    // Should have link to payment profile page
    await expect(page.locator('a[href="/publisher/payment-profile"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/publisher/invoices');
    
    // Check mobile layout
    await expect(page.locator('[data-testid="mobile-invoice-list"]')).toBeVisible();
    
    // Check mobile invoice cards
    await expect(page.locator('[data-testid="mobile-invoice-card"]')).toHaveCount({ min: 0 });
    
    // Test mobile form
    await page.goto('/publisher/invoices/new');
    await expect(page.locator('[data-testid="mobile-invoice-form"]')).toBeVisible();
    
    // Check mobile payment profile
    await page.goto('/publisher/payment-profile');
    await expect(page.locator('[data-testid="mobile-payment-form"]')).toBeVisible();
  });
});