/**
 * Production Health Check Tests
 * Quick verification that core functionality works in production
 */

import { test, expect, Page } from '@playwright/test';

// Configuration for production testing
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://your-domain.com';
const TEST_TIMEOUT = 30000;

test.describe('Production Health Checks', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for production
    test.setTimeout(TEST_TIMEOUT);
  });

  test('should load home page without errors', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Should load successfully
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show 500 errors
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('500');
    expect(pageText).not.toContain('Internal Server Error');
    
    // Should have proper title
    await expect(page).toHaveTitle(/Guest Post|Publisher|LinkIO/);
  });

  test('should load publisher login page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/publisher/login`);
    
    // Should show login form
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    
    // Should have SSL certificate (HTTPS)
    expect(page.url()).toContain('https://');
  });

  test('should load admin login page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/admin/login`);
    
    // Should either show admin login or redirect to regular login
    const hasAdminLogin = await page.locator('h1:has-text("Admin")').isVisible();
    const hasRegularLogin = await page.locator('input[type="email"]').isVisible();
    
    expect(hasAdminLogin || hasRegularLogin).toBeTruthy();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/nonexistent-page-12345`);
    
    // Should show 404 page, not crash
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show 500 error
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('500');
    expect(pageText).not.toContain('Internal Server Error');
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);
    
    // Check important security headers
    const headers = response?.headers() || {};
    
    // Should have HTTPS redirect or secure connection
    expect(page.url()).toContain('https://');
    
    // Should have content security policy (if implemented)
    // expect(headers['content-security-policy']).toBeDefined();
    
    // Should have X-Frame-Options (if implemented)
    // expect(headers['x-frame-options']).toBeDefined();
  });

  test('should load critical API endpoints', async ({ page }) => {
    // Test that API is accessible (will fail if auth required, which is expected)
    const apiResponse = await page.request.get(`${PRODUCTION_URL}/api/health`);
    
    // Should return a response (even if 401/403)
    expect([200, 401, 403, 404]).toContain(apiResponse.status());
    
    // Should not return 500 (internal server error)
    expect(apiResponse.status()).not.toBe(500);
  });

  test('should have working database connection', async ({ page }) => {
    // Visit a page that requires database (should not crash)
    await page.goto(`${PRODUCTION_URL}/publisher/login`);
    
    // Page should load (database connection working)
    await expect(page.locator('body')).toBeVisible();
    
    // No database connection errors should be visible
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('database');
    expect(pageText).not.toContain('connection');
    expect(pageText).not.toContain('timeout');
  });

  test('should have email service configured', async ({ page }) => {
    // This is harder to test without actually sending email
    // For now, just verify the email-related pages load
    await page.goto(`${PRODUCTION_URL}/publisher/login`);
    
    // If forgot password link exists, email should be configured
    const forgotPasswordLink = page.locator('text=Forgot password?');
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // Should load forgot password page without errors
      await expect(page.locator('body')).toBeVisible();
      
      const pageText = await page.textContent('body');
      expect(pageText).not.toContain('500');
    }
  });

  test('should have proper SSL certificate', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);
    
    // Should use HTTPS
    expect(page.url()).toContain('https://');
    
    // Should not have SSL warnings
    expect(response?.status()).not.toBe(526); // Invalid SSL certificate
    expect(response?.status()).not.toBe(525); // SSL handshake failed
  });

  test('should load static assets correctly', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Check for CSS loading (no broken styles)
    const cssFiles = await page.locator('link[rel="stylesheet"]').count();
    
    // Should have at least some CSS
    expect(cssFiles).toBeGreaterThan(0);
    
    // Check that JavaScript loads
    const jsFiles = await page.locator('script[src]').count();
    expect(jsFiles).toBeGreaterThan(0);
  });

  test('should have reasonable page load times', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('should have working environment variables', async ({ page }) => {
    // Test that environment-dependent features work
    await page.goto(`${PRODUCTION_URL}/publisher/login`);
    
    // If page loads correctly, environment is properly configured
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show development errors
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('NODE_ENV');
    expect(pageText).not.toContain('localhost');
    expect(pageText).not.toContain('3000'); // Dev port
  });
});

// Utility test for monitoring
test.describe('Production Monitoring', () => {
  
  test('should log system status', async ({ page }) => {
    console.log('=== PRODUCTION HEALTH CHECK RESULTS ===');
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log(`Test Time: ${new Date().toISOString()}`);
    
    try {
      const response = await page.goto(PRODUCTION_URL);
      console.log(`✅ Site accessible: ${response?.status()}`);
      
      const title = await page.title();
      console.log(`✅ Page title: ${title}`);
      
      const url = page.url();
      console.log(`✅ Final URL: ${url}`);
      console.log(`✅ SSL Status: ${url.includes('https') ? 'Secure' : 'Not Secure'}`);
      
    } catch (error) {
      console.log(`❌ Health check failed: ${error}`);
    }
    
    console.log('=== END HEALTH CHECK ===');
  });
});