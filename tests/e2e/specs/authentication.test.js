/**
 * Authentication Flow Tests
 * Comprehensive testing of login, logout, and session management
 */

const { AuthHelper, TEST_USERS } = require('../utils/auth-helpers');
const { getTestUsers, verifyUserInDatabase } = require('../utils/db-helpers');
const { getConfig, logTestExecution } = require('../utils/test-config');

describe('Authentication Flow Tests', () => {
  let authHelper;
  let testUsers;
  const config = getConfig();

  beforeAll(async () => {
    logTestExecution('info', 'Setting up authentication tests');
    authHelper = new AuthHelper(config.baseUrl);
    await authHelper.initialize();
    
    // Get test users from database
    testUsers = await getTestUsers();
    
    if (testUsers.internal.length === 0) {
      throw new Error('No internal test users found in database');
    }
    
    logTestExecution('info', `Found ${testUsers.internal.length} internal users, ${testUsers.account.length} account users`);
  }, config.timeout.default);

  afterAll(async () => {
    if (authHelper) {
      await authHelper.cleanup();
    }
    logTestExecution('info', 'Authentication tests completed');
  });

  describe('Internal User Authentication', () => {
    test('should successfully login internal user and redirect to admin dashboard', async () => {
      const user = testUsers.internal[0]; // Use first internal user
      
      // Verify user exists in database
      const dbVerification = await verifyUserInDatabase(user.email, 'internal');
      expect(dbVerification.success).toBe(true);
      
      // Perform login
      const loginResult = await authHelper.login(user);
      
      expect(loginResult.success).toBe(true);
      expect(loginResult.authCookie).toBeTruthy();
      expect(loginResult.redirectUrl).toContain('/admin');
      
      // Verify session
      const sessionResult = await authHelper.verifySession();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.userInfo).toBeTruthy();
      
      logTestExecution('info', 'Internal user login test passed', {
        user: user.email,
        redirectUrl: loginResult.redirectUrl
      });
    }, config.timeout.navigation);

    test('should maintain session across page navigations', async () => {
      const user = testUsers.internal[0];
      
      // Login first
      const loginResult = await authHelper.login(user);
      expect(loginResult.success).toBe(true);
      
      // Test navigation to different internal routes
      const routes = ['/admin', '/clients', '/workflows'];
      
      for (const route of routes) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        
        logTestExecution('info', `Route access verified: ${route}`, accessResult);
      }
    }, config.timeout.navigation * 3);

    test('should successfully logout internal user', async () => {
      const user = testUsers.internal[0];
      
      // Login first
      await authHelper.login(user);
      
      // Perform logout
      const logoutResult = await authHelper.logout();
      
      expect(logoutResult.success).toBe(true);
      expect(logoutResult.redirectedToLogin).toBe(true);
      expect(logoutResult.authCookieRemoved).toBe(true);
      
      // Verify session is cleared
      const sessionResult = await authHelper.verifySession();
      expect(sessionResult.success).toBe(false);
      
      logTestExecution('info', 'Internal user logout test passed', logoutResult);
    }, config.timeout.navigation);
  });

  describe('Account User Authentication', () => {
    test('should successfully login account user and redirect to account dashboard', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping account user tests - no account users available');
        return;
      }
      
      const user = testUsers.account[0]; // Use first account user
      
      // Verify user exists in database
      const dbVerification = await verifyUserInDatabase(user.email, 'account');
      expect(dbVerification.success).toBe(true);
      
      // Perform login
      const loginResult = await authHelper.login(user);
      
      expect(loginResult.success).toBe(true);
      expect(loginResult.authCookie).toBeTruthy();
      expect(loginResult.redirectUrl).toContain('/account/dashboard');
      
      logTestExecution('info', 'Account user login test passed', {
        user: user.email,
        redirectUrl: loginResult.redirectUrl
      });
    }, config.timeout.navigation);

    test('should restrict account user access to internal routes', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping account user restriction tests - no account users available');
        return;
      }
      
      const user = testUsers.account[0];
      
      // Login first
      const loginResult = await authHelper.login(user);
      expect(loginResult.success).toBe(true);
      
      // Test access to restricted internal routes
      const restrictedRoutes = ['/admin', '/clients', '/workflows'];
      
      for (const route of restrictedRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, false);
        expect(accessResult.success).toBe(true); // Should succeed in denying access
        expect(accessResult.hasAccess).toBe(false);
        
        logTestExecution('info', `Restricted route access denied correctly: ${route}`, accessResult);
      }
    }, config.timeout.navigation * 3);

    test('should allow account user access to account routes', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping account user access tests - no account users available');
        return;
      }
      
      const user = testUsers.account[0];
      
      // Login first
      await authHelper.login(user);
      
      // Test access to allowed account routes
      const allowedRoutes = ['/account/dashboard', '/account/profile'];
      
      for (const route of allowedRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        
        logTestExecution('info', `Account route access granted correctly: ${route}`, accessResult);
      }
    }, config.timeout.navigation * 2);
  });

  describe('Invalid Authentication Attempts', () => {
    test('should reject login with invalid email', async () => {
      const invalidUser = {
        email: 'nonexistent@example.com',
        password: 'anypassword',
        type: 'invalid'
      };
      
      const loginResult = await authHelper.loginInvalid(invalidUser.email, invalidUser.password);
      
      expect(loginResult.success).toBe(true); // Success means it properly rejected
      expect(loginResult.stayedOnLogin).toBe(true);
      expect(loginResult.errorMessage).toBeTruthy();
      
      logTestExecution('info', 'Invalid email login rejection test passed', loginResult);
    }, config.timeout.default);

    test('should reject login with wrong password', async () => {
      const user = testUsers.internal[0];
      const invalidPassword = 'wrongpassword123';
      
      const loginResult = await authHelper.loginInvalid(user.email, invalidPassword);
      
      expect(loginResult.success).toBe(true); // Success means it properly rejected
      expect(loginResult.stayedOnLogin).toBe(true);
      
      logTestExecution('info', 'Wrong password login rejection test passed', loginResult);
    }, config.timeout.default);

    test('should reject login with empty password', async () => {
      const user = testUsers.internal[0];
      const emptyPassword = '';
      
      const loginResult = await authHelper.loginInvalid(user.email, emptyPassword);
      
      expect(loginResult.success).toBe(true); // Success means it properly rejected
      expect(loginResult.stayedOnLogin).toBe(true);
      
      logTestExecution('info', 'Empty password login rejection test passed', loginResult);
    }, config.timeout.default);

    test('should reject login with malformed email', async () => {
      const malformedEmail = 'not-an-email';
      const password = 'anypassword';
      
      const loginResult = await authHelper.loginInvalid(malformedEmail, password);
      
      expect(loginResult.success).toBe(true); // Success means it properly rejected
      expect(loginResult.stayedOnLogin).toBe(true);
      
      logTestExecution('info', 'Malformed email login rejection test passed', loginResult);
    }, config.timeout.default);
  });

  describe('Session Management', () => {
    test('should maintain session across browser refresh', async () => {
      const user = testUsers.internal[0];
      
      // Login
      const loginResult = await authHelper.login(user);
      expect(loginResult.success).toBe(true);
      
      // Simulate refresh by reloading page
      await authHelper.page.reload({ waitUntil: 'networkidle2' });
      
      // Verify session is still active
      const sessionResult = await authHelper.verifySession();
      expect(sessionResult.success).toBe(true);
      
      logTestExecution('info', 'Session persistence after refresh test passed', sessionResult);
    }, config.timeout.navigation);

    test('should handle concurrent login attempts', async () => {
      const user1 = testUsers.internal[0];
      const user2 = testUsers.internal[1] || testUsers.internal[0]; // Fallback to same user if only one available
      
      // Create second auth helper instance
      const authHelper2 = new AuthHelper(config.baseUrl);
      await authHelper2.initialize();
      
      try {
        // Perform concurrent logins
        const [loginResult1, loginResult2] = await Promise.all([
          authHelper.login(user1),
          authHelper2.login(user2)
        ]);
        
        expect(loginResult1.success).toBe(true);
        expect(loginResult2.success).toBe(true);
        
        // Both should maintain separate sessions
        const [session1, session2] = await Promise.all([
          authHelper.verifySession(),
          authHelper2.verifySession()
        ]);
        
        expect(session1.success).toBe(true);
        expect(session2.success).toBe(true);
        
        logTestExecution('info', 'Concurrent login test passed', {
          user1: user1.email,
          user2: user2.email
        });
        
      } finally {
        await authHelper2.cleanup();
      }
    }, config.timeout.navigation * 2);

    test('should handle session timeout gracefully', async () => {
      const user = testUsers.internal[0];
      
      // Login
      await authHelper.login(user);
      
      // Simulate session timeout by clearing cookies
      const context = authHelper.page.browserContext();
      await context.clearCookies();
      
      // Try to access protected route
      const accessResult = await authHelper.testRouteAccess('/admin', false);
      
      expect(accessResult.success).toBe(true); // Success means properly redirected to login
      expect(accessResult.hasAccess).toBe(false);
      expect(accessResult.redirectedToLogin).toBe(true);
      
      logTestExecution('info', 'Session timeout handling test passed', accessResult);
    }, config.timeout.navigation);
  });

  describe('Authentication Edge Cases', () => {
    test('should handle SQL injection attempts in login', async () => {
      const sqlInjectionAttempts = [
        "admin@example.com'; DROP TABLE users; --",
        "admin@example.com' OR '1'='1",
        "admin@example.com' UNION SELECT * FROM users --"
      ];
      
      for (const maliciousEmail of sqlInjectionAttempts) {
        const loginResult = await authHelper.loginInvalid(maliciousEmail, 'password');
        
        expect(loginResult.success).toBe(true); // Should properly reject
        expect(loginResult.stayedOnLogin).toBe(true);
        
        logTestExecution('info', `SQL injection attempt properly rejected: ${maliciousEmail}`);
      }
    }, config.timeout.default * 3);

    test('should handle XSS attempts in login form', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>@example.com',
        'javascript:alert("xss")@example.com',
        '<img src="x" onerror="alert(1)">@example.com'
      ];
      
      for (const maliciousEmail of xssAttempts) {
        const loginResult = await authHelper.loginInvalid(maliciousEmail, 'password');
        
        expect(loginResult.success).toBe(true); // Should properly reject
        expect(loginResult.stayedOnLogin).toBe(true);
        
        logTestExecution('info', `XSS attempt properly rejected: ${maliciousEmail}`);
      }
    }, config.timeout.default * 3);

    test('should handle rapid successive login attempts', async () => {
      const user = testUsers.internal[0];
      const attempts = 5;
      const loginPromises = [];
      
      // Create multiple rapid login attempts
      for (let i = 0; i < attempts; i++) {
        loginPromises.push(authHelper.loginInvalid(user.email, 'wrongpassword'));
      }
      
      const results = await Promise.allSettled(loginPromises);
      
      // All should be rejected or handled gracefully
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(true); // Properly rejected
          expect(result.value.stayedOnLogin).toBe(true);
        }
        
        logTestExecution('info', `Rapid login attempt ${index + 1} handled correctly`);
      });
    }, config.timeout.navigation);
  });
});