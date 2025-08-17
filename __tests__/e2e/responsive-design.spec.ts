/**
 * E2E Responsive Design Tests for Publisher Workflow
 * Tests mobile, tablet, and desktop layouts across all publisher pages
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_PUBLISHER_EMAIL = 'test.publisher@example.com';
const TEST_PUBLISHER_PASSWORD = 'testpublisher123';

// Device configurations
const devices = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 }
};

// Helper function for publisher authentication
async function loginAsPublisher(page: Page, email: string = TEST_PUBLISHER_EMAIL, password: string = TEST_PUBLISHER_PASSWORD) {
  await page.goto('/publisher/login');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/publisher');
}

test.describe('Publisher Workflow Responsive Design E2E', () => {
  
  for (const [deviceName, viewport] of Object.entries(devices)) {
    test.describe(`${deviceName} viewport`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(viewport);
      });

      test('publisher login should be responsive', async ({ page }) => {
        await page.goto('/publisher/login');
        
        // Check form layout
        await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
        
        if (deviceName === 'mobile') {
          // Mobile-specific checks
          await expect(page.locator('[data-testid="mobile-login-container"]')).toBeVisible();
          
          // Form should be full width on mobile
          const formWidth = await page.locator('[data-testid="login-form"]').boundingBox();
          expect(formWidth?.width).toBeGreaterThan(300);
          
          // Buttons should be large enough for touch
          const buttonHeight = await page.locator('[data-testid="login-button"]').boundingBox();
          expect(buttonHeight?.height).toBeGreaterThan(44); // Minimum touch target
          
        } else if (deviceName === 'tablet') {
          // Tablet-specific checks
          await expect(page.locator('[data-testid="tablet-login-layout"]')).toBeVisible();
          
        } else {
          // Desktop-specific checks
          await expect(page.locator('[data-testid="desktop-login-layout"]')).toBeVisible();
        }
        
        // Form inputs should be appropriately sized
        const emailInput = page.locator('[data-testid="email"]');
        const emailBox = await emailInput.boundingBox();
        expect(emailBox?.height).toBeGreaterThan(36);
      });

      test('publisher dashboard should adapt to screen size', async ({ page }) => {
        await loginAsPublisher(page);
        
        // Check dashboard layout
        await expect(page.locator('h1')).toContainText('Publisher Dashboard');
        
        if (deviceName === 'mobile') {
          // Mobile navigation should be collapsible
          await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
          
          // Cards should stack vertically
          const earningsCard = page.locator('[data-testid="earnings-summary"]');
          const ordersCard = page.locator('[data-testid="active-orders"]');
          
          const earningsBox = await earningsCard.boundingBox();
          const ordersBox = await ordersCard.boundingBox();
          
          if (earningsBox && ordersBox) {
            // Cards should be stacked (orders below earnings)
            expect(ordersBox.y).toBeGreaterThan(earningsBox.y + earningsBox.height);
          }
          
        } else if (deviceName === 'tablet') {
          // Tablet should show partial navigation
          await expect(page.locator('[data-testid="tablet-nav"]')).toBeVisible();
          
        } else {
          // Desktop should show full sidebar navigation
          await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
        }
        
        // All important content should be visible
        await expect(page.locator('[data-testid="earnings-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="active-orders"]')).toBeVisible();
      });

      test('orders list should be mobile-friendly', async ({ page }) => {
        await loginAsPublisher(page);
        await page.goto('/publisher/orders');
        
        if (deviceName === 'mobile') {
          // Mobile should show card layout instead of table
          await expect(page.locator('[data-testid="mobile-order-list"]')).toBeVisible();
          
          // Cards should be touch-friendly
          const orderCards = page.locator('[data-testid="mobile-order-card"]');
          const cardCount = await orderCards.count();
          
          if (cardCount > 0) {
            const firstCard = orderCards.first();
            const cardBox = await firstCard.boundingBox();
            expect(cardBox?.height).toBeGreaterThan(100); // Minimum card size
            
            // Touch targets should be large enough
            const actionButton = firstCard.locator('button').first();
            if (await actionButton.isVisible()) {
              const buttonBox = await actionButton.boundingBox();
              expect(buttonBox?.height).toBeGreaterThan(44);
            }
          }
          
        } else {
          // Tablet and desktop should show table layout
          await expect(page.locator('[data-testid="orders-table"]')).toBeVisible();
          
          if (deviceName === 'tablet') {
            // Table should be horizontally scrollable if needed
            const table = page.locator('[data-testid="orders-table"]');
            const tableBox = await table.boundingBox();
            expect(tableBox?.width).toBeLessThanOrEqual(viewport.width);
          }
        }
        
        // Filters should be accessible on all devices
        await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
      });

      test('order details should be readable on all devices', async ({ page }) => {
        await loginAsPublisher(page);
        await page.goto('/publisher/orders');
        
        // Navigate to first order
        const firstOrderLink = page.locator('[data-testid*="view-order"]').first();
        if (await firstOrderLink.isVisible()) {
          await firstOrderLink.click();
          
          // Order details should be visible
          await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
          
          if (deviceName === 'mobile') {
            // Mobile layout optimizations
            await expect(page.locator('[data-testid="mobile-order-details"]')).toBeVisible();
            
            // Action buttons should be stacked
            const acceptButton = page.locator('[data-testid="accept-order"]');
            const rejectButton = page.locator('[data-testid="reject-order"]');
            
            if (await acceptButton.isVisible() && await rejectButton.isVisible()) {
              const acceptBox = await acceptButton.boundingBox();
              const rejectBox = await rejectButton.boundingBox();
              
              if (acceptBox && rejectBox) {
                // Buttons should be stacked vertically on mobile
                expect(Math.abs((acceptBox.y + acceptBox.height) - rejectBox.y)).toBeLessThan(20);
              }
            }
            
          } else {
            // Tablet and desktop can show side-by-side layout
            await expect(page.locator('[data-testid="desktop-order-details"]')).toBeVisible();
          }
          
          // Critical information should always be visible
          await expect(page.locator('[data-testid="anchor-text"]')).toBeVisible();
          await expect(page.locator('[data-testid="target-url"]')).toBeVisible();
          await expect(page.locator('[data-testid="publisher-price"]')).toBeVisible();
        }
      });

      test('invoice forms should be touch-friendly', async ({ page }) => {
        await loginAsPublisher(page);
        await page.goto('/publisher/invoices/new');
        
        // Form should be appropriately sized
        await expect(page.locator('[data-testid="invoice-form"]')).toBeVisible();
        
        if (deviceName === 'mobile') {
          // Mobile form optimizations
          const amountInput = page.locator('[data-testid="invoice-amount"]');
          const amountBox = await amountInput.boundingBox();
          expect(amountBox?.height).toBeGreaterThan(44); // Touch-friendly height
          
          // Form should be single column
          const formWidth = await page.locator('[data-testid="invoice-form"]').boundingBox();
          expect(formWidth?.width).toBeLessThan(viewport.width);
          
          // Submit button should be prominent
          const submitButton = page.locator('[data-testid="submit-invoice"]');
          const submitBox = await submitButton.boundingBox();
          expect(submitBox?.height).toBeGreaterThan(48);
          expect(submitBox?.width).toBeGreaterThan(200);
          
        } else {
          // Tablet and desktop can use multi-column layout
          const formContainer = page.locator('[data-testid="invoice-form"]');
          const containerBox = await formContainer.boundingBox();
          
          if (deviceName === 'desktop') {
            // Desktop should use available width efficiently
            expect(containerBox?.width).toBeGreaterThan(600);
          }
        }
        
        // All form fields should be accessible
        await expect(page.locator('[data-testid="invoice-amount"]')).toBeVisible();
        await expect(page.locator('[data-testid="invoice-description"]')).toBeVisible();
        await expect(page.locator('[data-testid="payment-method"]')).toBeVisible();
      });

      test('payment profile form should work on all devices', async ({ page }) => {
        await loginAsPublisher(page);
        await page.goto('/publisher/payment-profile');
        
        // Form should be visible and usable
        await expect(page.locator('[data-testid="payment-profile-form"]')).toBeVisible();
        
        if (deviceName === 'mobile') {
          // Mobile should stack form sections
          const sections = page.locator('[data-testid="form-section"]');
          const sectionCount = await sections.count();
          
          if (sectionCount > 1) {
            for (let i = 0; i < sectionCount - 1; i++) {
              const currentSection = sections.nth(i);
              const nextSection = sections.nth(i + 1);
              
              const currentBox = await currentSection.boundingBox();
              const nextBox = await nextSection.boundingBox();
              
              if (currentBox && nextBox) {
                // Sections should be stacked vertically
                expect(nextBox.y).toBeGreaterThan(currentBox.y + currentBox.height);
              }
            }
          }
          
          // Input fields should be full width on mobile
          const inputs = page.locator('input[type="text"], input[type="email"]');
          const inputCount = await inputs.count();
          
          for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const inputBox = await input.boundingBox();
            
            if (inputBox) {
              expect(inputBox.width).toBeGreaterThan(250); // Minimum input width
            }
          }
          
        } else {
          // Tablet and desktop can show grouped sections
          await expect(page.locator('[data-testid="form-sections-grid"]')).toBeVisible();
        }
      });

      test('navigation should work across all screen sizes', async ({ page }) => {
        await loginAsPublisher(page);
        
        if (deviceName === 'mobile') {
          // Test mobile hamburger menu
          await page.click('[data-testid="mobile-nav-toggle"]');
          await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
          
          // Navigate to orders via mobile menu
          await page.click('[data-testid="mobile-nav-orders"]');
          await page.waitForURL('/publisher/orders');
          
          // Menu should close after navigation
          await expect(page.locator('[data-testid="mobile-nav-menu"]')).not.toBeVisible();
          
        } else {
          // Test regular navigation
          await page.click('[data-testid="nav-orders"]');
          await page.waitForURL('/publisher/orders');
          
          // Navigate to invoices
          await page.click('[data-testid="nav-invoices"]');
          await page.waitForURL('/publisher/invoices');
        }
        
        // Navigation should work consistently
        await page.goto('/publisher');
        await expect(page.locator('h1')).toContainText('Publisher Dashboard');
      });

      test('content should not overflow on any device', async ({ page }) => {
        await loginAsPublisher(page);
        
        // Check for horizontal scrollbars
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        
        expect(hasHorizontalScroll).toBeFalsy();
        
        // Check that all text is readable
        const textElements = page.locator('p, span, div:not(:has(*))', { hasText: /.+/ });
        const textCount = await textElements.count();
        
        for (let i = 0; i < Math.min(textCount, 10); i++) { // Check first 10 elements
          const element = textElements.nth(i);
          const box = await element.boundingBox();
          
          if (box) {
            // Text should not extend beyond viewport
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 5); // 5px tolerance
          }
        }
      });

      test('touch interactions should work on mobile', async ({ page }) => {
        if (deviceName !== 'mobile') {
          test.skip('Touch tests only on mobile');
        }
        
        await loginAsPublisher(page);
        await page.goto('/publisher/orders');
        
        // Test swipe gestures if implemented
        const orderCard = page.locator('[data-testid="mobile-order-card"]').first();
        
        if (await orderCard.isVisible()) {
          // Simulate swipe left for actions (if implemented)
          await orderCard.hover();
          await page.mouse.down();
          await page.mouse.move(-100, 0);
          await page.mouse.up();
          
          // Check if swipe actions are revealed
          const swipeActions = page.locator('[data-testid="swipe-actions"]');
          if (await swipeActions.isVisible()) {
            await expect(swipeActions).toBeVisible();
          }
        }
        
        // Test pull-to-refresh if implemented
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        
        // Simulate pull down gesture
        await page.mouse.move(viewport.width / 2, 100);
        await page.mouse.down();
        await page.mouse.move(viewport.width / 2, 200);
        await page.mouse.up();
        
        // Check for refresh indicator
        const refreshIndicator = page.locator('[data-testid="pull-refresh"]');
        if (await refreshIndicator.isVisible()) {
          await expect(refreshIndicator).toBeVisible();
        }
      });

      test('forms should handle virtual keyboard on mobile', async ({ page }) => {
        if (deviceName !== 'mobile') {
          test.skip('Virtual keyboard tests only on mobile');
        }
        
        await loginAsPublisher(page);
        await page.goto('/publisher/invoices/new');
        
        // Focus on amount input
        await page.click('[data-testid="invoice-amount"]');
        
        // Simulate virtual keyboard appearance
        await page.setViewportSize({ width: viewport.width, height: viewport.height / 2 });
        
        // Form should still be usable
        await expect(page.locator('[data-testid="invoice-amount"]')).toBeVisible();
        await expect(page.locator('[data-testid="submit-invoice"]')).toBeVisible();
        
        // Should be able to scroll to see submit button
        await page.locator('[data-testid="submit-invoice"]').scrollIntoViewIfNeeded();
        await expect(page.locator('[data-testid="submit-invoice"]')).toBeVisible();
        
        // Reset viewport
        await page.setViewportSize(viewport);
      });
    });
  }

  test('should maintain functionality across all breakpoints', async ({ page }) => {
    await loginAsPublisher(page);
    
    // Test intermediate breakpoints
    const breakpoints = [
      { width: 480, height: 800 }, // Small mobile
      { width: 640, height: 900 }, // Large mobile
      { width: 1024, height: 768 }, // Tablet landscape
      { width: 1280, height: 800 }, // Small desktop
      { width: 1440, height: 900 }, // Medium desktop
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize(breakpoint);
      
      // Navigation should work
      await page.goto('/publisher/orders');
      await expect(page.locator('h1')).toContainText('Orders');
      
      // Forms should be usable
      await page.goto('/publisher/invoices/new');
      await expect(page.locator('[data-testid="invoice-form"]')).toBeVisible();
      
      // No horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    }
  });
});