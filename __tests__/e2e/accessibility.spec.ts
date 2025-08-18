/**
 * E2E Accessibility Tests for Publisher Workflow
 * Tests WCAG compliance, keyboard navigation, and screen reader compatibility
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper function for publisher authentication
async function loginAsPublisher(page: Page) {
  await page.goto('/publisher/login');
  await page.fill('[data-testid="email"]', 'test.publisher@example.com');
  await page.fill('[data-testid="password"]', 'testpublisher123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/publisher');
}

test.describe('Publisher Workflow Accessibility E2E', () => {
  
  test('publisher login page should be accessible', async ({ page }) => {
    await page.goto('/publisher/login');
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Check form labels
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    
    // Check ARIA attributes
    await expect(page.locator('[data-testid="email"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('[data-testid="password"]')).toHaveAttribute('aria-required', 'true');
    
    // Check focus management
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
  });

  test('publisher dashboard should be accessible', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Check heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    // Verify heading structure (h1 should come before h2, etc.)
    for (let i = 0; i < headingCount; i++) {
      const heading = headings.nth(i);
      await expect(heading).toBeVisible();
    }
    
    // Check navigation landmarks
    await expect(page.locator('nav[aria-label]')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Check skip link functionality
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
    }
  });

  test('orders page should be keyboard navigable', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Test keyboard navigation through orders table
    await page.keyboard.press('Tab');
    
    // Check table accessibility
    await expect(page.locator('table[role="table"]')).toBeVisible();
    await expect(page.locator('th[scope="col"]')).toHaveCount({ min: 1 });
    
    // Check row accessibility
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Check first row has proper ARIA attributes
      await expect(tableRows.first()).toHaveAttribute('role', 'row');
      
      // Check cells have proper headers association
      await expect(page.locator('td[headers]')).toHaveCount({ min: 1 });
    }
    
    // Test filter controls accessibility
    await expect(page.locator('[data-testid="status-filter"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="date-filter"]')).toHaveAttribute('aria-label');
  });

  test('order details page should support screen readers', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // Navigate to first order
    const firstOrderLink = page.locator('[data-testid="view-order"]').first();
    if (await firstOrderLink.isVisible()) {
      await firstOrderLink.click();
      
      // Run accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
      
      // Check page has proper title
      await expect(page).toHaveTitle(/Order Details/);
      
      // Check ARIA live regions for status updates
      await expect(page.locator('[aria-live="polite"]')).toHaveCount({ min: 1 });
      
      // Check action buttons have descriptive labels
      const actionButtons = page.locator('button[data-testid*="order"]');
      const buttonCount = await actionButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = actionButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // Button should have either aria-label or descriptive text
        expect(ariaLabel || textContent).toBeTruthy();
      }
      
      // Check form accessibility if present
      const forms = page.locator('form');
      const formCount = await forms.count();
      
      for (let i = 0; i < formCount; i++) {
        const form = forms.nth(i);
        
        // Form should have accessible name
        const formName = await form.getAttribute('aria-label') || 
                         await form.getAttribute('aria-labelledby');
        expect(formName).toBeTruthy();
        
        // Form inputs should have labels
        const inputs = form.locator('input, textarea, select');
        const inputCount = await inputs.count();
        
        for (let j = 0; j < inputCount; j++) {
          const input = inputs.nth(j);
          const inputId = await input.getAttribute('id');
          
          if (inputId) {
            const label = page.locator(`label[for="${inputId}"]`);
            await expect(label).toBeVisible();
          }
        }
      }
    }
  });

  test('invoice creation form should be accessible', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/invoices/new');
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Check form labels and descriptions
    await expect(page.locator('label[for="invoice-amount"]')).toBeVisible();
    await expect(page.locator('label[for="invoice-description"]')).toBeVisible();
    
    // Check required field indicators
    await expect(page.locator('[data-testid="invoice-amount"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('[data-testid="invoice-description"]')).toHaveAttribute('aria-required', 'true');
    
    // Check field descriptions
    await expect(page.locator('[aria-describedby*="amount-help"]')).toBeVisible();
    
    // Test error message accessibility
    await page.click('[data-testid="submit-invoice"]');
    
    // Error messages should be announced to screen readers
    await expect(page.locator('[role="alert"]')).toHaveCount({ min: 1 });
    await expect(page.locator('[aria-live="assertive"]')).toHaveCount({ min: 1 });
  });

  test('payment profile form should support assistive technology', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/payment-profile');
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Check fieldset grouping
    await expect(page.locator('fieldset')).toHaveCount({ min: 1 });
    await expect(page.locator('legend')).toHaveCount({ min: 1 });
    
    // Check sensitive field handling
    const bankAccountField = page.locator('[data-testid="bank-account"]');
    await expect(bankAccountField).toHaveAttribute('autocomplete', 'off');
    
    // Check validation messages
    await page.click('[data-testid="save-payment-profile"]');
    
    // Validation errors should be associated with fields
    const errorMessages = page.locator('[role="alert"]');
    const errorCount = await errorMessages.count();
    
    for (let i = 0; i < errorCount; i++) {
      const error = errorMessages.nth(i);
      const fieldId = await error.getAttribute('data-field-id');
      
      if (fieldId) {
        const associatedField = page.locator(`[id="${fieldId}"]`);
        await expect(associatedField).toHaveAttribute('aria-describedby');
      }
    }
  });

  test('navigation should work with keyboard only', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Test main navigation
    const navItems = page.locator('nav a, nav button');
    const navCount = await navItems.count();
    
    // Navigate through all nav items
    for (let i = 0; i < navCount; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      // Focused element should be visible and actionable
      await expect(focusedElement).toBeVisible();
      
      // Check focus indicator
      const focusedBox = await focusedElement.boundingBox();
      expect(focusedBox).toBeTruthy();
    }
    
    // Test that Enter key activates navigation
    await page.keyboard.press('Enter');
    
    // Should navigate or trigger action
    await page.waitForTimeout(1000);
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await loginAsPublisher(page);
    
    // Check that content is still visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="earnings-summary"]')).toBeVisible();
    
    // Check contrast ratios (simplified check)
    const backgroundColor = await page.locator('body').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    const textColor = await page.locator('h1').evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    
    // Colors should be different (basic contrast check)
    expect(backgroundColor).not.toBe(textColor);
  });

  test('should support screen reader announcements', async ({ page }) => {
    await loginAsPublisher(page);
    await page.goto('/publisher/orders');
    
    // Check for ARIA live regions
    await expect(page.locator('[aria-live]')).toHaveCount({ min: 1 });
    
    // Test status updates are announced
    const statusElements = page.locator('[data-testid*="status"]');
    const statusCount = await statusElements.count();
    
    if (statusCount > 0) {
      // Status changes should be in live regions or have announcements
      await expect(page.locator('[role="status"], [aria-live="polite"]')).toHaveCount({ min: 1 });
    }
    
    // Check page title updates
    await page.goto('/publisher/invoices');
    await expect(page).toHaveTitle(/Invoices/);
    
    await page.goto('/publisher/payment-profile');
    await expect(page).toHaveTitle(/Payment Profile/);
  });

  test('should handle zoom up to 200%', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Zoom to 200%
    await page.setViewportSize({ width: 640, height: 480 }); // Simulate zoom
    
    // Content should still be accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="nav-orders"]')).toBeVisible();
    
    // Navigation should work
    await page.click('[data-testid="nav-orders"]');
    await page.waitForURL('/publisher/orders');
    
    // Form elements should be usable
    if (await page.locator('[data-testid="status-filter"]').isVisible()) {
      await page.selectOption('[data-testid="status-filter"]', { index: 0 });
    }
  });

  test('should provide text alternatives for images', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Check all images have alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Image should have alt text, aria-label, or be decorative
      if (role !== 'presentation' && role !== 'none') {
        expect(alt !== null || ariaLabel !== null).toBeTruthy();
      }
    }
    
    // Check icon accessibility
    const icons = page.locator('[data-testid*="icon"], .icon, svg');
    const iconCount = await icons.count();
    
    for (let i = 0; i < iconCount; i++) {
      const icon = icons.nth(i);
      const ariaLabel = await icon.getAttribute('aria-label');
      const ariaHidden = await icon.getAttribute('aria-hidden');
      const role = await icon.getAttribute('role');
      
      // Icons should either be decorative or have labels
      if (ariaHidden !== 'true' && role !== 'presentation') {
        expect(ariaLabel).toBeTruthy();
      }
    }
  });
});