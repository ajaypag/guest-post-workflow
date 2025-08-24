import { test, expect } from '@playwright/test';

test.describe('Login Error Test', () => {
  const adminEmail = 'ajay@outreachlabs.com';
  const adminPassword = 'FA64!I$nrbCauS^d';
  const baseURL = 'http://localhost:3001';

  test('Check login errors and console', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Capture network errors
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    console.log('1. Going to login page...');
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');
    
    console.log('2. Checking page content...');
    // Check what's on the page
    const pageTitle = await page.title();
    console.log(`   Page title: ${pageTitle}`);
    
    const h1Text = await page.locator('h1, h2').first().textContent().catch(() => 'No h1/h2 found');
    console.log(`   First heading: ${h1Text}`);
    
    // Check if there's an error message
    const errorMessage = await page.locator('.text-red-500, .error, [role="alert"]').first().textContent().catch(() => null);
    if (errorMessage) {
      console.log(`   Error on page: ${errorMessage}`);
    }
    
    console.log('3. Filling form...');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    
    console.log('4. Submitting form...');
    // Get form action before submit
    const formAction = await page.locator('form').getAttribute('action').catch(() => null);
    console.log(`   Form action: ${formAction}`);
    
    // Click submit and wait for response
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 5000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    
    if (response) {
      console.log(`5. Login API response:`);
      console.log(`   Status: ${response.status()}`);
      const responseBody = await response.json().catch(() => null);
      if (responseBody) {
        console.log(`   Body: ${JSON.stringify(responseBody, null, 2)}`);
      }
    } else {
      console.log('5. No login API call detected');
    }
    
    // Wait a bit for any navigation
    await page.waitForTimeout(3000);
    
    console.log('6. After submit:');
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check for any error messages after submit
    const postSubmitError = await page.locator('.text-red-500, .error, [role="alert"]').first().textContent().catch(() => null);
    if (postSubmitError) {
      console.log(`   Error after submit: ${postSubmitError}`);
    }
    
    console.log('\n7. Console messages:');
    consoleMessages.forEach(msg => console.log(`   ${msg}`));
    
    console.log('\n8. Failed requests:');
    failedRequests.forEach(req => console.log(`   ${req}`));
    
    // Try to check cookies
    const cookies = await page.context().cookies();
    console.log('\n9. Cookies:');
    cookies.forEach(cookie => {
      if (cookie.name.includes('auth') || cookie.name.includes('session')) {
        console.log(`   ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
      }
    });
    
    // Check if we can access a protected route
    console.log('\n10. Testing protected route access...');
    await page.goto(`${baseURL}/accounts`);
    await page.waitForLoadState('networkidle');
    
    const protectedUrl = page.url();
    console.log(`   URL after navigating to /accounts: ${protectedUrl}`);
    
    if (protectedUrl.includes('/login')) {
      console.log('   ❌ Redirected to login - authentication failed');
    } else if (protectedUrl.includes('/accounts')) {
      console.log('   ✅ Stayed on /accounts - authentication successful');
    }
  });
});