import { test, expect } from '@playwright/test';

test('debug publisher login', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Page error:', error.message));
  
  // Monitor network requests
  page.on('response', response => {
    if (response.url().includes('/api/auth/publisher/login')) {
      console.log('Login API response:', response.status(), response.statusText());
    }
  });

  console.log('1. Navigating to login page...');
  await page.goto('/publisher/login');
  await page.waitForLoadState('networkidle');
  
  console.log('2. Page loaded, checking elements...');
  const emailInput = page.locator('input#email');
  const passwordInput = page.locator('input#password');
  const submitButton = page.locator('button[type="submit"]');
  
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitButton).toBeVisible();
  console.log('✅ All form elements visible');
  
  console.log('3. Filling in credentials...');
  await emailInput.fill('test.publisher@example.com');
  await passwordInput.fill('TestPassword123!');
  
  console.log('4. Clicking submit button...');
  
  // Try to catch the response
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/auth/publisher/login'),
    { timeout: 5000 }
  ).catch(err => {
    console.log('No API response received:', err.message);
    return null;
  });
  
  await submitButton.click();
  
  const response = await responsePromise;
  if (response) {
    console.log('5. API Response received:', response.status());
    const body = await response.json().catch(() => null);
    console.log('Response body:', body);
  }
  
  // Check if we're still on login page or redirected
  await page.waitForTimeout(3000); // Wait 3 seconds
  const currentUrl = page.url();
  console.log('6. Current URL after login attempt:', currentUrl);
  
  // Check for error messages
  const errorMessage = page.locator('.text-red-700');
  const hasError = await errorMessage.isVisible().catch(() => false);
  if (hasError) {
    console.log('❌ Error message displayed:', await errorMessage.textContent());
  }
  
  // Check cookies
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name === 'auth-token-publisher');
  console.log('7. Auth cookie present?', authCookie ? 'Yes' : 'No');
  
  // Try manual navigation to dashboard
  console.log('8. Trying manual navigation to dashboard...');
  await page.goto('/publisher');
  await page.waitForTimeout(2000);
  console.log('Dashboard URL:', page.url());
  
  // Check if we're redirected back to login
  if (page.url().includes('/login')) {
    console.log('❌ Redirected back to login - authentication failed');
  } else {
    console.log('✅ On publisher dashboard');
  }
});