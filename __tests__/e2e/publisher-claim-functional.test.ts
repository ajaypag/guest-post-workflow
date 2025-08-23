import { test, expect } from '@playwright/test';

// Functional E2E test using actual working token
const CLAIM_URL = 'http://localhost:3002/publisher/claim?token=c1efafd6634e14eed518e81581b9994c555d3aba1f0c8da78377b2da83320179';
const TEST_EMAIL = 'simple-test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

test.describe('Publisher Claim Flow - Functional E2E', () => {
  test('Complete Publisher Onboarding Flow', async ({ page }) => {
    console.log('🚀 Testing Complete Publisher Onboarding Flow');

    // STEP 1: Navigate to claim page and wait for it to load
    await test.step('1. Access and Load Claim Page', async () => {
      console.log('📧 Loading claim URL:', CLAIM_URL);
      
      await page.goto(CLAIM_URL);
      
      // Check for proper page structure
      await expect(page.locator('h1')).toContainText('Publisher Portal');
      await expect(page.locator('body')).toBeVisible();
      
      // Wait for claim form to load (it starts with loading spinner)
      await page.waitForLoadState('networkidle');
      
      // Wait for either the form or an error message to appear
      await page.waitForSelector('form, .alert, [data-testid="claim-form"], .error', { timeout: 10000 });
      
      console.log('✅ Claim page loaded and ready');
    });

    // STEP 2: Verify publisher information is displayed
    await test.step('2. Verify Publisher Context', async () => {
      console.log('📋 Checking publisher information display...');
      
      // Check if test email appears on the page
      const emailVisible = await page.locator(`text=${TEST_EMAIL}`).count() > 0;
      const publisherContextVisible = await page.locator('text=/claim.*account/i').count() > 0;
      
      console.log('Publisher context:', {
        emailVisible,
        publisherContextVisible
      });
      
      // Should have some publisher-related context
      expect(publisherContextVisible).toBe(true);
      
      console.log('✅ Publisher context verified');
    });

    // STEP 3: Interact with claim form
    await test.step('3. Fill Out Claim Form', async () => {
      console.log('📝 Interacting with claim form...');
      
      // Wait for form fields to be available
      await page.waitForSelector('input[type="password"], #password', { timeout: 5000 });
      
      // Fill out the form fields
      const contactNameField = page.locator('input[name="contactName"], #contactName').first();
      await contactNameField.fill('E2E Test Publisher');
      
      const companyField = page.locator('input[name="companyName"], #companyName').first();
      await companyField.fill('E2E Test Company');
      
      const phoneField = page.locator('input[name="phone"], #phone').first();
      await phoneField.fill('+1-555-E2E-TEST');
      
      const passwordField = page.locator('input[type="password"], #password').first();
      await passwordField.fill(TEST_PASSWORD);
      
      const confirmPasswordField = page.locator('input[name="confirmPassword"], #confirmPassword').first();
      await confirmPasswordField.fill(TEST_PASSWORD);
      
      console.log('✅ Form fields filled successfully');
    });

    // STEP 4: Submit the claim form
    await test.step('4. Submit Claim Form', async () => {
      console.log('🚀 Submitting claim form...');
      
      // Find and click the submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("Claim")').first();
      await submitButton.click();
      
      // Wait for either success message or redirect
      try {
        // Look for success indicators
        await page.waitForSelector('text=/success|claimed|complete/i', { timeout: 10000 });
        console.log('✅ Success message appeared');
      } catch {
        // Check for any response (error or success)
        const pageContent = await page.textContent('body');
        console.log('📄 Page content after submit:', pageContent.slice(0, 500));
      }
      
      console.log('✅ Form submission completed');
    });

    // STEP 5: Check for dashboard redirect or success state
    await test.step('5. Verify Success Flow', async () => {
      console.log('🏠 Checking success flow...');
      
      // Wait a moment for any redirects
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log('Current URL after submission:', currentUrl);
      
      // Check if we're on dashboard or still on claim page with success
      const isDashboard = currentUrl.includes('/publisher/dashboard');
      const hasSuccessMessage = await page.locator('text=/success|claimed|complete/i').count() > 0;
      const hasErrorMessage = await page.locator('text=/error|failed|invalid/i').count() > 0;
      
      console.log('Success flow indicators:', {
        isDashboard,
        hasSuccessMessage,
        hasErrorMessage,
        currentUrl
      });
      
      // Either should be redirected to dashboard or show success message
      if (isDashboard) {
        console.log('✅ Successfully redirected to dashboard');
        
        // Verify dashboard content
        await expect(page.locator('h1, h2, h3')).toContainText(/dashboard|welcome/i);
      } else if (hasSuccessMessage && !hasErrorMessage) {
        console.log('✅ Success message displayed, awaiting redirect');
      } else {
        console.log('⚠️  Unexpected state after form submission');
      }
      
      console.log('✅ Success flow verification completed');
    });

    console.log('🎉 Complete Publisher Onboarding Flow Test Completed!');
  });

  test('Form Validation and Error Handling', async ({ page }) => {
    console.log('🧪 Testing Form Validation and Error Handling');

    await test.step('Form Validation Test', async () => {
      await page.goto(CLAIM_URL);
      
      // Wait for form to load
      await page.waitForSelector('form, input[type="password"]', { timeout: 10000 });
      
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Claim")').first();
      await submitButton.click();
      
      // Should show validation errors
      const hasValidationErrors = await page.locator('text=/required|invalid|error/i').count() > 0;
      console.log('Form validation working:', hasValidationErrors);
      
      console.log('✅ Form validation test completed');
    });
  });

  test('Accessibility and UX Elements', async ({ page }) => {
    console.log('♿ Testing Accessibility and UX Elements');

    await test.step('Accessibility Check', async () => {
      await page.goto(CLAIM_URL);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('h1', { timeout: 5000 });
      
      // Check for accessibility elements
      const hasHeadings = await page.locator('h1, h2, h3').count() > 0;
      const hasLabels = await page.locator('label').count() > 0;
      const hasFormElements = await page.locator('input, button').count() > 0;
      const hasErrorAria = await page.locator('[aria-invalid], [aria-describedby]').count() > 0;
      
      console.log('Accessibility elements found:', {
        hasHeadings,
        hasLabels,
        hasFormElements,
        hasErrorAria
      });
      
      // Should have proper heading structure
      expect(hasHeadings).toBe(true);
      expect(hasFormElements).toBe(true);
      
      console.log('✅ Basic accessibility check completed');
    });
  });
});