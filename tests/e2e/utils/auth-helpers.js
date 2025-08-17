/**
 * Authentication Test Helpers
 * Utility functions for testing authentication flows in Guest Post Workflow
 */

const { getBrowser } = require('./browser-utils');
const { captureScreenshot } = require('./browser-utils');

// Test users configuration
const TEST_USERS = {
  internal: [
    { email: 'miro@outreachlabs.com', password: 'test123', type: 'internal', name: 'Miro' },
    { email: 'darko@outreachlabs.com', password: 'test123', type: 'internal', name: 'Darko' },
    { email: 'leo@outreachlabs.com', password: 'test123', type: 'internal', name: 'Leo' }
  ],
  account: [
    // Account users will be dynamically loaded from database
  ]
};

// Authentication routes
const AUTH_ROUTES = {
  login: '/login',
  accountLogin: '/account/login',
  logout: '/api/auth/logout',
  internal: {
    dashboard: '/admin',
    clients: '/clients',
    workflows: '/workflows',
    contacts: '/contacts'
  },
  account: {
    dashboard: '/account/dashboard',
    orders: '/account/orders',
    profile: '/account/profile'
  }
};

class AuthHelper {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await getBrowser();
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport({ width: 1280, height: 720 });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Enable console logging in verbose mode
    if (process.env.VERBOSE) {
      this.page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    }
  }

  /**
   * Navigate to login page and perform login
   * @param {Object} user - User object with email, password, type
   * @returns {Object} Login result with success status and redirect URL
   */
  async login(user) {
    try {
      console.log(`🔐 Logging in user: ${user.email} (${user.type})`);
      
      // Choose login route based on user type
      const loginRoute = user.type === 'account' ? AUTH_ROUTES.accountLogin : AUTH_ROUTES.login;
      
      // Navigate to appropriate login page
      await this.page.goto(`${this.baseUrl}${loginRoute}`, { 
        waitUntil: 'networkidle2' 
      });
      
      // Capture pre-login screenshot
      await captureScreenshot(this.page, `login-page-${user.type}`);
      
      // Fill login form
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await this.page.type('input[name="email"]', user.email);
      await this.page.type('input[name="password"]', user.password);
      
      // Capture filled form screenshot
      await captureScreenshot(this.page, `login-form-filled-${user.type}`);
      
      // Submit form and wait for navigation
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click('button[type="submit"]')
      ]);
      
      // Get current URL after login
      const currentUrl = this.page.url();
      const isLoginSuccessful = !currentUrl.includes('/login');
      
      // Capture post-login screenshot
      await captureScreenshot(this.page, `post-login-${user.type}`);
      
      // Verify authentication cookie exists
      const cookies = await this.page.cookies();
      const authCookie = cookies.find(cookie => 
        cookie.name === 'auth-token' || 
        cookie.name === 'account-auth' ||
        cookie.name.includes('session')
      );
      
      const result = {
        success: isLoginSuccessful && !!authCookie,
        redirectUrl: currentUrl,
        authCookie: authCookie,
        user: user,
        timestamp: new Date().toISOString()
      };
      
      console.log(`${result.success ? '✅' : '❌'} Login ${result.success ? 'successful' : 'failed'}: ${user.email}`);
      console.log(`   Redirected to: ${currentUrl}`);
      
      return result;
      
    } catch (error) {
      console.error(`💥 Login failed for ${user.email}:`, error.message);
      await captureScreenshot(this.page, `login-error-${user.type}`);
      
      return {
        success: false,
        error: error.message,
        user: user,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test login with invalid credentials
   * @param {string} email - Test email
   * @param {string} password - Test password
   * @returns {Object} Result with error verification
   */
  async loginInvalid(email, password) {
    try {
      console.log(`🚫 Testing invalid login: ${email}`);
      
      await this.page.goto(`${this.baseUrl}${AUTH_ROUTES.login}`, { 
        waitUntil: 'networkidle2' 
      });
      
      await this.page.type('input[name="email"]', email);
      await this.page.type('input[name="password"]', password);
      
      await this.page.click('button[type="submit"]');
      
      // Wait for error message
      await this.page.waitForTimeout(2000);
      
      const currentUrl = this.page.url();
      const isStillOnLogin = currentUrl.includes('/login');
      
      // Look for error message
      const errorMessage = await this.page.$eval('.error, .alert-error, [data-testid="error"]', 
        el => el.textContent).catch(() => null);
      
      await captureScreenshot(this.page, `invalid-login-${email.replace('@', '-at-')}`);
      
      return {
        success: isStillOnLogin,
        stayedOnLogin: isStillOnLogin,
        errorMessage: errorMessage,
        currentUrl: currentUrl,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error testing invalid login:`, error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Perform logout and verify session cleanup
   * @returns {Object} Logout result
   */
  async logout() {
    try {
      console.log('🚪 Logging out user...');
      
      // Navigate to logout endpoint or click logout button
      const logoutButton = await this.page.$('button:contains("Logout"), a:contains("Logout"), [data-testid="logout"]');
      
      if (logoutButton) {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
          logoutButton.click()
        ]);
      } else {
        // Direct API call to logout
        await this.page.goto(`${this.baseUrl}${AUTH_ROUTES.logout}`, { 
          waitUntil: 'networkidle2' 
        });
      }
      
      const currentUrl = this.page.url();
      const redirectedToLogin = currentUrl.includes('/login');
      
      // Verify auth cookie is removed
      const cookies = await this.page.cookies();
      const authCookie = cookies.find(cookie => cookie.name === 'auth-token');
      
      await captureScreenshot(this.page, 'post-logout');
      
      const result = {
        success: redirectedToLogin && !authCookie,
        redirectedToLogin: redirectedToLogin,
        authCookieRemoved: !authCookie,
        currentUrl: currentUrl,
        timestamp: new Date().toISOString()
      };
      
      console.log(`${result.success ? '✅' : '❌'} Logout ${result.success ? 'successful' : 'failed'}`);
      
      return result;
      
    } catch (error) {
      console.error('💥 Logout failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test access to protected route
   * @param {string} route - Route to test
   * @param {boolean} shouldHaveAccess - Whether current user should have access
   * @returns {Object} Access test result
   */
  async testRouteAccess(route, shouldHaveAccess = true) {
    try {
      console.log(`🔒 Testing route access: ${route}`);
      
      const response = await this.page.goto(`${this.baseUrl}${route}`, { 
        waitUntil: 'networkidle2' 
      });
      
      const currentUrl = this.page.url();
      const statusCode = response.status();
      const redirectedToLogin = currentUrl.includes('/login');
      
      await captureScreenshot(this.page, `route-access-${route.replace(/\//g, '-')}`);
      
      const hasAccess = statusCode === 200 && !redirectedToLogin;
      const result = {
        success: shouldHaveAccess ? hasAccess : !hasAccess,
        hasAccess: hasAccess,
        statusCode: statusCode,
        currentUrl: currentUrl,
        redirectedToLogin: redirectedToLogin,
        expectedAccess: shouldHaveAccess,
        route: route,
        timestamp: new Date().toISOString()
      };
      
      console.log(`${result.success ? '✅' : '❌'} Route access test: ${route} - ${hasAccess ? 'GRANTED' : 'DENIED'}`);
      
      return result;
      
    } catch (error) {
      console.error(`💥 Route access test failed for ${route}:`, error.message);
      return {
        success: false,
        error: error.message,
        route: route,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verify user session and profile information
   * @returns {Object} Session verification result
   */
  async verifySession() {
    try {
      // Check auth cookie
      const cookies = await this.page.cookies();
      const authCookie = cookies.find(cookie => cookie.name === 'auth-token');
      
      if (!authCookie) {
        return { success: false, error: 'No auth cookie found' };
      }
      
      // Try to access a protected endpoint that returns user info
      const userInfoResponse = await this.page.evaluate(async () => {
        try {
          const response = await fetch('/api/auth/me');
          return {
            status: response.status,
            data: response.ok ? await response.json() : null
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      return {
        success: userInfoResponse.status === 200,
        authCookie: !!authCookie,
        userInfo: userInfoResponse.data,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
  }
}

module.exports = {
  AuthHelper,
  TEST_USERS,
  AUTH_ROUTES
};