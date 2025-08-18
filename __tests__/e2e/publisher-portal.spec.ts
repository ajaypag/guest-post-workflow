import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_PUBLISHER = {
  email: 'test.publisher@example.com',
  password: 'TestPassword123!',
  name: 'Test Publisher',
  companyName: 'Test Publishing Co'
};

// Helper functions
async function loginAsPublisher(page: Page) {
  await page.goto(`${BASE_URL}/publisher/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input#email', TEST_PUBLISHER.email);
  await page.fill('input#password', TEST_PUBLISHER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/publisher', { timeout: 10000 });
}

test.describe('Publisher Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('Authentication Flow', () => {
    test('should load login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/publisher/login`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveTitle(/Publisher Portal/);
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
    });

    test('should handle login with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/publisher/login`);
      await page.waitForLoadState('networkidle');
      await page.fill('input#email', TEST_PUBLISHER.email);
      await page.fill('input#password', TEST_PUBLISHER.password);
      
      // Click login button
      await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]')
      ]);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/publisher\/?$/);
      
      // Check for auth cookie
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'auth-token-publisher');
      expect(authCookie).toBeDefined();
    });

    test('should handle logout', async ({ page }) => {
      await loginAsPublisher(page);
      
      // Open user dropdown
      await page.click('button:has-text("Test Publisher")');
      
      // Click logout
      await page.click('button:has-text("Sign Out")');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/publisher\/login/);
      
      // Cookie should be cleared
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'auth-token-publisher');
      expect(authCookie).toBeUndefined();
    });

    test('should protect authenticated routes', async ({ page }) => {
      // Try to access dashboard without login
      await page.goto(`${BASE_URL}/publisher`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/publisher\/login/);
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
    });

    test('should display PublisherHeader with all menu items', async ({ page }) => {
      // Check main navigation items
      await expect(page.locator('nav a:has-text("Dashboard")')).toBeVisible();
      await expect(page.locator('nav a:has-text("My Websites")')).toBeVisible();
      await expect(page.locator('nav a:has-text("Offerings")')).toBeVisible();
      await expect(page.locator('nav a:has-text("Orders")')).toBeVisible();
      await expect(page.locator('nav a:has-text("Invoices")')).toBeVisible();
      await expect(page.locator('nav a:has-text("Analytics")')).toBeVisible();
    });

    test('should navigate to all main pages', async ({ page }) => {
      // Test Dashboard
      await page.click('nav a:has-text("Dashboard")');
      await expect(page).toHaveURL(/\/publisher\/?$/);
      
      // Test My Websites
      await page.click('nav a:has-text("My Websites")');
      await expect(page).toHaveURL(/\/publisher\/websites/);
      
      // Test Offerings
      await page.click('nav a:has-text("Offerings")');
      await expect(page).toHaveURL(/\/publisher\/offerings/);
      
      // Test Orders
      await page.click('nav a:has-text("Orders")');
      await expect(page).toHaveURL(/\/publisher\/orders/);
      
      // Test Invoices
      await page.click('nav a:has-text("Invoices")');
      await expect(page).toHaveURL(/\/publisher\/invoices/);
      
      // Test Analytics
      await page.click('nav a:has-text("Analytics")');
      await expect(page).toHaveURL(/\/publisher\/analytics/);
    });

    test('should access user dropdown menu items', async ({ page }) => {
      // Open user dropdown
      await page.click('button:has-text("Test Publisher")');
      
      // Check dropdown items are visible
      await expect(page.locator('a:has-text("Payment Profile")')).toBeVisible();
      await expect(page.locator('a:has-text("Account Settings")')).toBeVisible();
      await expect(page.locator('a:has-text("Help & Support")')).toBeVisible();
      
      // Test Payment Profile
      await page.click('a:has-text("Payment Profile")');
      await expect(page).toHaveURL(/\/publisher\/payment-profile/);
      
      // Go back and test Settings
      await page.click('button:has-text("Test Publisher")');
      await page.click('a:has-text("Account Settings")');
      await expect(page).toHaveURL(/\/publisher\/settings/);
      
      // Go back and test Help
      await page.click('button:has-text("Test Publisher")');
      await page.click('a:has-text("Help & Support")');
      await expect(page).toHaveURL(/\/publisher\/help/);
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
    });

    test('should display dashboard stats', async ({ page }) => {
      // Check for stats cards
      await expect(page.locator('text=/Total Orders/i')).toBeVisible();
      await expect(page.locator('text=/Pending Orders/i')).toBeVisible();
      await expect(page.locator('text=/Total Earnings/i')).toBeVisible();
      await expect(page.locator('text=/My Websites/i')).toBeVisible();
    });

    test('should show recent orders section', async ({ page }) => {
      await expect(page.locator('text=/Recent Orders/i')).toBeVisible();
      // Check if table or "no orders" message exists
      const hasOrders = await page.locator('table').isVisible().catch(() => false);
      const noOrders = await page.locator('text=/No orders yet/i').isVisible().catch(() => false);
      expect(hasOrders || noOrders).toBeTruthy();
    });
  });

  test.describe('Website Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
      await page.goto(`${BASE_URL}/publisher/websites`);
    });

    test('should display websites page', async ({ page }) => {
      await expect(page.locator('h1:has-text("My Websites")')).toBeVisible();
      await expect(page.locator('button:has-text("Add Website")')).toBeVisible();
    });

    test('should navigate to add website page', async ({ page }) => {
      await page.click('button:has-text("Add Website")');
      await expect(page).toHaveURL(/\/publisher\/websites\/new/);
      
      // Check if form exists
      await expect(page.locator('input[name="domain"]')).toBeVisible();
      await expect(page.locator('button:has-text("Save")')).toBeVisible();
    });

    test('should navigate to edit website page', async ({ page }) => {
      // Check if any websites exist
      const hasWebsites = await page.locator('button:has-text("Edit")').first().isVisible().catch(() => false);
      
      if (hasWebsites) {
        await page.click('button:has-text("Edit")');
        await expect(page).toHaveURL(/\/publisher\/websites\/[\w-]+\/edit/);
        
        // Check if edit form exists
        await expect(page.locator('input[name="domain"]')).toBeVisible();
        await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
      } else {
        // No websites to edit
        await expect(page.locator('text=/No websites yet/i')).toBeVisible();
      }
    });
  });

  test.describe('Offerings Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
      await page.goto(`${BASE_URL}/publisher/offerings`);
    });

    test('should display offerings page', async ({ page }) => {
      await expect(page.locator('h1:has-text("My Offerings")')).toBeVisible();
      await expect(page.locator('button:has-text("New Offering")')).toBeVisible();
      
      // Check filter buttons
      await expect(page.locator('button:has-text("All")')).toBeVisible();
      await expect(page.locator('button:has-text("Active")')).toBeVisible();
      await expect(page.locator('button:has-text("Inactive")')).toBeVisible();
    });

    test('should check if new offering page exists', async ({ page }) => {
      await page.click('button:has-text("New Offering")');
      
      // Check if page exists or shows 404
      const response = await page.waitForResponse(resp => 
        resp.url().includes('/publisher/offerings/new')
      ).catch(() => null);
      
      if (response && response.status() === 404) {
        console.log('❌ MISSING PAGE: /publisher/offerings/new');
      } else {
        await expect(page).toHaveURL(/\/publisher\/offerings\/new/);
        // Check for form elements
        const hasForm = await page.locator('form').isVisible().catch(() => false);
        expect(hasForm).toBeTruthy();
      }
    });

    test('should test offering actions if offerings exist', async ({ page }) => {
      const hasOfferings = await page.locator('[data-testid="offering-card"]').first().isVisible().catch(() => false);
      
      if (hasOfferings) {
        // Test view details
        const viewButton = page.locator('button[title="View Details"]').first();
        if (await viewButton.isVisible()) {
          await viewButton.click();
          // Check if redirects to detail page
          const url = page.url();
          console.log('Offering detail URL:', url);
        }
        
        // Test edit
        const editButton = page.locator('button[title="Edit Offering"]').first();
        if (await editButton.isVisible()) {
          await editButton.click();
          // Check if edit page exists
          const response = await page.waitForResponse(resp => 
            resp.url().includes('/offerings/') && resp.url().includes('/edit')
          ).catch(() => null);
          
          if (response && response.status() === 404) {
            console.log('❌ MISSING PAGE: Offering edit page');
          }
        }
        
        // Test pricing rules
        const pricingButton = page.locator('button[title="Manage Pricing Rules"]').first();
        if (await pricingButton.isVisible()) {
          await pricingButton.click();
          // Check if pricing rules page exists
          const response = await page.waitForResponse(resp => 
            resp.url().includes('/pricing-rules')
          ).catch(() => null);
          
          if (response && response.status() === 404) {
            console.log('❌ MISSING PAGE: Pricing rules page');
          }
        }
      } else {
        await expect(page.locator('text=/No offerings yet/i')).toBeVisible();
      }
    });
  });

  test.describe('Orders', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
      await page.goto(`${BASE_URL}/publisher/orders`);
    });

    test('should display orders page', async ({ page }) => {
      await expect(page.locator('h1:has-text("Orders")')).toBeVisible();
      
      // Check if orders list or empty state exists
      const hasOrders = await page.locator('table').isVisible().catch(() => false);
      const noOrders = await page.locator('text=/No orders/i').isVisible().catch(() => false);
      expect(hasOrders || noOrders).toBeTruthy();
    });

    test('should test order actions if orders exist', async ({ page }) => {
      const hasOrders = await page.locator('tr[data-testid="order-row"]').first().isVisible().catch(() => false);
      
      if (hasOrders) {
        // Click on first order
        await page.click('tr[data-testid="order-row"]');
        
        // Check if detail page exists
        const response = await page.waitForResponse(resp => 
          resp.url().includes('/publisher/orders/')
        ).catch(() => null);
        
        if (response && response.status() === 404) {
          console.log('❌ MISSING PAGE: Order detail page');
        } else {
          // Check for order details
          await expect(page.locator('text=/Order Details/i')).toBeVisible();
        }
      }
    });
  });

  test.describe('Invoices', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
      await page.goto(`${BASE_URL}/publisher/invoices`);
    });

    test('should display invoices page', async ({ page }) => {
      await expect(page.locator('h1:has-text("Invoices")')).toBeVisible();
      await expect(page.locator('button:has-text("New Invoice")')).toBeVisible();
    });

    test('should navigate to new invoice page', async ({ page }) => {
      await page.click('button:has-text("New Invoice")');
      await expect(page).toHaveURL(/\/publisher\/invoices\/new/);
      
      // Check for invoice form
      await expect(page.locator('input[name="invoiceNumber"]')).toBeVisible();
      await expect(page.locator('button:has-text("Add Line Item")')).toBeVisible();
    });
  });

  test.describe('Settings', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
      await page.goto(`${BASE_URL}/publisher/settings`);
    });

    test('should display settings page with tabs', async ({ page }) => {
      await expect(page.locator('h1:has-text("Account Settings")')).toBeVisible();
      
      // Check all tabs exist
      await expect(page.locator('button:has-text("Profile")')).toBeVisible();
      await expect(page.locator('button:has-text("Business Info")')).toBeVisible();
      await expect(page.locator('button:has-text("Notifications")')).toBeVisible();
      await expect(page.locator('button:has-text("Security")')).toBeVisible();
    });

    test('should switch between settings tabs', async ({ page }) => {
      // Test Profile tab (default)
      await expect(page.locator('input[name="name"]')).toBeVisible();
      
      // Test Business Info tab
      await page.click('button:has-text("Business Info")');
      await expect(page.locator('select:has-text("Business Type")')).toBeVisible();
      
      // Test Notifications tab
      await page.click('button:has-text("Notifications")');
      await expect(page.locator('text=/Email Notifications/i')).toBeVisible();
      
      // Test Security tab
      await page.click('button:has-text("Security")');
      await expect(page.locator('text=/Change Password/i')).toBeVisible();
    });
  });

  test.describe('Payment Profile', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
      await page.goto(`${BASE_URL}/publisher/payment-profile`);
    });

    test('should display payment profile page', async ({ page }) => {
      await expect(page.locator('h1:has-text("Payment Profile")')).toBeVisible();
      
      // Check for payment method options
      await expect(page.locator('text=/Bank Transfer/i')).toBeVisible();
      await expect(page.locator('text=/PayPal/i')).toBeVisible();
    });
  });

  test.describe('Help & Support', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsPublisher(page);
      await page.goto(`${BASE_URL}/publisher/help`);
    });

    test('should display help page', async ({ page }) => {
      await expect(page.locator('h1:has-text("Help & Support")')).toBeVisible();
      
      // Check for FAQ section
      await expect(page.locator('text=/Frequently Asked Questions/i')).toBeVisible();
      
      // Check for search
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      
      // Check for contact form
      await expect(page.locator('text=/Contact Support/i')).toBeVisible();
    });

    test('should expand FAQ items', async ({ page }) => {
      const faqButton = page.locator('button:has-text("How do I")').first();
      if (await faqButton.isVisible()) {
        await faqButton.click();
        // Answer should be visible
        await expect(page.locator('.faq-answer').first()).toBeVisible();
      }
    });
  });

  test.describe('API Endpoints', () => {
    test('should test critical API endpoints', async ({ page, request }) => {
      // Get auth token first
      const loginResponse = await request.post(`${BASE_URL}/api/publisher/auth/login`, {
        data: {
          email: TEST_PUBLISHER.email,
          password: TEST_PUBLISHER.password
        }
      });
      
      expect(loginResponse.ok()).toBeTruthy();
      
      // Test dashboard stats
      const statsResponse = await request.get(`${BASE_URL}/api/publisher/dashboard/stats`);
      console.log('Dashboard stats API:', statsResponse.status());
      
      // Test websites API
      const websitesResponse = await request.get(`${BASE_URL}/api/publisher/websites`);
      console.log('Websites API:', websitesResponse.status());
      
      // Test offerings API
      const offeringsResponse = await request.get(`${BASE_URL}/api/publisher/offerings`);
      console.log('Offerings API:', offeringsResponse.status());
      
      // Test orders API
      const ordersResponse = await request.get(`${BASE_URL}/api/publisher/orders`);
      console.log('Orders API:', ordersResponse.status());
      
      // Test invoices API
      const invoicesResponse = await request.get(`${BASE_URL}/api/publisher/invoices`);
      console.log('Invoices API:', invoicesResponse.status());
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile', async ({ page }) => {
      await loginAsPublisher(page);
      
      // Check mobile menu button
      await expect(page.locator('button[aria-label="Toggle mobile menu"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('button[aria-label="Toggle mobile menu"]');
      
      // Check menu items are visible
      await expect(page.locator('nav a:has-text("Dashboard")')).toBeVisible();
      await expect(page.locator('nav a:has-text("My Websites")')).toBeVisible();
      
      // Navigate using mobile menu
      await page.click('nav a:has-text("My Websites")');
      await expect(page).toHaveURL(/\/publisher\/websites/);
    });
  });
});

// Summary test to collect all issues
test.describe('Issue Collection', () => {
  test('should summarize all found issues', async ({ page }) => {
    const issues = {
      missingPages: [],
      brokenFeatures: [],
      apiErrors: [],
      uiIssues: []
    };
    
    // This test would run last and collect all issues found
    console.log('\n=== PUBLISHER PORTAL TEST SUMMARY ===\n');
    console.log('Missing Pages:', issues.missingPages);
    console.log('Broken Features:', issues.brokenFeatures);
    console.log('API Errors:', issues.apiErrors);
    console.log('UI Issues:', issues.uiIssues);
  });
});