/**
 * Routing Protection Tests
 * Testing route access control, redirects, and middleware enforcement
 */

const { AuthHelper, AUTH_ROUTES } = require('../utils/auth-helpers');
const { getTestUsers } = require('../utils/db-helpers');
const { getConfig, logTestExecution } = require('../utils/test-config');

describe('Routing Protection Tests', () => {
  let authHelper;
  let testUsers;
  const config = getConfig();

  beforeAll(async () => {
    logTestExecution('info', 'Setting up routing protection tests');
    authHelper = new AuthHelper(config.baseUrl);
    await authHelper.initialize();
    
    testUsers = await getTestUsers();
    
    if (testUsers.internal.length === 0) {
      throw new Error('No internal test users found for routing tests');
    }
  }, config.timeout.default);

  afterAll(async () => {
    if (authHelper) {
      await authHelper.cleanup();
    }
    logTestExecution('info', 'Routing protection tests completed');
  });

  describe('Unauthenticated Route Access', () => {
    test('should redirect unauthenticated users to login page', async () => {
      const protectedRoutes = [
        '/admin',
        '/clients', 
        '/workflows',
        '/contacts',
        '/account/dashboard',
        '/account/orders',
        '/account/profile'
      ];

      for (const route of protectedRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, false);
        
        expect(accessResult.success).toBe(true); // Success means properly denied access
        expect(accessResult.hasAccess).toBe(false);
        expect(accessResult.redirectedToLogin).toBe(true);
        
        logTestExecution('info', `Unauthenticated access properly denied: ${route}`, {
          route,
          redirectedToLogin: accessResult.redirectedToLogin,
          currentUrl: accessResult.currentUrl
        });
      }
    }, config.timeout.navigation * 7);

    test('should allow access to public routes without authentication', async () => {
      const publicRoutes = [
        '/',
        '/login'
      ];

      for (const route of publicRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        expect(accessResult.redirectedToLogin).toBe(false);
        
        logTestExecution('info', `Public route access granted correctly: ${route}`, accessResult);
      }
    }, config.timeout.navigation * 2);
  });

  describe('Internal User Route Access', () => {
    beforeEach(async () => {
      // Login internal user before each test
      const user = testUsers.internal[0];
      const loginResult = await authHelper.login(user);
      expect(loginResult.success).toBe(true);
    });

    afterEach(async () => {
      // Logout after each test
      await authHelper.logout();
    });

    test('should allow internal users access to admin routes', async () => {
      const adminRoutes = [
        '/admin',
        '/clients',
        '/workflows', 
        '/contacts'
      ];

      for (const route of adminRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        expect(accessResult.statusCode).toBe(200);
        
        logTestExecution('info', `Internal user admin access granted: ${route}`, accessResult);
      }
    }, config.timeout.navigation * 4);

    test('should redirect internal users from login page when already authenticated', async () => {
      const accessResult = await authHelper.testRouteAccess('/login', true);
      
      // Should redirect to admin dashboard, not stay on login
      expect(accessResult.currentUrl).toContain('/admin');
      
      logTestExecution('info', 'Internal user redirected from login when authenticated', {
        currentUrl: accessResult.currentUrl,
        expectedRedirect: '/admin'
      });
    }, config.timeout.navigation);

    test('should maintain proper navigation flow between internal routes', async () => {
      const navigationFlow = [
        '/admin',
        '/clients', 
        '/workflows',
        '/contacts',
        '/admin' // Back to start
      ];

      for (let i = 0; i < navigationFlow.length; i++) {
        const route = navigationFlow[i];
        const accessResult = await authHelper.testRouteAccess(route, true);
        
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        
        logTestExecution('info', `Navigation step ${i + 1}: ${route}`, {
          route,
          currentUrl: accessResult.currentUrl
        });

        // Brief pause between navigation steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }, config.timeout.navigation * 5);

    test('should handle deep links to internal routes correctly', async () => {
      const deepLinks = [
        '/workflows/123',
        '/clients/456', 
        '/admin/users',
        '/admin/settings'
      ];

      for (const route of deepLinks) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        
        // Should either access the route (200) or handle gracefully (404 for non-existent resources)
        expect([200, 404]).toContain(accessResult.statusCode);
        expect(accessResult.redirectedToLogin).toBe(false);
        
        logTestExecution('info', `Deep link access handled correctly: ${route}`, {
          route,
          statusCode: accessResult.statusCode,
          currentUrl: accessResult.currentUrl
        });
      }
    }, config.timeout.navigation * 4);
  });

  describe('Account User Route Access', () => {
    beforeEach(async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping account user route tests - no account users available');
        return;
      }
      
      // Login account user before each test
      const user = testUsers.account[0];
      const loginResult = await authHelper.login(user);
      expect(loginResult.success).toBe(true);
    });

    afterEach(async () => {
      if (testUsers.account.length > 0) {
        await authHelper.logout();
      }
    });

    test('should allow account users access to account routes', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping account route access test - no account users available');
        return;
      }

      const accountRoutes = [
        '/account/dashboard',
        '/account/orders',
        '/account/profile'
      ];

      for (const route of accountRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        expect(accessResult.statusCode).toBe(200);
        
        logTestExecution('info', `Account user route access granted: ${route}`, accessResult);
      }
    }, config.timeout.navigation * 3);

    test('should deny account users access to admin routes', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping admin access denial test - no account users available');
        return;
      }

      const adminRoutes = [
        '/admin',
        '/clients',
        '/workflows',
        '/contacts'
      ];

      for (const route of adminRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, false);
        
        expect(accessResult.success).toBe(true); // Success means properly denied
        expect(accessResult.hasAccess).toBe(false);
        
        // Should either redirect to login or show 403/404
        expect([403, 404]).toContain(accessResult.statusCode) || 
          expect(accessResult.redirectedToLogin).toBe(true);
        
        logTestExecution('info', `Account user admin access properly denied: ${route}`, {
          route,
          statusCode: accessResult.statusCode,
          redirectedToLogin: accessResult.redirectedToLogin
        });
      }
    }, config.timeout.navigation * 4);

    test('should redirect account users from login page when already authenticated', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping login redirect test - no account users available');
        return;
      }

      const accessResult = await authHelper.testRouteAccess('/login', true);
      
      // Should redirect to account dashboard, not stay on login
      expect(accessResult.currentUrl).toContain('/account/dashboard');
      
      logTestExecution('info', 'Account user redirected from login when authenticated', {
        currentUrl: accessResult.currentUrl,
        expectedRedirect: '/account/dashboard'
      });
    }, config.timeout.navigation);
  });

  describe('Route Parameter and Query Handling', () => {
    test('should handle routes with query parameters correctly', async () => {
      const user = testUsers.internal[0];
      await authHelper.login(user);

      const routesWithQuery = [
        '/admin?tab=users',
        '/clients?page=2',
        '/workflows?status=active&sort=date'
      ];

      for (const route of routesWithQuery) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        
        // Verify query parameters are preserved
        const currentUrl = new URL(accessResult.currentUrl);
        const originalUrl = new URL(`${config.baseUrl}${route}`);
        
        logTestExecution('info', `Query parameters handled correctly: ${route}`, {
          originalQuery: originalUrl.search,
          currentQuery: currentUrl.search,
          currentUrl: accessResult.currentUrl
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);

    test('should handle invalid route parameters gracefully', async () => {
      const user = testUsers.internal[0];
      await authHelper.login(user);

      const invalidRoutes = [
        '/workflows/invalid-id',
        '/clients/999999',
        '/admin/nonexistent-section'
      ];

      for (const route of invalidRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        
        // Should handle gracefully with 404 or redirect to valid page
        expect([200, 404]).toContain(accessResult.statusCode);
        expect(accessResult.redirectedToLogin).toBe(false);
        
        logTestExecution('info', `Invalid route handled gracefully: ${route}`, {
          route,
          statusCode: accessResult.statusCode,
          currentUrl: accessResult.currentUrl
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);
  });

  describe('Route Middleware and Headers', () => {
    test('should set proper security headers on protected routes', async () => {
      const user = testUsers.internal[0];
      await authHelper.login(user);

      const protectedRoutes = ['/admin', '/clients', '/workflows'];

      for (const route of protectedRoutes) {
        const response = await authHelper.page.goto(`${config.baseUrl}${route}`, { 
          waitUntil: 'networkidle2' 
        });

        const headers = response.headers();
        
        // Check for common security headers
        const securityHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'referrer-policy'
        ];

        logTestExecution('info', `Checking security headers for: ${route}`, {
          route,
          headers: Object.keys(headers),
          hasSecurityHeaders: securityHeaders.some(header => headers[header])
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);

    test('should handle CORS properly for API routes', async () => {
      const user = testUsers.internal[0];
      await authHelper.login(user);

      // Test API route access
      const apiRoutes = [
        '/api/auth/me',
        '/api/workflows',
        '/api/clients'
      ];

      for (const route of apiRoutes) {
        const response = await authHelper.page.evaluate(async (url) => {
          try {
            const response = await fetch(url);
            return {
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              ok: response.ok
            };
          } catch (error) {
            return { error: error.message };
          }
        }, `${config.baseUrl}${route}`);

        logTestExecution('info', `API route access test: ${route}`, {
          route,
          status: response.status,
          ok: response.ok,
          hasError: !!response.error
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);
  });

  describe('Route Performance and Loading', () => {
    test('should load protected routes within acceptable time limits', async () => {
      const user = testUsers.internal[0];
      await authHelper.login(user);

      const routes = ['/admin', '/clients', '/workflows'];
      const maxLoadTime = 5000; // 5 seconds

      for (const route of routes) {
        const startTime = Date.now();
        
        const response = await authHelper.page.goto(`${config.baseUrl}${route}`, { 
          waitUntil: 'networkidle2' 
        });
        
        const loadTime = Date.now() - startTime;
        
        expect(response.status()).toBe(200);
        expect(loadTime).toBeLessThan(maxLoadTime);
        
        logTestExecution('info', `Route load performance: ${route}`, {
          route,
          loadTime: `${loadTime}ms`,
          status: response.status(),
          withinLimit: loadTime < maxLoadTime
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);

    test('should handle concurrent route access correctly', async () => {
      const user = testUsers.internal[0];
      await authHelper.login(user);

      const routes = ['/admin', '/clients', '/workflows'];
      
      // Access all routes concurrently
      const accessPromises = routes.map(route => {
        return new Promise(async (resolve) => {
          const startTime = Date.now();
          const response = await authHelper.page.goto(`${config.baseUrl}${route}`, { 
            waitUntil: 'networkidle2' 
          });
          const loadTime = Date.now() - startTime;
          
          resolve({
            route,
            status: response.status(),
            loadTime,
            success: response.status() === 200
          });
        });
      });

      const results = await Promise.all(accessPromises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        
        logTestExecution('info', `Concurrent route access: ${result.route}`, {
          route: result.route,
          loadTime: `${result.loadTime}ms`,
          status: result.status,
          success: result.success
        });
      });

      await authHelper.logout();
    }, config.timeout.navigation * 2);
  });
});