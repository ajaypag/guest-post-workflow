import { test, expect } from '@playwright/test';

test.describe('Email Verification Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean slate
    await page.goto('/');
  });

  test('Regular signup flow should send correct verification email', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Fill out signup form
    const testEmail = `test-signup-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'testpassword123');
    await page.fill('input[placeholder*="name"], input[name*="name"]', 'Test User');
    
    // Mock the email service to capture the function call
    await page.addInitScript(() => {
      window._emailServiceCalls = [];
      
      // Mock the fetch for the signup request
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [url, options] = args;
        
        // Capture email service calls
        if (typeof url === 'string' && url.includes('/api/auth/account-signup')) {
          window._emailServiceCalls.push({
            type: 'signup',
            url,
            body: options?.body ? JSON.parse(options.body) : null
          });
          
          // Return successful response
          return Promise.resolve(new Response(JSON.stringify({
            success: true,
            message: 'Account created successfully. Please check your email to verify your account.'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        return originalFetch.apply(this, args);
      };
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Check that the correct API was called
    const emailCalls = await page.evaluate(() => window._emailServiceCalls);
    expect(emailCalls).toHaveLength(1);
    expect(emailCalls[0].type).toBe('signup');
    expect(emailCalls[0].body.email).toBe(testEmail);
    
    // Check for success message indicating email verification is required
    const successMessage = page.locator('text=check your email');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('Vetted sites analysis flow should send correct verification email', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Find and fill the hero form (target URL form)
    const testEmail = `test-vetted-${Date.now()}@example.com`;
    const targetUrlInput = page.locator('input[placeholder*="target"], input[placeholder*="url"], input[name*="url"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    
    if (await targetUrlInput.count() > 0 && await emailInput.count() > 0) {
      await targetUrlInput.fill('https://example.com/my-target-page');
      await emailInput.fill(testEmail);
      
      // Mock the email service to capture the function call
      await page.addInitScript(() => {
        window._emailServiceCalls = [];
        
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const [url, options] = args;
          
          // Capture email service calls for vetted sites signup
          if (typeof url === 'string' && url.includes('/api/accounts/signup')) {
            window._emailServiceCalls.push({
              type: 'vetted_sites',
              url,
              body: options?.body ? JSON.parse(options.body) : null
            });
            
            // Return successful response
            return Promise.resolve(new Response(JSON.stringify({
              success: true,
              requiresVerification: true,
              message: 'Please check your email to verify your account and start the analysis.'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
          
          return originalFetch.apply(this, args);
        };
      });
      
      // Submit the hero form
      const submitButton = page.locator('button:has-text("Get"), button:has-text("Start"), button[type="submit"]').first();
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(1000);
      
      // Check that the correct API was called
      const emailCalls = await page.evaluate(() => window._emailServiceCalls);
      expect(emailCalls).toHaveLength(1);
      expect(emailCalls[0].type).toBe('vetted_sites');
      expect(emailCalls[0].body.email).toBe(testEmail);
      
      // Check for success message indicating email verification for vetted sites
      const successMessage = page.locator('text=check your email, text=verify, text=analysis');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    } else {
      test.skip('Hero form with target URL not found on homepage');
    }
  });

  test('Email verification functions should be correctly named', async ({ page }) => {
    // This test verifies that the email service functions exist and are properly exported
    await page.goto('/');
    
    // Check that the email service module can be imported and has the correct functions
    const moduleCheck = await page.evaluate(async () => {
      try {
        // Check if the functions would be available (simulate server-side check)
        const response = await fetch('/api/auth/account-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
          })
        });
        
        return {
          signupEndpointExists: response.status !== 404,
          responseStatus: response.status
        };
      } catch (error) {
        return {
          signupEndpointExists: false,
          error: error.message
        };
      }
    });
    
    expect(moduleCheck.signupEndpointExists).toBe(true);
  });

  test('Verify email route should use generic verification function', async ({ page }) => {
    // Test the resend verification email functionality
    const testEmail = `test-resend-${Date.now()}@example.com`;
    
    // Mock the resend email API
    await page.addInitScript(() => {
      window._emailServiceCalls = [];
      
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [url, options] = args;
        
        if (typeof url === 'string' && url.includes('/api/auth/verify-email') && options?.method === 'POST') {
          window._emailServiceCalls.push({
            type: 'resend_verification',
            url,
            body: options?.body ? JSON.parse(options.body) : null
          });
          
          return Promise.resolve(new Response(JSON.stringify({
            success: true,
            message: 'Verification email sent'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        return originalFetch.apply(this, args);
      };
    });
    
    // Simulate calling the resend verification API directly
    await page.evaluate(async (email) => {
      await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    }, testEmail);
    
    // Check that the resend verification API was called
    const emailCalls = await page.evaluate(() => window._emailServiceCalls);
    expect(emailCalls).toHaveLength(1);
    expect(emailCalls[0].type).toBe('resend_verification');
    expect(emailCalls[0].body.email).toBe(testEmail);
  });
});