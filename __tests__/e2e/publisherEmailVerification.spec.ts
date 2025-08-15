import { test, expect, Page } from '@playwright/test';
import { testDb, cleanupTestDatabase } from '../utils/testDatabase';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

// Test data
const testPublisher = {
  email: 'publisher-test@example.com',
  password: 'TestPassword123!',
  contactName: 'Test Publisher',
  companyName: 'Test Publishing Co'
};

test.describe('Publisher Email Verification Flow', () => {
  test.beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestDatabase();
  });

  test.afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('Complete publisher signup and email verification flow', async ({ page }) => {
    // Step 1: Navigate to publisher signup page
    await page.goto('/publisher/signup');
    
    // Verify signup page loads correctly
    await expect(page.getByText('Join as Publisher')).toBeVisible();
    await expect(page.getByText('Create your account and start earning')).toBeVisible();

    // Step 2: Fill out signup form
    await page.fill('input[name="email"]', testPublisher.email);
    await page.fill('input[name="contactName"]', testPublisher.contactName);
    await page.fill('input[name="companyName"]', testPublisher.companyName);
    await page.fill('input[name="password"]', testPublisher.password);
    await page.fill('input[name="confirmPassword"]', testPublisher.password);

    // Step 3: Submit signup form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to verification pending page
    await expect(page).toHaveURL(/\/publisher\/verify-pending/);
    
    // Verify pending page content
    await expect(page.getByText('Check Your Email')).toBeVisible();
    await expect(page.getByText('Account Created Successfully!')).toBeVisible();
    await expect(page.getByText(testPublisher.email)).toBeVisible();

    // Step 4: Verify publisher was created in database with pending status
    const publisherInDb = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testPublisher.email)
    });
    
    expect(publisherInDb).toBeTruthy();
    expect(publisherInDb?.emailVerified).toBe(false);
    expect(publisherInDb?.status).toBe('pending');
    expect(publisherInDb?.emailVerificationToken).toBeTruthy();

    // Step 5: Simulate clicking verification email link
    const verificationToken = publisherInDb?.emailVerificationToken;
    await page.goto(`/publisher/verify?token=${verificationToken}`);

    // Wait for verification to complete
    await expect(page.getByText('Email Verified!')).toBeVisible();
    await expect(page.getByText('Your publisher account has been successfully verified')).toBeVisible();
    await expect(page.getByText(`Welcome, ${testPublisher.contactName}!`)).toBeVisible();

    // Step 6: Verify database was updated
    const verifiedPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testPublisher.email)
    });
    
    expect(verifiedPublisher?.emailVerified).toBe(true);
    expect(verifiedPublisher?.status).toBe('active');
    expect(verifiedPublisher?.emailVerificationToken).toBeNull();

    // Step 7: Navigate to login page and sign in
    await page.click('text=Sign In to Your Account');
    await expect(page).toHaveURL('/publisher/login');

    // Fill login form
    await page.fill('input[type="email"]', testPublisher.email);
    await page.fill('input[type="password"]', testPublisher.password);
    await page.click('button[type="submit"]');

    // Verify successful login and redirect to dashboard
    await expect(page).toHaveURL('/publisher');
    await expect(page.getByText('Publisher Dashboard')).toBeVisible();
  });

  test('Should prevent login with unverified email', async ({ page }) => {
    // Create unverified publisher directly in database
    const publisherId = 'test-unverified-publisher-id';
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(testPublisher.password, 12);

    await testDb.insert(publishers).values({
      id: publisherId,
      email: testPublisher.email,
      password: hashedPassword,
      contactName: testPublisher.contactName,
      companyName: testPublisher.companyName,
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: 'test-token',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Try to login with unverified account
    await page.goto('/publisher/login');
    await page.fill('input[type="email"]', testPublisher.email);
    await page.fill('input[type="password"]', testPublisher.password);
    await page.click('button[type="submit"]');

    // Should show verification error
    await expect(page.getByText('Please verify your email address before signing in')).toBeVisible();
    
    // Should not redirect to dashboard
    await expect(page).toHaveURL('/publisher/login');
  });

  test('Should handle invalid verification token', async ({ page }) => {
    // Navigate to verification page with invalid token
    await page.goto('/publisher/verify?token=invalid-token-123');

    // Should show error message
    await expect(page.getByText('Verification Failed')).toBeVisible();
    await expect(page.getByText('Invalid or expired verification token')).toBeVisible();

    // Should provide recovery options
    await expect(page.getByText('Request New Verification Email')).toBeVisible();
    await expect(page.getByText('Create a New Account')).toBeVisible();
  });

  test('Should allow resending verification email', async ({ page }) => {
    // Create unverified publisher
    const publisherId = 'test-resend-publisher-id';
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(testPublisher.password, 12);

    await testDb.insert(publishers).values({
      id: publisherId,
      email: testPublisher.email,
      password: hashedPassword,
      contactName: testPublisher.contactName,
      companyName: testPublisher.companyName,
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: 'original-token',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Navigate to verification pending page
    await page.goto(`/publisher/verify-pending?email=${encodeURIComponent(testPublisher.email)}`);

    // Click resend button
    await page.click('text=Resend Verification Email');

    // Should show success message
    await expect(page.getByText('Verification email sent successfully!')).toBeVisible();

    // Verify new token was generated in database
    const updatedPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testPublisher.email)
    });
    
    expect(updatedPublisher?.emailVerificationToken).toBeTruthy();
    expect(updatedPublisher?.emailVerificationToken).not.toBe('original-token');
  });

  test('Should validate signup form fields', async ({ page }) => {
    await page.goto('/publisher/signup');

    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors (HTML5 validation)
    const emailInput = page.locator('input[name="email"]');
    const nameInput = page.locator('input[name="contactName"]');
    const passwordInput = page.locator('input[name="password"]');
    
    await expect(emailInput).toHaveAttribute('required');
    await expect(nameInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');

    // Test password mismatch
    await page.fill('input[name="email"]', testPublisher.email);
    await page.fill('input[name="contactName"]', testPublisher.contactName);
    await page.fill('input[name="password"]', testPublisher.password);
    await page.fill('input[name="confirmPassword"]', 'different-password');
    
    await page.click('button[type="submit"]');
    await expect(page.getByText('Passwords do not match')).toBeVisible();

    // Test short password
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="confirmPassword"]', '123');
    
    await page.click('button[type="submit"]');
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', testPublisher.password);
    await page.fill('input[name="confirmPassword"]', testPublisher.password);
    
    await page.click('button[type="submit"]');
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('Should prevent duplicate email registration', async ({ page }) => {
    // Create existing publisher
    const publisherId = 'existing-publisher-id';
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(testPublisher.password, 12);

    await testDb.insert(publishers).values({
      id: publisherId,
      email: testPublisher.email,
      password: hashedPassword,
      contactName: 'Existing Publisher',
      companyName: 'Existing Company',
      status: 'active',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Try to signup with same email
    await page.goto('/publisher/signup');
    await page.fill('input[name="email"]', testPublisher.email);
    await page.fill('input[name="contactName"]', testPublisher.contactName);
    await page.fill('input[name="password"]', testPublisher.password);
    await page.fill('input[name="confirmPassword"]', testPublisher.password);
    
    await page.click('button[type="submit"]');

    // Should show duplicate email error
    await expect(page.getByText('A publisher account with this email already exists')).toBeVisible();
    
    // Should stay on signup page
    await expect(page).toHaveURL('/publisher/signup');
  });

  test('Should handle email verification with missing token', async ({ page }) => {
    // Navigate to verification page without token
    await page.goto('/publisher/verify');

    // Should show error about missing token
    await expect(page.getByText('Verification Failed')).toBeVisible();
    await expect(page.getByText('No verification token provided')).toBeVisible();
  });

  test('Should show loading state during verification', async ({ page }) => {
    // Navigate to verification page with valid-looking token
    await page.goto('/publisher/verify?token=some-token-123');

    // Should initially show loading state
    await expect(page.getByText('Verifying your email...')).toBeVisible();
    
    // Then should show error for invalid token
    await expect(page.getByText('Verification Failed')).toBeVisible();
  });
});

test.describe('Publisher Authentication Integration', () => {
  test.beforeEach(async () => {
    await cleanupTestDatabase();
  });

  test.afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('Should maintain session after successful verification and login', async ({ page }) => {
    // Complete signup flow
    await page.goto('/publisher/signup');
    await page.fill('input[name="email"]', testPublisher.email);
    await page.fill('input[name="contactName"]', testPublisher.contactName);
    await page.fill('input[name="password"]', testPublisher.password);
    await page.fill('input[name="confirmPassword"]', testPublisher.password);
    await page.click('button[type="submit"]');

    // Get verification token from database
    const publisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testPublisher.email)
    });
    
    // Verify email
    await page.goto(`/publisher/verify?token=${publisher?.emailVerificationToken}`);
    await expect(page.getByText('Email Verified!')).toBeVisible();

    // Login
    await page.click('text=Sign In to Your Account');
    await page.fill('input[type="email"]', testPublisher.email);
    await page.fill('input[type="password"]', testPublisher.password);
    await page.click('button[type="submit"]');

    // Should be on dashboard
    await expect(page).toHaveURL('/publisher');

    // Navigate to different publisher pages to test session persistence
    await page.goto('/publisher/offerings');
    await expect(page).toHaveURL('/publisher/offerings');
    
    await page.goto('/publisher/websites');
    await expect(page).toHaveURL('/publisher/websites');

    // Should remain authenticated
    await page.goto('/publisher');
    await expect(page.getByText('Publisher Dashboard')).toBeVisible();
  });
});