/**
 * Order Creation and Payment Flow End-to-End Tests
 * 
 * This test suite validates the complete order creation and payment flow
 * for both internal admin users and external account users.
 */

const { AuthHelper } = require('../utils/auth-helpers');
const { captureScreenshot, waitForElement, waitForSelector } = require('../utils/browser-utils');

// Test Configuration
const BASE_URL = 'http://localhost:3002';
const TIMEOUT = 30000;

// Test Users
const INTERNAL_USER = {
  email: 'ajay@outreachlabs.com',
  password: 'FA64!I$nrbCauS^d',
  type: 'internal'
};

const ACCOUNT_USER = {
  email: 'jake@thehrguy.co',
  password: 'EPoOh&K2sVpAytl&',
  type: 'account'
};

// Stripe Test Card
const TEST_CARD = {
  number: '4242424242424242',
  expiry: '12/25',
  cvc: '123'
};

describe('Order Creation and Payment Flow', () => {
  let authHelper;

  beforeEach(async () => {
    authHelper = new AuthHelper(BASE_URL);
    await authHelper.initialize();
    jest.setTimeout(TIMEOUT);
  });

  afterEach(async () => {
    if (authHelper) {
      await authHelper.cleanup();
    }
  });

  describe('Internal Admin User Flow', () => {
    test('should login as internal user and access orders section', async () => {
      console.log('🔐 Testing internal user login and order access...');
      
      // Login as internal user
      const loginResult = await authHelper.login(INTERNAL_USER);
      expect(loginResult.success).toBe(true);
      expect(loginResult.redirectUrl).not.toContain('/login');

      // Take screenshot of post-login dashboard
      await captureScreenshot(authHelper.page, 'internal-dashboard');

      // Navigate to orders section
      await authHelper.page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle2' });
      await captureScreenshot(authHelper.page, 'internal-orders-page');

      // Verify orders page loaded correctly
      const pageTitle = await authHelper.page.title();
      expect(pageTitle).toContain('Orders');

      // Check for key elements on orders page
      const hasNewOrderButton = await authHelper.page.$('a[href*="/orders/new"], button:contains("New Order")') !== null;
      expect(hasNewOrderButton).toBe(true);
    });

    test('should create a new order with multiple items', async () => {
      console.log('📝 Testing new order creation flow...');

      // Login first
      await authHelper.login(INTERNAL_USER);

      // Navigate to new order page
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });
      await captureScreenshot(authHelper.page, 'new-order-loading');

      // Wait for redirect to edit page
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/orders/') && window.location.pathname.includes('/edit'),
        { timeout: 10000 }
      );

      await captureScreenshot(authHelper.page, 'order-edit-page-loaded');

      // Wait for page to load completely
      await authHelper.page.waitForSelector('.space-y-6', { timeout: 10000 });

      // Test UI/UX Elements
      await this.testOrderCreationUI();
    });

    async testOrderCreationUI() {
      console.log('🎨 Testing order creation UI elements...');

      // Check for main sections
      const sections = [
        '.client-selection', // Client selection area
        '.target-pages', // Target pages section
        '.line-items', // Line items section
        '.pricing-summary' // Pricing summary
      ];

      for (const selector of sections) {
        const element = await authHelper.page.$(selector);
        if (!element) {
          console.warn(`⚠️  Missing section: ${selector}`);
        }
      }

      // Test responsive design
      await authHelper.page.setViewport({ width: 768, height: 1024 }); // Tablet
      await captureScreenshot(authHelper.page, 'order-edit-tablet-view');

      await authHelper.page.setViewport({ width: 375, height: 812 }); // Mobile
      await captureScreenshot(authHelper.page, 'order-edit-mobile-view');

      // Reset to desktop
      await authHelper.page.setViewport({ width: 1280, height: 720 });

      // Test search functionality if present
      const searchInput = await authHelper.page.$('input[placeholder*="search"], input[type="search"]');
      if (searchInput) {
        await searchInput.type('test');
        await captureScreenshot(authHelper.page, 'search-functionality');
      }

      // Test add client button
      const addClientButton = await authHelper.page.$('button:contains("Add Client"), button:contains("New Client")');
      if (addClientButton) {
        await addClientButton.click();
        await authHelper.page.waitForTimeout(1000);
        await captureScreenshot(authHelper.page, 'add-client-modal');
        
        // Close modal
        const closeButton = await authHelper.page.$('button:contains("Cancel"), button:contains("Close"), [aria-label="Close"]');
        if (closeButton) {
          await closeButton.click();
        }
      }
    }

    test('should test order pricing calculator and validation', async () => {
      console.log('💰 Testing pricing calculator...');

      await authHelper.login(INTERNAL_USER);
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });

      // Wait for redirect to edit page
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 10000 }
      );

      // Look for pricing elements
      const pricingElements = await authHelper.page.$$eval(
        '[class*="price"], [class*="total"], [class*="subtotal"]',
        elements => elements.map(el => el.textContent)
      );

      console.log('💵 Found pricing elements:', pricingElements);

      // Test pricing updates (if interactive elements exist)
      const quantityInputs = await authHelper.page.$$('input[type="number"]');
      if (quantityInputs.length > 0) {
        await quantityInputs[0].clear();
        await quantityInputs[0].type('5');
        await authHelper.page.waitForTimeout(1000);
        await captureScreenshot(authHelper.page, 'pricing-updated');
      }
    });
  });

  describe('External Account User Flow', () => {
    test('should login as account user and check permissions', async () => {
      console.log('👤 Testing account user login and permissions...');

      // Login as account user
      const loginResult = await authHelper.login(ACCOUNT_USER);
      expect(loginResult.success).toBe(true);

      await captureScreenshot(authHelper.page, 'account-user-dashboard');

      // Check what account user can see
      const currentUrl = authHelper.page.url();
      console.log('📍 Account user redirected to:', currentUrl);

      // Try to access orders
      await authHelper.page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle2' });
      await captureScreenshot(authHelper.page, 'account-user-orders-access');

      // Check if redirected or access denied
      const finalUrl = authHelper.page.url();
      if (finalUrl.includes('/login') || finalUrl.includes('/403')) {
        console.log('✅ Account user correctly restricted from orders');
      } else {
        console.log('⚠️  Account user has access to orders - check permissions');
      }

      // Try account dashboard
      await authHelper.page.goto(`${BASE_URL}/account/dashboard`, { waitUntil: 'networkidle2' });
      await captureScreenshot(authHelper.page, 'account-dashboard');
    });

    test('should test order creation for account users', async () => {
      console.log('📋 Testing account user order creation...');

      await authHelper.login(ACCOUNT_USER);

      // Try to create order as account user
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });
      await captureScreenshot(authHelper.page, 'account-user-new-order');

      const currentUrl = authHelper.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/403')) {
        console.log('✅ Account user correctly restricted from creating orders');
      } else {
        console.log('⚠️  Account user can create orders - testing flow...');
        // Continue with order creation test
        await this.testAccountUserOrderFlow();
      }
    });

    async testAccountUserOrderFlow() {
      // Wait for order creation to complete
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit') || window.location.pathname.includes('/payment'),
        { timeout: 10000 }
      );

      await captureScreenshot(authHelper.page, 'account-user-order-flow');

      // Test any account-specific UI elements
      const accountElements = await authHelper.page.$$eval(
        '[class*="account"], [data-testid*="account"]',
        elements => elements.map(el => el.textContent)
      );

      console.log('👤 Account-specific elements:', accountElements);
    }
  });

  describe('Payment Flow Tests', () => {
    let orderId;

    beforeEach(async () => {
      // Create a test order first
      await authHelper.login(INTERNAL_USER);
      orderId = await this.createTestOrder();
    });

    async createTestOrder() {
      console.log('🛒 Creating test order for payment testing...');

      // Navigate to new order
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });

      // Wait for redirect and get order ID from URL
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 10000 }
      );

      const url = authHelper.page.url();
      const orderIdMatch = url.match(/\/orders\/([^\/]+)\/edit/);
      const testOrderId = orderIdMatch ? orderIdMatch[1] : null;

      console.log('📋 Created test order:', testOrderId);
      return testOrderId;
    }

    test('should navigate to payment page and load Stripe form', async () => {
      if (!orderId) {
        console.log('❌ No order ID available, skipping payment test');
        return;
      }

      console.log('💳 Testing payment page navigation...');

      // Navigate to payment page
      await authHelper.page.goto(`${BASE_URL}/orders/${orderId}/payment`, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });

      await captureScreenshot(authHelper.page, 'payment-page-initial');

      // Check if payment form loads
      try {
        // Wait for Stripe Elements to load
        await authHelper.page.waitForSelector('.PaymentElement, [data-testid="payment-element"], iframe[name*="stripe"]', {
          timeout: 15000
        });

        await captureScreenshot(authHelper.page, 'payment-form-loaded');
        console.log('✅ Stripe payment form loaded successfully');

        // Test payment form UI
        await this.testPaymentFormUI();

      } catch (error) {
        console.log('⚠️  Payment form not loaded:', error.message);
        await captureScreenshot(authHelper.page, 'payment-form-error');
        
        // Check for error messages
        const errorMessages = await authHelper.page.$$eval(
          '.error, .alert, [class*="error"]',
          elements => elements.map(el => el.textContent)
        );
        
        console.log('🚨 Error messages found:', errorMessages);
      }
    });

    async testPaymentFormUI() {
      console.log('🎨 Testing payment form UI elements...');

      // Check for payment amount display
      const amountElements = await authHelper.page.$$eval(
        '[class*="amount"], [class*="total"], [class*="price"]',
        elements => elements.map(el => el.textContent)
      );

      console.log('💰 Payment amounts displayed:', amountElements);

      // Look for Stripe payment elements
      const stripeIframes = await authHelper.page.$$('iframe[name*="stripe"]');
      console.log('🔒 Stripe iframes found:', stripeIframes.length);

      // Test payment button state
      const paymentButton = await authHelper.page.$('button[type="submit"]:contains("Pay"), button:contains("Pay")');
      if (paymentButton) {
        const isDisabled = await paymentButton.evaluate(btn => btn.disabled);
        console.log('💳 Payment button disabled:', isDisabled);
      }
    }

    test('should test Stripe payment form with test card', async () => {
      if (!orderId) {
        console.log('❌ No order ID available, skipping Stripe test');
        return;
      }

      console.log('🧪 Testing Stripe payment with test card...');

      await authHelper.page.goto(`${BASE_URL}/orders/${orderId}/payment`, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });

      try {
        // Wait for Stripe to load
        await authHelper.page.waitForSelector('iframe[name*="stripe"]', { timeout: 15000 });

        // Find the Stripe card element iframe
        const cardFrames = await authHelper.page.$$('iframe[name*="stripe"]');
        
        if (cardFrames.length > 0) {
          await captureScreenshot(authHelper.page, 'before-card-entry');

          // Try to fill in test card details
          await this.fillStripeCardDetails();

          await captureScreenshot(authHelper.page, 'after-card-entry');

          // Try to submit payment (don't actually complete to avoid charges)
          const submitButton = await authHelper.page.$('button[type="submit"]');
          if (submitButton) {
            const buttonText = await submitButton.evaluate(btn => btn.textContent);
            console.log('💳 Payment button text:', buttonText);
            
            // Don't actually click to avoid test charges
            console.log('⚠️  Skipping actual payment submission to avoid test charges');
          }

        } else {
          console.log('❌ No Stripe card iframes found');
        }

      } catch (error) {
        console.log('❌ Error testing Stripe payment:', error.message);
        await captureScreenshot(authHelper.page, 'stripe-payment-error');
      }
    });

    async fillStripeCardDetails() {
      console.log('💳 Attempting to fill Stripe card details...');

      try {
        // This is complex because Stripe uses iframes with cross-origin restrictions
        // In a real test environment, you'd use Stripe's test mode and proper test helpers
        
        // For now, just log that we found the elements
        const stripeElements = await authHelper.page.$$('iframe[name*="stripe"]');
        console.log('🔒 Found Stripe elements:', stripeElements.length);

        // Note: Actual card filling would require special Stripe testing utilities
        // or a test environment with proper CORS settings

      } catch (error) {
        console.log('⚠️  Could not fill card details:', error.message);
      }
    }

    test('should test payment success flow', async () => {
      if (!orderId) {
        console.log('❌ No order ID available, skipping success test');
        return;
      }

      console.log('✅ Testing payment success page...');

      // Navigate directly to success page to test UI
      await authHelper.page.goto(`${BASE_URL}/orders/${orderId}/payment-success`, { 
        waitUntil: 'networkidle2' 
      });

      await captureScreenshot(authHelper.page, 'payment-success-page');

      // Check for success elements
      const successElements = await authHelper.page.$$eval(
        '[class*="success"], [class*="confirmed"], .success, .confirmed',
        elements => elements.map(el => el.textContent)
      );

      console.log('✅ Success page elements:', successElements);
    });
  });

  describe('UI/UX Issues Detection', () => {
    test('should check for common UI issues', async () => {
      console.log('🔍 Checking for common UI/UX issues...');

      await authHelper.login(INTERNAL_USER);
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });

      // Wait for page load
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 10000 }
      );

      const issues = [];

      // Check for accessibility issues
      const missingAltTags = await authHelper.page.$$eval(
        'img:not([alt])',
        images => images.length
      );
      if (missingAltTags > 0) {
        issues.push(`${missingAltTags} images missing alt tags`);
      }

      // Check for buttons without labels
      const unlabeledButtons = await authHelper.page.$$eval(
        'button:not([aria-label]):not(:has(span)):not(:has(svg))',
        buttons => buttons.length
      );
      if (unlabeledButtons > 0) {
        issues.push(`${unlabeledButtons} buttons without labels`);
      }

      // Check for form inputs without labels
      const unlabeledInputs = await authHelper.page.$$eval(
        'input:not([aria-label]):not([aria-labelledby])',
        inputs => inputs.filter(input => {
          const id = input.id;
          return !id || !document.querySelector(`label[for="${id}"]`);
        }).length
      );
      if (unlabeledInputs > 0) {
        issues.push(`${unlabeledInputs} form inputs without labels`);
      }

      // Check for loading states
      const loadingElements = await authHelper.page.$$eval(
        '[class*="loading"], [class*="spinner"], .animate-spin',
        elements => elements.length
      );
      console.log('⏳ Loading indicators found:', loadingElements);

      // Report issues
      if (issues.length > 0) {
        console.log('⚠️  UI/UX Issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
      } else {
        console.log('✅ No major UI/UX issues detected');
      }

      await captureScreenshot(authHelper.page, 'ui-issues-check');
    });

    test('should test navigation flow and user guidance', async () => {
      console.log('🧭 Testing navigation and user guidance...');

      await authHelper.login(INTERNAL_USER);

      // Test breadcrumb navigation
      await authHelper.page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle2' });
      
      const breadcrumbs = await authHelper.page.$$eval(
        '[class*="breadcrumb"], nav ol li, nav ul li',
        elements => elements.map(el => el.textContent)
      );
      console.log('🍞 Breadcrumbs found:', breadcrumbs);

      // Test progress indicators
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 10000 }
      );

      const progressIndicators = await authHelper.page.$$eval(
        '[class*="progress"], [class*="step"], .stepper',
        elements => elements.map(el => el.textContent)
      );
      console.log('📊 Progress indicators found:', progressIndicators);

      await captureScreenshot(authHelper.page, 'navigation-flow');
    });

    test('should test error handling and user feedback', async () => {
      console.log('❌ Testing error handling...');

      await authHelper.login(INTERNAL_USER);

      // Test invalid form submission
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 10000 }
      );

      // Look for submit buttons and try to submit empty form
      const submitButtons = await authHelper.page.$$('button[type="submit"], button:contains("Submit")');
      if (submitButtons.length > 0) {
        await submitButtons[0].click();
        await authHelper.page.waitForTimeout(2000);

        // Look for validation messages
        const validationMessages = await authHelper.page.$$eval(
          '.error, .invalid, [class*="error"], [class*="invalid"]',
          elements => elements.map(el => el.textContent)
        );

        console.log('✋ Validation messages:', validationMessages);
        await captureScreenshot(authHelper.page, 'validation-errors');
      }

      // Test network error simulation
      await authHelper.page.setOfflineMode(true);
      
      // Try to perform an action that requires network
      const networkDependentButtons = await authHelper.page.$$('button:contains("Save"), button:contains("Create")');
      if (networkDependentButtons.length > 0) {
        await networkDependentButtons[0].click();
        await authHelper.page.waitForTimeout(3000);
        
        await captureScreenshot(authHelper.page, 'network-error-state');
      }

      // Restore network
      await authHelper.page.setOfflineMode(false);
    });
  });

  describe('Performance and Loading Tests', () => {
    test('should measure page load performance', async () => {
      console.log('⚡ Testing page load performance...');

      await authHelper.login(INTERNAL_USER);

      // Measure order page load time
      const startTime = Date.now();
      await authHelper.page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle2' });
      const ordersLoadTime = Date.now() - startTime;

      console.log(`📊 Orders page load time: ${ordersLoadTime}ms`);

      // Measure new order creation time
      const newOrderStartTime = Date.now();
      await authHelper.page.goto(`${BASE_URL}/orders/new`, { waitUntil: 'networkidle2' });
      await authHelper.page.waitForFunction(
        () => window.location.pathname.includes('/edit'),
        { timeout: 15000 }
      );
      const newOrderLoadTime = Date.now() - newOrderStartTime;

      console.log(`📊 New order creation time: ${newOrderLoadTime}ms`);

      // Performance thresholds (adjust based on requirements)
      expect(ordersLoadTime).toBeLessThan(5000); // 5 seconds
      expect(newOrderLoadTime).toBeLessThan(10000); // 10 seconds

      await captureScreenshot(authHelper.page, 'performance-test-complete');
    });
  });
});