import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { PublisherManagementPage } from './page-objects/PublisherManagementPage';
import { PublisherDetailPage } from './page-objects/PublisherDetailPage';
import { DatabaseHelpers } from './helpers/databaseHelpers';
import { TestDataFactory, CREDENTIALS } from './helpers/testData';

/**
 * SECURITY AND AUTHORIZATION TESTS
 * 
 * These tests verify that the security model is properly implemented for internal
 * user access to publisher functionality. They test both positive and negative
 * authorization scenarios to ensure proper access control.
 */

test.describe('Security and Authorization Tests', () => {
  let loginPage: LoginPage;
  let publisherManagement: PublisherManagementPage;
  let publisherDetail: PublisherDetailPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    publisherManagement = new PublisherManagementPage(page);
    publisherDetail = new PublisherDetailPage(page);

    await DatabaseHelpers.cleanupTestData();
  });

  test.afterEach(async () => {
    await DatabaseHelpers.cleanupTestData();
  });

  test.describe('Authentication Requirements', () => {
    test('Unauthenticated users should be redirected to login', async ({ page }) => {
      // Try to access publisher management without authentication
      await page.goto('/internal/publishers');

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('text=Please log in')).toBeVisible();
    });

    test('Authenticated internal users should access publisher pages', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Should be able to access publisher management
      await publisherManagement.goto();
      await expect(publisherManagement.pageTitle).toBeVisible();

      // Should be able to access other internal pages
      await page.goto('/internal/websites');
      await expect(page.locator('h1')).toBeVisible();

      await page.goto('/internal/analytics');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('Session expiry should require re-authentication', async ({ page }) => {
      await loginPage.loginAsInternalUser();
      await publisherManagement.goto();

      // Simulate session expiry by clearing cookies
      await page.context().clearCookies();

      // Try to access protected resource
      await page.goto('/internal/publishers/new');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Authorization by User Type', () => {
    test('Publisher users should NOT access internal publisher management', async ({ page }) => {
      const testPublisher = TestDataFactory.createPublisher();
      await DatabaseHelpers.createTestPublisher(testPublisher);

      // Try to login as publisher user (if this login flow exists)
      await page.goto('/publisher/login');
      
      // If publisher login exists, test it
      const hasPublisherLogin = await page.locator('input[type="email"]').isVisible();
      
      if (hasPublisherLogin) {
        await page.fill('input[type="email"]', testPublisher.email);
        await page.fill('input[type="password"]', testPublisher.password);
        await page.click('button[type="submit"]');

        // Try to access internal pages
        await page.goto('/internal/publishers');

        // Should be denied access (401, 403, or redirect)
        const currentURL = page.url();
        const isBlocked = currentURL.includes('/unauthorized') || 
                         currentURL.includes('/403') ||
                         currentURL.includes('/publisher/') ||
                         await page.locator('text=Access Denied').isVisible() ||
                         await page.locator('text=403').isVisible() ||
                         await page.locator('text=Unauthorized').isVisible();

        expect(isBlocked).toBe(true);
      } else {
        console.log('Publisher login not implemented - test skipped');
      }
    });

    test('Account users should NOT access internal publisher management', async ({ page }) => {
      // Try to access as account user (advertiser)
      // This would require creating an account user and testing their access
      await page.goto('/login');
      
      // Try with a hypothetical account user
      await page.fill('input[type="email"]', 'account-user@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Check if login succeeded (might fail if user doesn't exist)
      const loginFailed = await page.locator('text=Invalid').isVisible() ||
                          await page.locator('text=Error').isVisible() ||
                          page.url().includes('/login');

      if (!loginFailed) {
        // If login succeeded, check access to internal pages
        await page.goto('/internal/publishers');

        const isBlocked = page.url().includes('/unauthorized') || 
                         page.url().includes('/403') ||
                         await page.locator('text=Access Denied').isVisible();

        expect(isBlocked).toBe(true);
      }
    });

    test('Internal admin users should have full access', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Should access all internal publisher functions
      const protectedPages = [
        '/internal/publishers',
        '/internal/publishers/new',
        '/internal/websites',
        '/internal/analytics',
        '/internal/settings',
      ];

      for (const pageURL of protectedPages) {
        await page.goto(pageURL);
        
        // Should not see access denied messages
        const hasAccess = !await page.locator('text=Access Denied').isVisible() &&
                         !await page.locator('text=403').isVisible() &&
                         !await page.locator('text=Unauthorized').isVisible();

        expect(hasAccess).toBe(true);
      }
    });

    test('Internal regular users should have limited access', async ({ page }) => {
      // Create internal user with 'user' role (not admin)
      const regularUser = TestDataFactory.createInternalUser({
        role: 'user', // Not admin
        email: `regular-user-${Date.now()}@linkio.com`,
      });

      await DatabaseHelpers.createTestInternalUser(regularUser);

      // Login as regular user
      await loginPage.goto();
      await loginPage.login(regularUser.email, regularUser.password);

      // Should access read-only functions
      await publisherManagement.goto();
      await expect(publisherManagement.pageTitle).toBeVisible();

      // Should NOT see admin-only functions
      const adminOnlyElements = [
        page.locator('button:has-text("Delete")'),
        page.locator('button:has-text("Suspend")'),
        page.locator('a[href*="/admin"]'),
        page.locator('button:has-text("Bulk Actions")'),
      ];

      for (const element of adminOnlyElements) {
        await expect(element).not.toBeVisible();
      }
    });
  });

  test.describe('API Security', () => {
    test('Internal API endpoints should require proper authentication', async ({ page }) => {
      // Test API endpoints without authentication
      const apiEndpoints = [
        '/api/publisher',
        '/api/publisher/offerings', 
        '/api/websites',
        '/api/internal/analytics',
      ];

      for (const endpoint of apiEndpoints) {
        const response = await page.request.get(endpoint);
        
        // Should return 401 Unauthorized
        expect(response.status()).toBe(401);
      }
    });

    test('Internal API endpoints should accept valid internal user tokens', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Test API endpoints with authentication
      const apiTests = [
        { endpoint: '/api/publisher', method: 'GET' },
        { endpoint: '/api/websites', method: 'GET' },
      ];

      for (const apiTest of apiTests) {
        const response = await page.request.get(apiTest.endpoint);
        
        // Should return 200 OK or other success status
        expect([200, 201, 204]).toContain(response.status());
      }
    });

    test('API should prevent CSRF attacks', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Test POST request without CSRF token
      const response = await page.request.post('/api/publisher', {
        data: {
          email: 'test@example.com',
          companyName: 'Test Company',
        },
        headers: {
          'Content-Type': 'application/json',
          // Intentionally omit CSRF token
        },
      });

      // Should be rejected due to missing CSRF protection
      expect([403, 422]).toContain(response.status());
    });

    test('API should validate input data to prevent injection', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Test SQL injection attempts
      const maliciousInputs = [
        "'; DROP TABLE publishers; --",
        "<script>alert('xss')</script>",
        "' OR '1'='1",
        "../../../etc/passwd",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await page.request.post('/api/publisher', {
          data: {
            email: maliciousInput,
            companyName: maliciousInput,
            contactName: maliciousInput,
          },
        });

        // Should reject malicious input
        expect([400, 422]).toContain(response.status());
      }
    });
  });

  test.describe('Data Access Controls', () => {
    test('Internal users should only see appropriate publisher data', async ({ page }) => {
      const sensitivePublisher = TestDataFactory.createPublisher({
        email: 'sensitive-publisher@test.com',
        companyName: 'Sensitive Company',
      });

      const regularPublisher = TestDataFactory.createPublisher({
        email: 'regular-publisher@test.com',
        companyName: 'Regular Company',
      });

      await DatabaseHelpers.createTestPublisher(sensitivePublisher);
      await DatabaseHelpers.createTestPublisher(regularPublisher);

      await loginPage.loginAsInternalUser();
      await publisherManagement.goto();

      // Should see both publishers (internal users see all)
      await publisherManagement.expectPublisherInTable(sensitivePublisher.email);
      await publisherManagement.expectPublisherInTable(regularPublisher.email);

      // Should see sensitive data (internal users have full access)
      await publisherDetail.goto(sensitivePublisher.id);
      await expect(page.locator('text=' + sensitivePublisher.email)).toBeVisible();
      await expect(page.locator('text=' + sensitivePublisher.companyName)).toBeVisible();
    });

    test('Should not expose sensitive data in client-side code', async ({ page }) => {
      const testPublisher = TestDataFactory.createPublisher();
      await DatabaseHelpers.createTestPublisher(testPublisher);

      await loginPage.loginAsInternalUser();
      await publisherDetail.goto(testPublisher.id);

      // Check page source for sensitive data exposure
      const pageContent = await page.content();
      
      // Should not expose password hashes in HTML
      expect(pageContent).not.toContain('password_hash');
      expect(pageContent).not.toContain('$2b$');
      
      // Should not expose internal notes in client code
      expect(pageContent).not.toContain('internal_notes');
      
      // Should not expose API keys or tokens
      expect(pageContent).not.toContain('api_key');
      expect(pageContent).not.toContain('secret_key');
    });

    test('Should audit sensitive actions', async ({ page }) => {
      const testPublisher = TestDataFactory.createPublisher();
      await DatabaseHelpers.createTestPublisher(testPublisher);

      await loginPage.loginAsInternalUser();
      await publisherDetail.goto(testPublisher.id);

      // Perform sensitive action (verification)
      await publisherDetail.clickVerify();

      // Should create audit log entry
      await page.goto('/internal/audit-log');
      
      // Should see audit entry for verification action
      await expect(page.locator(`text=${testPublisher.companyName}`)).toBeVisible();
      await expect(page.locator('text=Publisher verified')).toBeVisible();
      await expect(page.locator('text=' + CREDENTIALS.INTERNAL_ADMIN.email)).toBeVisible();
    });
  });

  test.describe('Rate Limiting and Abuse Prevention', () => {
    test('Should rate limit API requests', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Make rapid API requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(page.request.get('/api/publisher'));
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedRequests = responses.filter(r => r.status() === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    test('Should prevent brute force login attempts', async ({ page }) => {
      // Attempt multiple failed logins
      for (let i = 0; i < 10; i++) {
        await loginPage.goto();
        await loginPage.login('wrong@email.com', 'wrongpassword');
        await page.waitForTimeout(100);
      }

      // Should show rate limiting or account lockout
      await expect(page.locator('text=Too many attempts')).toBeVisible();
    });

    test('Should validate file uploads securely', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Try to upload malicious file (if file upload exists)
      await page.goto('/internal/publishers/import');
      
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Create malicious file content
        const maliciousContent = `
          <?php
          system($_GET['cmd']);
          ?>
        `;

        // Try to upload PHP file
        await fileInput.setInputFiles({
          name: 'malicious.php',
          mimeType: 'application/x-php',
          buffer: Buffer.from(maliciousContent),
        });

        await page.click('button:has-text("Upload")');

        // Should reject malicious file
        await expect(page.locator('text=Invalid file type')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling Security', () => {
    test('Should not expose sensitive information in error messages', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Try to access non-existent publisher
      await page.goto('/internal/publishers/non-existent-id');

      // Error message should not expose database structure
      const pageContent = await page.content();
      expect(pageContent).not.toContain('SELECT');
      expect(pageContent).not.toContain('database');
      expect(pageContent).not.toContain('postgres');
      expect(pageContent).not.toContain('connection');
      
      // Should show generic error message
      await expect(page.locator('text=Publisher not found')).toBeVisible();
    });

    test('Should handle errors gracefully without exposing stack traces', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Trigger server error with invalid data
      const response = await page.request.post('/api/publisher', {
        data: {
          email: 'invalid-email',
          // Missing required fields
        },
      });

      const responseText = await response.text();
      
      // Should not expose stack traces
      expect(responseText).not.toContain('Error:');
      expect(responseText).not.toContain('at ');
      expect(responseText).not.toContain('.js:');
      expect(responseText).not.toContain('node_modules');
    });

    test('Should sanitize user input in error messages', async ({ page }) => {
      await loginPage.loginAsInternalUser();

      // Try to create publisher with XSS payload in name
      const xssPayload = '<script>alert("xss")</script>';
      
      await publisherManagement.goto();
      await publisherManagement.clickAddPublisher();

      await page.fill('input[name="companyName"]', xssPayload);
      await page.click('button[type="submit"]');

      // Error message should not execute script
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>');
      
      // Should be properly escaped
      expect(pageContent).toContain('&lt;script&gt;');
    });
  });
});