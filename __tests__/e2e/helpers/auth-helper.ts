import { Page } from '@playwright/test';

/**
 * Authentication helper for E2E tests
 * Handles authentication for different user types
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
  userType: 'internal' | 'account';
  password?: string;
}

export const TEST_USERS = {
  internal: {
    id: 'internal-user-1',
    email: 'test-internal@outreachlabs.com',
    name: 'Test Internal User',
    userType: 'internal' as const,
    password: process.env.E2E_TEST_PASSWORD || 'defaultpassword'
  },
  account: {
    id: 'account-user-1', 
    email: 'test-account@client.com',
    name: 'Test Account User',
    userType: 'account' as const,
    password: process.env.E2E_TEST_PASSWORD || 'defaultpassword'
  }
};

/**
 * Mock authentication by setting browser storage
 */
export async function mockAuthentication(page: Page, user: TestUser) {
  await page.addInitScript((userData) => {
    // Mock NextAuth session
    window.localStorage.setItem('nextauth.session-token', 'mock-session-token');
    
    // Mock user session data
    window.sessionStorage.setItem('user_session', JSON.stringify({
      userId: userData.id,
      userType: userData.userType,
      name: userData.name,
      email: userData.email,
      authenticated: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }));
    
    // Mock auth token
    window.localStorage.setItem('auth_token', 'mock-jwt-token');
    
    // Override fetch to mock auth API calls
    const originalFetch = window.fetch;
    window.fetch = function(input, init = {}) {
      const url = typeof input === 'string' ? input : input.url;
      
      // Mock session verification
      if (url.includes('/api/auth/session')) {
        return Promise.resolve(new Response(JSON.stringify({
          user: userData,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      // Add auth headers to API calls
      if (url.includes('/api/') && !init.headers) {
        init.headers = {};
      }
      
      if (url.includes('/api/') && init.headers) {
        (init.headers as any)['Authorization'] = 'Bearer mock-jwt-token';
      }
      
      return originalFetch(input, init);
    };
  }, user);
}

/**
 * Authenticate as internal user with full access
 */
export async function authenticateAsInternalUser(page: Page) {
  await mockAuthentication(page, TEST_USERS.internal);
  
  // Verify authentication worked
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Check if we're properly authenticated (should not redirect to login)
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error('Authentication failed - redirected to login page');
  }
}

/**
 * Authenticate as account user with limited access  
 */
export async function authenticateAsAccountUser(page: Page) {
  await mockAuthentication(page, TEST_USERS.account);
  
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error('Authentication failed - redirected to login page');
  }
}

/**
 * Clear authentication and logout
 */
export async function clearAuthentication(page: Page) {
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
}

/**
 * Check if user is properly authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const sessionData = await page.evaluate(() => {
      return window.sessionStorage.getItem('user_session');
    });
    
    return sessionData !== null;
  } catch {
    return false;
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser(page: Page): Promise<TestUser | null> {
  try {
    const sessionData = await page.evaluate(() => {
      return window.sessionStorage.getItem('user_session');
    });
    
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Mock API authentication middleware for tests
 */
export async function mockAuthAPI(page: Page) {
  await page.route('**/api/auth/**', async route => {
    const url = route.request().url();
    
    if (url.includes('/session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: TEST_USERS.internal,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      });
    } else if (url.includes('/signin')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else if (url.includes('/signout')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else {
      await route.continue();
    }
  });
}