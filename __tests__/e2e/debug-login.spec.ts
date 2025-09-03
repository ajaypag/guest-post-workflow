import { test, expect } from '@playwright/test';

test.describe('Debug Login', () => {
  test('debug login step by step', async ({ page }) => {
    console.log('🔍 Step 1: Navigate to admin page');
    await page.goto('/admin/manyreach-import');
    
    console.log('Current URL after navigation:', page.url());
    await expect(page).toHaveURL(/.*\/login/);
    console.log('✅ Correctly redirected to login page');
    
    console.log('🔍 Step 2: Check form elements exist');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    console.log('✅ All form elements visible');
    
    console.log('🔍 Step 3: Fill credentials');
    await emailInput.fill('ajay@outreachlabs.com');
    await passwordInput.fill('password123');
    console.log('✅ Credentials filled');
    
    console.log('🔍 Step 4: Submit form');
    await submitButton.click();
    console.log('✅ Form submitted, waiting for response...');
    
    // Wait longer and check for various possible outcomes
    await page.waitForTimeout(3000);
    console.log('Current URL after form submission:', page.url());
    
    // Check if we have any errors on the page
    const errorMessages = await page.locator('.error, .alert-error, [class*="error"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('❌ Found error messages:', errorMessages);
    }
    
    // Check for success indicators
    const successMessages = await page.locator('.success, .alert-success, [class*="success"]').allTextContents();
    if (successMessages.length > 0) {
      console.log('✅ Found success messages:', successMessages);
    }
    
    // Check if URL changed (indicating redirect)
    if (page.url().includes('/admin/manyreach-import')) {
      console.log('✅ Successfully redirected to admin page!');
      
      // Check for page content
      const h1 = page.locator('h1');
      if (await h1.count() > 0) {
        const h1Text = await h1.textContent();
        console.log('✅ Page title found:', h1Text);
      } else {
        console.log('⚠️ No h1 element found on admin page');
      }
    } else if (page.url().includes('/login')) {
      console.log('❌ Still on login page - login may have failed');
    } else {
      console.log('⚠️ Unexpected URL:', page.url());
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-login-result.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-login-result.png');
  });
});