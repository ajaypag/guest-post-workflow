/**
 * Basic Smoke Tests for Publisher Workflow System
 * Verifies core pages load without authentication issues
 */

import { test, expect } from '@playwright/test';

test.describe('Publisher Workflow Smoke Tests', () => {
  
  test('should load admin migration page', async ({ page }) => {
    await page.goto('/admin/publisher-migrations');
    
    // Should either show the page or redirect to login
    const url = page.url();
    const hasLoginRedirect = url.includes('/login') || url.includes('/auth');
    const hasAdminPage = await page.locator('h1').isVisible();
    
    // One of these should be true
    expect(hasLoginRedirect || hasAdminPage).toBeTruthy();
    
    if (hasAdminPage) {
      await expect(page.locator('h1')).toContainText(/Migration|Admin/);
    }
  });

  test('should load publisher login page', async ({ page }) => {
    await page.goto('/publisher/login');
    
    // Check if page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Should have login form elements
    const hasEmailField = await page.locator('input[type="email"], input[name="email"]').isVisible();
    const hasPasswordField = await page.locator('input[type="password"], input[name="password"]').isVisible();
    
    expect(hasEmailField || hasPasswordField).toBeTruthy();
  });

  test('should load publisher dashboard with redirect', async ({ page }) => {
    await page.goto('/publisher');
    
    // Should either show dashboard or redirect to login
    const url = page.url();
    const hasLoginRedirect = url.includes('/login') || url.includes('/auth');
    const hasDashboard = await page.locator('h1').isVisible();
    
    expect(hasLoginRedirect || hasDashboard).toBeTruthy();
  });

  test('should load home page', async ({ page }) => {
    await page.goto('/');
    
    // Page should load without 500 errors
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show 500 error
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('500');
    expect(pageText).not.toContain('Internal Server Error');
  });

  test('should handle invalid routes gracefully', async ({ page }) => {
    await page.goto('/nonexistent-route-12345');
    
    // Should show 404 or redirect, not crash
    await expect(page.locator('body')).toBeVisible();
    
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('500');
    expect(pageText).not.toContain('Internal Server Error');
  });
});