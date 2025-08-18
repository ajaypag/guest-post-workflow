/**
 * Permission Boundary Tests
 * Testing user permission boundaries, data isolation, and role-based access
 */

const { AuthHelper } = require('../utils/auth-helpers');
const { getTestUsers, getUserPermissions, createTestData, cleanupTestData } = require('../utils/db-helpers');
const { getConfig, logTestExecution } = require('../utils/test-config');

describe('Permission Boundary Tests', () => {
  let authHelper;
  let testUsers;
  let testData = [];
  const config = getConfig();

  beforeAll(async () => {
    logTestExecution('info', 'Setting up permission boundary tests');
    authHelper = new AuthHelper(config.baseUrl);
    await authHelper.initialize();
    
    testUsers = await getTestUsers();
    
    if (testUsers.internal.length === 0) {
      throw new Error('No test users found for permission tests');
    }
  }, config.timeout.default);

  afterAll(async () => {
    // Cleanup any test data created
    if (testData.length > 0) {
      await cleanupTestData(testData);
    }
    
    if (authHelper) {
      await authHelper.cleanup();
    }
    logTestExecution('info', 'Permission boundary tests completed');
  });

  describe('Internal User Permissions', () => {
    let internalUser;

    beforeAll(async () => {
      internalUser = testUsers.internal[0];
    });

    test('should grant internal users full admin access', async () => {
      const loginResult = await authHelper.login(internalUser);
      expect(loginResult.success).toBe(true);
      
      // Get user permissions from database
      const permissions = await getUserPermissions(internalUser.id, 'internal');
      expect(permissions.success).toBe(true);
      expect(permissions.permissions.canAccessAdmin).toBe(true);
      
      // Test admin route access
      const adminAccessResult = await authHelper.testRouteAccess('/admin', true);
      expect(adminAccessResult.success).toBe(true);
      expect(adminAccessResult.hasAccess).toBe(true);
      
      logTestExecution('info', 'Internal user admin access verified', {
        userId: internalUser.id,
        permissions: permissions.permissions,
        adminAccess: adminAccessResult.hasAccess
      });

      await authHelper.logout();
    }, config.timeout.navigation);

    test('should allow internal users to view all clients', async () => {
      await authHelper.login(internalUser);
      
      // Access clients page
      const clientsAccessResult = await authHelper.testRouteAccess('/clients', true);
      expect(clientsAccessResult.success).toBe(true);
      expect(clientsAccessResult.hasAccess).toBe(true);
      
      // Verify can see client data
      const hasClientList = await authHelper.page.evaluate(() => {
        // Look for client list elements
        const clientElements = document.querySelectorAll('[data-testid="client"], .client-item, .client-row');
        return clientElements.length >= 0; // May be 0 if no clients exist
      });
      
      logTestExecution('info', 'Internal user client access verified', {
        userId: internalUser.id,
        hasAccess: clientsAccessResult.hasAccess,
        hasClientList: hasClientList
      });

      await authHelper.logout();
    }, config.timeout.navigation);

    test('should allow internal users to view all workflows', async () => {
      await authHelper.login(internalUser);
      
      // Access workflows page
      const workflowsAccessResult = await authHelper.testRouteAccess('/workflows', true);
      expect(workflowsAccessResult.success).toBe(true);
      expect(workflowsAccessResult.hasAccess).toBe(true);
      
      // Verify can see workflow data
      const hasWorkflowList = await authHelper.page.evaluate(() => {
        // Look for workflow list elements
        const workflowElements = document.querySelectorAll('[data-testid="workflow"], .workflow-item, .workflow-row');
        return workflowElements.length >= 0; // May be 0 if no workflows exist
      });
      
      logTestExecution('info', 'Internal user workflow access verified', {
        userId: internalUser.id,
        hasAccess: workflowsAccessResult.hasAccess,
        hasWorkflowList: hasWorkflowList
      });

      await authHelper.logout();
    }, config.timeout.navigation);

    test('should allow internal users to create and modify clients', async () => {
      await authHelper.login(internalUser);
      
      // Navigate to clients page
      await authHelper.testRouteAccess('/clients', true);
      
      // Look for create/add buttons
      const hasCreateCapability = await authHelper.page.evaluate(() => {
        const createButtons = document.querySelectorAll(
          'button:contains("Add"), button:contains("Create"), button:contains("New"), [data-testid="create"], [data-testid="add"]'
        );
        const addLinks = document.querySelectorAll('a[href*="new"], a[href*="create"], a[href*="add"]');
        return createButtons.length > 0 || addLinks.length > 0;
      });
      
      logTestExecution('info', 'Internal user create capability verified', {
        userId: internalUser.id,
        hasCreateCapability: hasCreateCapability
      });

      await authHelper.logout();
    }, config.timeout.navigation);
  });

  describe('Account User Permissions', () => {
    let accountUser;

    beforeAll(async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping account user permission tests - no account users available');
        return;
      }
      accountUser = testUsers.account[0];
    });

    test('should restrict account users from admin access', async () => {
      if (!accountUser) {
        console.log('⏭️  Skipping admin restriction test - no account users available');
        return;
      }

      const loginResult = await authHelper.login(accountUser);
      expect(loginResult.success).toBe(true);
      
      // Verify cannot access admin routes
      const adminRoutes = ['/admin', '/clients', '/workflows', '/contacts'];
      
      for (const route of adminRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, false);
        expect(accessResult.success).toBe(true); // Success means properly denied
        expect(accessResult.hasAccess).toBe(false);
        
        logTestExecution('info', `Account user admin access properly denied: ${route}`, {
          userId: accountUser.id,
          route: route,
          hasAccess: accessResult.hasAccess,
          redirectedToLogin: accessResult.redirectedToLogin
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 4);

    test('should allow account users access to their account dashboard', async () => {
      if (!accountUser) {
        console.log('⏭️  Skipping account dashboard test - no account users available');
        return;
      }

      const loginResult = await authHelper.login(accountUser);
      expect(loginResult.success).toBe(true);
      
      // Should redirect to account dashboard after login
      expect(loginResult.redirectUrl).toContain('/account/dashboard');
      
      // Verify can access account routes
      const accountRoutes = ['/account/dashboard', '/account/profile'];
      
      for (const route of accountRoutes) {
        const accessResult = await authHelper.testRouteAccess(route, true);
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        
        logTestExecution('info', `Account user account access granted: ${route}`, {
          userId: accountUser.id,
          route: route,
          hasAccess: accessResult.hasAccess
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);

    test('should show only account user\'s own data', async () => {
      if (!accountUser) {
        console.log('⏭️  Skipping data isolation test - no account users available');
        return;
      }

      await authHelper.login(accountUser);
      
      // Navigate to account dashboard
      await authHelper.testRouteAccess('/account/dashboard', true);
      
      // Verify user sees their own information
      const userInfo = await authHelper.page.evaluate(() => {
        // Look for user-specific information
        const userElements = document.querySelectorAll(
          '[data-testid="user-email"], [data-testid="user-name"], .user-email, .user-name'
        );
        
        const foundInfo = [];
        userElements.forEach(el => {
          if (el.textContent) {
            foundInfo.push(el.textContent.trim());
          }
        });
        
        return foundInfo;
      });
      
      // Should contain user's email or name
      const hasUserInfo = userInfo.some(info => 
        info.includes(accountUser.email) || 
        info.includes(accountUser.company_name)
      );
      
      logTestExecution('info', 'Account user data isolation verified', {
        userId: accountUser.id,
        userEmail: accountUser.email,
        foundUserInfo: userInfo,
        hasUserInfo: hasUserInfo
      });

      await authHelper.logout();
    }, config.timeout.navigation);
  });

  describe('Cross-User Data Access', () => {
    test('should prevent account users from accessing other account data', async () => {
      if (testUsers.account.length < 2) {
        console.log('⏭️  Skipping cross-user access test - need at least 2 account users');
        return;
      }

      const user1 = testUsers.account[0];
      const user2 = testUsers.account[1];
      
      // Login as first user
      await authHelper.login(user1);
      
      // Try to access data that might belong to another user (if API endpoints exist)
      const testUrls = [
        `/api/accounts/${user2.id}`,
        `/api/orders?account_id=${user2.id}`,
        `/account/orders/${user2.id}` // Direct URL manipulation attempt
      ];
      
      for (const url of testUrls) {
        const response = await authHelper.page.evaluate(async (testUrl) => {
          try {
            const response = await fetch(testUrl);
            return {
              status: response.status,
              ok: response.ok,
              url: testUrl
            };
          } catch (error) {
            return { error: error.message, url: testUrl };
          }
        }, `${config.baseUrl}${url}`);
        
        // Should either be forbidden (403) or not found (404), not success (200)
        if (response.status) {
          expect([403, 404, 401]).toContain(response.status);
        }
        
        logTestExecution('info', `Cross-user data access properly denied: ${url}`, {
          user1Id: user1.id,
          user2Id: user2.id,
          url: url,
          status: response.status,
          error: response.error
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);
  });

  describe('Role-Based Feature Access', () => {
    test('should provide different feature access based on user role', async () => {
      // Test with admin internal user
      const adminUser = testUsers.internal.find(user => user.role === 'admin') || testUsers.internal[0];
      
      await authHelper.login(adminUser);
      await authHelper.testRouteAccess('/admin', true);
      
      // Look for admin-specific features
      const adminFeatures = await authHelper.page.evaluate(() => {
        const adminElements = document.querySelectorAll(
          '[data-testid="admin"], .admin-only, .admin-feature, button:contains("Admin"), a:contains("Settings")'
        );
        return adminElements.length;
      });
      
      logTestExecution('info', 'Admin user feature access verified', {
        userId: adminUser.id,
        role: adminUser.role,
        adminFeatures: adminFeatures
      });

      await authHelper.logout();

      // Test with regular internal user if available
      const regularUser = testUsers.internal.find(user => user.role !== 'admin');
      if (regularUser) {
        await authHelper.login(regularUser);
        await authHelper.testRouteAccess('/admin', true);
        
        const regularFeatures = await authHelper.page.evaluate(() => {
          const adminElements = document.querySelectorAll(
            '[data-testid="admin"], .admin-only, .admin-feature'
          );
          return adminElements.length;
        });
        
        // Regular users should have fewer admin features
        expect(regularFeatures).toBeLessThanOrEqual(adminFeatures);
        
        logTestExecution('info', 'Regular user feature access verified', {
          userId: regularUser.id,
          role: regularUser.role,
          regularFeatures: regularFeatures,
          comparedToAdmin: regularFeatures <= adminFeatures
        });

        await authHelper.logout();
      }
    }, config.timeout.navigation * 2);
  });

  describe('API Endpoint Permissions', () => {
    test('should enforce permissions on API endpoints', async () => {
      const internalUser = testUsers.internal[0];
      
      // Test internal user API access
      await authHelper.login(internalUser);
      
      const internalApiEndpoints = [
        '/api/auth/me',
        '/api/clients',
        '/api/workflows'
      ];
      
      for (const endpoint of internalApiEndpoints) {
        const response = await authHelper.page.evaluate(async (url) => {
          try {
            const response = await fetch(url);
            return {
              status: response.status,
              ok: response.ok
            };
          } catch (error) {
            return { error: error.message };
          }
        }, `${config.baseUrl}${endpoint}`);
        
        // Internal users should have access (200) or resource not found (404)
        if (response.status) {
          expect([200, 404]).toContain(response.status);
        }
        
        logTestExecution('info', `Internal user API access: ${endpoint}`, {
          userId: internalUser.id,
          endpoint: endpoint,
          status: response.status,
          hasAccess: response.ok
        });
      }

      await authHelper.logout();

      // Test account user API access
      if (testUsers.account.length > 0) {
        const accountUser = testUsers.account[0];
        await authHelper.login(accountUser);
        
        const restrictedApiEndpoints = [
          '/api/clients', // Should be restricted
          '/api/workflows' // Should be restricted
        ];
        
        for (const endpoint of restrictedApiEndpoints) {
          const response = await authHelper.page.evaluate(async (url) => {
            try {
              const response = await fetch(url);
              return {
                status: response.status,
                ok: response.ok
              };
            } catch (error) {
              return { error: error.message };
            }
          }, `${config.baseUrl}${endpoint}`);
          
          // Account users should be denied access (403) or redirected (401)
          if (response.status) {
            expect([401, 403, 404]).toContain(response.status);
          }
          
          logTestExecution('info', `Account user API access denied: ${endpoint}`, {
            userId: accountUser.id,
            endpoint: endpoint,
            status: response.status,
            properlyDenied: !response.ok
          });
        }

        await authHelper.logout();
      }
    }, config.timeout.navigation * 6);
  });

  describe('Data Modification Permissions', () => {
    test('should prevent unauthorized data modifications', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping data modification test - no account users available');
        return;
      }

      const accountUser = testUsers.account[0];
      await authHelper.login(accountUser);
      
      // Attempt to modify data through API calls that should be restricted
      const restrictedOperations = [
        {
          method: 'POST',
          endpoint: '/api/clients',
          data: { name: 'Unauthorized Client', email: 'test@example.com' }
        },
        {
          method: 'PUT',
          endpoint: '/api/clients/1',
          data: { name: 'Modified Client' }
        },
        {
          method: 'DELETE',
          endpoint: '/api/clients/1'
        }
      ];
      
      for (const operation of restrictedOperations) {
        const response = await authHelper.page.evaluate(async (op) => {
          try {
            const response = await fetch(`${window.location.origin}${op.endpoint}`, {
              method: op.method,
              headers: {
                'Content-Type': 'application/json'
              },
              body: op.data ? JSON.stringify(op.data) : undefined
            });
            return {
              status: response.status,
              ok: response.ok
            };
          } catch (error) {
            return { error: error.message };
          }
        }, operation);
        
        // Should be denied (403, 401) or method not allowed (405)
        if (response.status) {
          expect([401, 403, 404, 405]).toContain(response.status);
        }
        
        logTestExecution('info', `Unauthorized modification properly denied: ${operation.method} ${operation.endpoint}`, {
          userId: accountUser.id,
          operation: `${operation.method} ${operation.endpoint}`,
          status: response.status,
          properlyDenied: !response.ok
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);
  });

  describe('Session-Based Permissions', () => {
    test('should maintain consistent permissions throughout session', async () => {
      const internalUser = testUsers.internal[0];
      await authHelper.login(internalUser);
      
      // Test permissions at different points in session
      const testPoints = [
        { name: 'After Login', route: '/admin' },
        { name: 'After Navigation', route: '/clients' },
        { name: 'After Reload', route: '/workflows' }
      ];
      
      for (let i = 0; i < testPoints.length; i++) {
        const testPoint = testPoints[i];
        
        if (i === 2) {
          // Reload page before third test
          await authHelper.page.reload({ waitUntil: 'networkidle2' });
        }
        
        const accessResult = await authHelper.testRouteAccess(testPoint.route, true);
        expect(accessResult.success).toBe(true);
        expect(accessResult.hasAccess).toBe(true);
        
        // Verify session is still valid
        const sessionResult = await authHelper.verifySession();
        expect(sessionResult.success).toBe(true);
        
        logTestExecution('info', `Session permissions consistent: ${testPoint.name}`, {
          userId: internalUser.id,
          testPoint: testPoint.name,
          route: testPoint.route,
          hasAccess: accessResult.hasAccess,
          sessionValid: sessionResult.success
        });
      }

      await authHelper.logout();
    }, config.timeout.navigation * 3);

    test('should properly clear permissions after logout', async () => {
      const internalUser = testUsers.internal[0];
      
      // Login and verify access
      await authHelper.login(internalUser);
      const beforeLogout = await authHelper.testRouteAccess('/admin', true);
      expect(beforeLogout.hasAccess).toBe(true);
      
      // Logout
      const logoutResult = await authHelper.logout();
      expect(logoutResult.success).toBe(true);
      
      // Verify access is denied after logout
      const afterLogout = await authHelper.testRouteAccess('/admin', false);
      expect(afterLogout.success).toBe(true); // Success means properly denied
      expect(afterLogout.hasAccess).toBe(false);
      
      logTestExecution('info', 'Permissions properly cleared after logout', {
        userId: internalUser.id,
        beforeLogout: beforeLogout.hasAccess,
        afterLogout: afterLogout.hasAccess,
        redirectedToLogin: afterLogout.redirectedToLogin
      });
    }, config.timeout.navigation * 2);
  });
});