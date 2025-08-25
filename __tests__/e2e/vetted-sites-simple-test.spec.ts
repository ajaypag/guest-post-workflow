import { test, expect } from '@playwright/test';

test.describe('Vetted Sites Request System - Manual Test', () => {
  const baseURL = 'http://localhost:3004';
  
  test('Manual login and navigation test', async ({ page }) => {
    console.log('🚀 Starting manual test...');
    
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    console.log('✅ Navigated to login page');
    
    // Check if login form is present
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible(); 
    await expect(loginButton).toBeVisible();
    console.log('✅ Login form elements are present');
    
    // Manual login step - fill form and wait for user to handle
    console.log('📝 Please manually login with: ajay@outreachlabs.com / FA64!I$nrbCauS^d');
    
    // Fill the form but don't submit - let manual intervention handle it
    await emailInput.fill('ajay@outreachlabs.com');
    console.log('✅ Email filled');
    
    // Wait for potential manual intervention or navigation
    console.log('⏳ Waiting for manual login... (30 seconds)');
    await page.waitForTimeout(30000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL after wait: ${currentUrl}`);
    
    // If still on login page, try navigation to vetted sites
    if (currentUrl.includes('/login')) {
      console.log('🔄 Still on login page, trying direct navigation...');
      await page.goto(`${baseURL}/internal/vetted-sites/requests`);
    }
    
    await page.waitForTimeout(5000);
    console.log('🎯 Test completed - check browser manually for full workflow');
  });

  test('Test request detail page accessibility', async ({ page }) => {
    console.log('🔍 Testing request detail page...');
    
    // Try to access a request detail page directly
    // Use the request ID from previous conversation
    const requestId = 'da8f51ef-5454-4e92-acfe-ad9b94eb6be5';
    const requestDetailUrl = `${baseURL}/internal/vetted-sites/requests/${requestId}`;
    
    console.log(`📋 Navigating to: ${requestDetailUrl}`);
    await page.goto(requestDetailUrl);
    
    // Wait for page load
    await page.waitForTimeout(10000);
    
    const currentUrl = page.url();
    console.log(`📍 Final URL: ${currentUrl}`);
    
    // Check if we can see any content or get redirected
    const pageContent = await page.textContent('body');
    const hasContent = pageContent && pageContent.length > 100;
    
    console.log(`📊 Page has content: ${hasContent}`);
    if (hasContent) {
      console.log('✅ Page loaded with content');
      
      // Look for key elements
      const hasRequestInfo = await page.locator('h1, h2').isVisible();
      const hasTargetUrls = await page.locator('text=target, text=URL').isVisible();
      
      console.log(`🎯 Has request info: ${hasRequestInfo}`);
      console.log(`🔗 Has target URLs: ${hasTargetUrls}`);
    }
  });
});