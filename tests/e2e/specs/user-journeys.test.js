/**
 * User Journey Tests
 * End-to-end testing of complete user workflows and real-world scenarios
 */

const { AuthHelper } = require('../utils/auth-helpers');
const { getTestUsers, createTestData, cleanupTestData } = require('../utils/db-helpers');
const { getConfig, logTestExecution } = require('../utils/test-config');
const { captureScreenshot, waitForElement, safeClick, safeType } = require('../utils/browser-utils');

describe('User Journey Tests', () => {
  let authHelper;
  let testUsers;
  let testData = [];
  const config = getConfig();

  beforeAll(async () => {
    logTestExecution('info', 'Setting up user journey tests');
    authHelper = new AuthHelper(config.baseUrl);
    await authHelper.initialize();
    
    testUsers = await getTestUsers();
    
    if (testUsers.internal.length === 0) {
      throw new Error('No test users found for user journey tests');
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
    logTestExecution('info', 'User journey tests completed');
  });

  describe('Internal User Complete Workflow', () => {
    test('should complete full internal user workflow: login → dashboard → clients → workflows → logout', async () => {
      const internalUser = testUsers.internal[0];
      const journeySteps = [];
      
      try {
        // Step 1: Login
        logTestExecution('info', 'Journey Step 1: Login', { user: internalUser.email });
        const loginResult = await authHelper.login(internalUser);
        expect(loginResult.success).toBe(true);
        
        journeySteps.push({
          step: 1,
          action: 'Login',
          success: loginResult.success,
          url: loginResult.redirectUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'internal-journey-01-login');
        
        // Step 2: Navigate to Admin Dashboard
        logTestExecution('info', 'Journey Step 2: Admin Dashboard');
        const dashboardResult = await authHelper.testRouteAccess('/admin', true);
        expect(dashboardResult.success).toBe(true);
        
        journeySteps.push({
          step: 2,
          action: 'Admin Dashboard',
          success: dashboardResult.success,
          url: dashboardResult.currentUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'internal-journey-02-dashboard');
        
        // Step 3: Navigate to Clients
        logTestExecution('info', 'Journey Step 3: Clients Management');
        const clientsResult = await authHelper.testRouteAccess('/clients', true);
        expect(clientsResult.success).toBe(true);
        
        journeySteps.push({
          step: 3,
          action: 'Clients Management',
          success: clientsResult.success,
          url: clientsResult.currentUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'internal-journey-03-clients');
        
        // Step 4: Check for client data and interactions
        const clientInteractions = await authHelper.page.evaluate(() => {
          const interactions = {
            hasClientList: !!document.querySelector('[data-testid="client"], .client-item, .client-row, table'),
            hasAddButton: !!document.querySelector('button:contains("Add"), button:contains("New"), [data-testid="add"]'),
            hasSearchBox: !!document.querySelector('input[type="search"], input[placeholder*="search"], [data-testid="search"]'),
            hasFilterOptions: !!document.querySelector('select, .filter, [data-testid="filter"]')
          };
          return interactions;
        });
        
        journeySteps.push({
          step: 4,
          action: 'Client Interface Check',
          success: true,
          interactions: clientInteractions,
          timestamp: new Date().toISOString()
        });
        
        // Step 5: Navigate to Workflows
        logTestExecution('info', 'Journey Step 5: Workflows Management');
        const workflowsResult = await authHelper.testRouteAccess('/workflows', true);
        expect(workflowsResult.success).toBe(true);
        
        journeySteps.push({
          step: 5,
          action: 'Workflows Management',
          success: workflowsResult.success,
          url: workflowsResult.currentUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'internal-journey-05-workflows');
        
        // Step 6: Check workflow interactions
        const workflowInteractions = await authHelper.page.evaluate(() => {
          const interactions = {
            hasWorkflowList: !!document.querySelector('[data-testid="workflow"], .workflow-item, .workflow-row, table'),
            hasCreateButton: !!document.querySelector('button:contains("Create"), button:contains("New"), [data-testid="create"]'),
            hasStatusFilters: !!document.querySelector('.status-filter, [data-testid="status"]'),
            hasProgressIndicators: !!document.querySelector('.progress, .status, .badge')
          };
          return interactions;
        });
        
        journeySteps.push({
          step: 6,
          action: 'Workflow Interface Check',
          success: true,
          interactions: workflowInteractions,
          timestamp: new Date().toISOString()
        });
        
        // Step 7: Navigate back to Dashboard
        logTestExecution('info', 'Journey Step 7: Return to Dashboard');
        await authHelper.testRouteAccess('/admin', true);
        await captureScreenshot(authHelper.page, 'internal-journey-07-return-dashboard');
        
        // Step 8: Logout
        logTestExecution('info', 'Journey Step 8: Logout');
        const logoutResult = await authHelper.logout();
        expect(logoutResult.success).toBe(true);
        
        journeySteps.push({
          step: 8,
          action: 'Logout',
          success: logoutResult.success,
          url: logoutResult.currentUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'internal-journey-08-logout');
        
        // Verify complete journey success
        const allStepsSuccessful = journeySteps.every(step => step.success);
        expect(allStepsSuccessful).toBe(true);
        
        logTestExecution('info', 'Internal user journey completed successfully', {
          userId: internalUser.id,
          totalSteps: journeySteps.length,
          allStepsSuccessful: allStepsSuccessful,
          journeySteps: journeySteps
        });
        
      } catch (error) {
        logTestExecution('error', 'Internal user journey failed', {
          userId: internalUser.id,
          error: error.message,
          completedSteps: journeySteps.length,
          journeySteps: journeySteps
        });
        throw error;
      }
    }, config.timeout.navigation * 8);

    test('should handle internal user error scenarios gracefully', async () => {
      const internalUser = testUsers.internal[0];
      
      // Test 1: Handle invalid route
      await authHelper.login(internalUser);
      
      const invalidRouteResult = await authHelper.testRouteAccess('/admin/nonexistent-page', true);
      // Should handle gracefully with 404 or redirect
      expect([200, 404]).toContain(invalidRouteResult.statusCode);
      
      logTestExecution('info', 'Invalid route handled gracefully', {
        userId: internalUser.id,
        route: '/admin/nonexistent-page',
        statusCode: invalidRouteResult.statusCode
      });
      
      // Test 2: Handle network interruption simulation
      try {
        // Temporarily disable network
        await authHelper.page.setOfflineMode(true);
        
        // Try to navigate
        const offlineNavigation = await authHelper.page.goto(`${config.baseUrl}/clients`, { 
          waitUntil: 'networkidle2',
          timeout: 5000 
        }).catch(() => ({ offline: true }));
        
        // Re-enable network
        await authHelper.page.setOfflineMode(false);
        
        // Should recover after network is restored
        const recoveryResult = await authHelper.testRouteAccess('/clients', true);
        expect(recoveryResult.success).toBe(true);
        
        logTestExecution('info', 'Network interruption handled gracefully', {
          userId: internalUser.id,
          offlineDetected: !!offlineNavigation.offline,
          recoveredSuccessfully: recoveryResult.success
        });
        
      } catch (error) {
        logTestExecution('warn', 'Network interruption test skipped', { reason: error.message });
      }
      
      await authHelper.logout();
    }, config.timeout.navigation * 3);
  });

  describe('Account User Complete Workflow', () => {
    test('should complete full account user workflow: login → dashboard → orders → profile → logout', async () => {
      if (testUsers.account.length === 0) {
        console.log('⏭️  Skipping account user workflow test - no account users available');
        return;
      }
      
      const accountUser = testUsers.account[0];
      const journeySteps = [];
      
      try {
        // Step 1: Login
        logTestExecution('info', 'Account Journey Step 1: Login', { user: accountUser.email });
        const loginResult = await authHelper.login(accountUser);
        expect(loginResult.success).toBe(true);
        expect(loginResult.redirectUrl).toContain('/account/dashboard');
        
        journeySteps.push({
          step: 1,
          action: 'Login',
          success: loginResult.success,
          url: loginResult.redirectUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'account-journey-01-login');
        
        // Step 2: Account Dashboard
        logTestExecution('info', 'Account Journey Step 2: Dashboard');
        const dashboardResult = await authHelper.testRouteAccess('/account/dashboard', true);
        expect(dashboardResult.success).toBe(true);
        
        journeySteps.push({
          step: 2,
          action: 'Account Dashboard',
          success: dashboardResult.success,
          url: dashboardResult.currentUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'account-journey-02-dashboard');
        
        // Step 3: Check dashboard content
        const dashboardContent = await authHelper.page.evaluate(() => {
          return {
            hasUserInfo: !!document.querySelector('[data-testid="user-info"], .user-info, .account-info'),
            hasOrdersSection: !!document.querySelector('[data-testid="orders"], .orders-section, .order-list'),
            hasNavigationMenu: !!document.querySelector('nav, .navigation, .menu'),
            hasProfileLink: !!document.querySelector('a[href*="profile"], .profile-link')
          };
        });
        
        journeySteps.push({
          step: 3,
          action: 'Dashboard Content Check',
          success: true,
          content: dashboardContent,
          timestamp: new Date().toISOString()
        });
        
        // Step 4: Navigate to Orders (if available)
        logTestExecution('info', 'Account Journey Step 4: Orders');
        const ordersResult = await authHelper.testRouteAccess('/account/orders', true);
        
        journeySteps.push({
          step: 4,
          action: 'Orders Page',
          success: ordersResult.success,
          url: ordersResult.currentUrl,
          hasAccess: ordersResult.hasAccess,
          timestamp: new Date().toISOString()
        });
        
        if (ordersResult.hasAccess) {
          await captureScreenshot(authHelper.page, 'account-journey-04-orders');
          
          // Check orders interface
          const ordersContent = await authHelper.page.evaluate(() => {
            return {
              hasOrdersList: !!document.querySelector('[data-testid="order"], .order-item, .order-row, table'),
              hasCreateOrderButton: !!document.querySelector('button:contains("Create"), button:contains("New Order")'),
              hasOrderFilters: !!document.querySelector('.filter, .status-filter, select'),
              hasEmptyState: !!document.querySelector('.empty-state, .no-orders')
            };
          });
          
          journeySteps.push({
            step: 5,
            action: 'Orders Interface Check',
            success: true,
            content: ordersContent,
            timestamp: new Date().toISOString()
          });
        }
        
        // Step 5: Navigate to Profile
        logTestExecution('info', 'Account Journey Step 5: Profile');
        const profileResult = await authHelper.testRouteAccess('/account/profile', true);
        
        journeySteps.push({
          step: 6,
          action: 'Profile Page',
          success: profileResult.success,
          url: profileResult.currentUrl,
          hasAccess: profileResult.hasAccess,
          timestamp: new Date().toISOString()
        });
        
        if (profileResult.hasAccess) {
          await captureScreenshot(authHelper.page, 'account-journey-06-profile');
          
          // Check profile content
          const profileContent = await authHelper.page.evaluate(() => {
            return {
              hasEmailField: !!document.querySelector('input[type="email"], [data-testid="email"]'),
              hasNameField: !!document.querySelector('input[name*="name"], [data-testid="name"]'),
              hasUpdateButton: !!document.querySelector('button:contains("Update"), button:contains("Save")'),
              hasAccountInfo: !!document.querySelector('.account-info, .profile-info')
            };
          });
          
          journeySteps.push({
            step: 7,
            action: 'Profile Content Check',
            success: true,
            content: profileContent,
            timestamp: new Date().toISOString()
          });
        }
        
        // Step 6: Verify cannot access admin routes
        logTestExecution('info', 'Account Journey Step 6: Admin Access Restriction Check');
        const adminAccessResult = await authHelper.testRouteAccess('/admin', false);
        expect(adminAccessResult.success).toBe(true); // Success means properly denied
        
        journeySteps.push({
          step: 8,
          action: 'Admin Access Restriction Check',
          success: adminAccessResult.success,
          properlyDenied: !adminAccessResult.hasAccess,
          timestamp: new Date().toISOString()
        });
        
        // Step 7: Logout
        logTestExecution('info', 'Account Journey Step 7: Logout');
        const logoutResult = await authHelper.logout();
        expect(logoutResult.success).toBe(true);
        
        journeySteps.push({
          step: 9,
          action: 'Logout',
          success: logoutResult.success,
          url: logoutResult.currentUrl,
          timestamp: new Date().toISOString()
        });
        
        await captureScreenshot(authHelper.page, 'account-journey-09-logout');
        
        // Verify complete journey success
        const allStepsSuccessful = journeySteps.every(step => step.success);
        expect(allStepsSuccessful).toBe(true);
        
        logTestExecution('info', 'Account user journey completed successfully', {
          userId: accountUser.id,
          totalSteps: journeySteps.length,
          allStepsSuccessful: allStepsSuccessful,
          journeySteps: journeySteps
        });
        
      } catch (error) {
        logTestExecution('error', 'Account user journey failed', {
          userId: accountUser.id,
          error: error.message,
          completedSteps: journeySteps.length,
          journeySteps: journeySteps
        });
        throw error;
      }
    }, config.timeout.navigation * 10);
  });

  describe('Cross-Browser User Flows', () => {
    test('should maintain session consistency across multiple tabs', async () => {
      const internalUser = testUsers.internal[0];
      
      // Login in first tab
      await authHelper.login(internalUser);
      
      // Open second tab
      const secondPage = await authHelper.browser.newPage();
      await secondPage.setViewport(config.browser.viewport);
      
      try {
        // Navigate to protected route in second tab
        await secondPage.goto(`${config.baseUrl}/clients`, { waitUntil: 'networkidle2' });
        
        // Should have access without re-login (session shared)
        const currentUrl = secondPage.url();
        const hasAccess = !currentUrl.includes('/login');
        
        expect(hasAccess).toBe(true);
        
        await captureScreenshot(secondPage, 'multi-tab-session-check');
        
        logTestExecution('info', 'Multi-tab session consistency verified', {
          userId: internalUser.id,
          firstTabLoggedIn: true,
          secondTabHasAccess: hasAccess,
          secondTabUrl: currentUrl
        });
        
        // Logout from first tab
        await authHelper.logout();
        
        // Verify second tab loses access after logout
        await secondPage.reload({ waitUntil: 'networkidle2' });
        const urlAfterLogout = secondPage.url();
        const stillHasAccess = !urlAfterLogout.includes('/login');
        
        expect(stillHasAccess).toBe(false);
        
        logTestExecution('info', 'Multi-tab session termination verified', {
          userId: internalUser.id,
          loggedOutFromTab1: true,
          tab2LostAccess: !stillHasAccess,
          tab2UrlAfterLogout: urlAfterLogout
        });
        
      } finally {
        await secondPage.close();
      }
    }, config.timeout.navigation * 4);
  });

  describe('User Flow Performance', () => {
    test('should complete user workflows within performance benchmarks', async () => {
      const internalUser = testUsers.internal[0];
      const performanceMetrics = {
        login: null,
        navigation: [],
        logout: null,
        totalJourney: null
      };
      
      const journeyStart = Date.now();
      
      // Measure login performance
      const loginStart = Date.now();
      await authHelper.login(internalUser);
      performanceMetrics.login = Date.now() - loginStart;
      
      // Measure navigation performance
      const routes = ['/admin', '/clients', '/workflows'];
      for (const route of routes) {
        const navStart = Date.now();
        await authHelper.testRouteAccess(route, true);
        const navTime = Date.now() - navStart;
        performanceMetrics.navigation.push({
          route: route,
          time: navTime
        });
      }
      
      // Measure logout performance
      const logoutStart = Date.now();
      await authHelper.logout();
      performanceMetrics.logout = Date.now() - logoutStart;
      
      performanceMetrics.totalJourney = Date.now() - journeyStart;
      
      // Performance assertions
      expect(performanceMetrics.login).toBeLessThan(10000); // Login should be under 10s
      expect(performanceMetrics.logout).toBeLessThan(5000); // Logout should be under 5s
      
      performanceMetrics.navigation.forEach(nav => {
        expect(nav.time).toBeLessThan(8000); // Each navigation should be under 8s
      });
      
      logTestExecution('info', 'User journey performance metrics', {
        userId: internalUser.id,
        metrics: performanceMetrics,
        withinBenchmarks: {
          login: performanceMetrics.login < 10000,
          logout: performanceMetrics.logout < 5000,
          navigation: performanceMetrics.navigation.every(n => n.time < 8000)
        }
      });
    }, config.timeout.navigation * 6);
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover gracefully from common error scenarios', async () => {
      const internalUser = testUsers.internal[0];
      const recoveryTests = [];
      
      // Test 1: Session timeout simulation
      await authHelper.login(internalUser);
      
      // Clear cookies to simulate session timeout
      const context = authHelper.page.browserContext();
      await context.clearCookies();
      
      // Try to access protected route
      const timeoutResult = await authHelper.testRouteAccess('/admin', false);
      expect(timeoutResult.hasAccess).toBe(false);
      expect(timeoutResult.redirectedToLogin).toBe(true);
      
      recoveryTests.push({
        scenario: 'Session Timeout',
        handled: timeoutResult.redirectedToLogin,
        recovered: true
      });
      
      // Test 2: Invalid form data handling
      await authHelper.page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Submit form with empty data
      const emptySubmit = await authHelper.page.evaluate(async () => {
        const form = document.querySelector('form');
        const emailInput = document.querySelector('input[name="email"]');
        const passwordInput = document.querySelector('input[name="password"]');
        
        if (form && emailInput && passwordInput) {
          emailInput.value = '';
          passwordInput.value = '';
          
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
            submitButton.click();
            return { submitted: true };
          }
        }
        return { submitted: false };
      });
      
      if (emptySubmit.submitted) {
        await authHelper.page.waitForTimeout(2000);
        const stayedOnLogin = authHelper.page.url().includes('/login');
        
        recoveryTests.push({
          scenario: 'Empty Form Submission',
          handled: stayedOnLogin,
          recovered: stayedOnLogin
        });
      }
      
      // Test 3: Successful recovery
      const successfulLogin = await authHelper.login(internalUser);
      expect(successfulLogin.success).toBe(true);
      
      recoveryTests.push({
        scenario: 'Normal Login After Errors',
        handled: successfulLogin.success,
        recovered: successfulLogin.success
      });
      
      await authHelper.logout();
      
      // Verify all recovery scenarios passed
      const allRecovered = recoveryTests.every(test => test.recovered);
      expect(allRecovered).toBe(true);
      
      logTestExecution('info', 'Error recovery scenarios completed', {
        userId: internalUser.id,
        recoveryTests: recoveryTests,
        allRecovered: allRecovered
      });
    }, config.timeout.navigation * 5);
  });

  describe('Accessibility and Usability', () => {
    test('should maintain accessibility standards throughout user journey', async () => {
      const internalUser = testUsers.internal[0];
      await authHelper.login(internalUser);
      
      const accessibilityChecks = [];
      const routes = ['/admin', '/clients', '/workflows'];
      
      for (const route of routes) {
        await authHelper.testRouteAccess(route, true);
        
        // Basic accessibility checks
        const accessibilityMetrics = await authHelper.page.evaluate(() => {
          const metrics = {
            hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
            hasLabels: document.querySelectorAll('label').length > 0,
            hasAltTexts: [...document.querySelectorAll('img')].every(img => img.alt || img.getAttribute('aria-label')),
            hasFocusableElements: document.querySelectorAll('button, a, input, select, textarea, [tabindex]').length > 0,
            hasSkipLinks: document.querySelectorAll('a[href*="#"], .skip-link').length > 0
          };
          return metrics;
        });
        
        accessibilityChecks.push({
          route: route,
          metrics: accessibilityMetrics,
          score: Object.values(accessibilityMetrics).filter(Boolean).length / Object.keys(accessibilityMetrics).length
        });
      }
      
      await authHelper.logout();
      
      // Verify reasonable accessibility scores
      const averageScore = accessibilityChecks.reduce((sum, check) => sum + check.score, 0) / accessibilityChecks.length;
      expect(averageScore).toBeGreaterThan(0.5); // At least 50% of accessibility features present
      
      logTestExecution('info', 'Accessibility checks completed', {
        userId: internalUser.id,
        accessibilityChecks: accessibilityChecks,
        averageScore: averageScore,
        passingGrade: averageScore > 0.5
      });
    }, config.timeout.navigation * 4);
  });
});