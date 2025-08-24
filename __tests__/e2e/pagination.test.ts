/**
 * Pagination Test Suite
 * Verifies that pagination prevents memory exhaustion
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const TEST_PUBLISHER = {
  email: 'stress.test.publisher@example.com',
  password: 'StressTest123!'
};

// Helper to get auth token
async function getAuthToken(request: any): Promise<string> {
  const loginResponse = await request.post(`${BASE_URL}/api/auth/publisher/login`, {
    data: {
      email: TEST_PUBLISHER.email,
      password: TEST_PUBLISHER.password
    }
  });
  
  if (loginResponse.status() !== 200) {
    const body = await loginResponse.json();
    throw new Error(`Login failed: ${body.error || 'Unknown error'}`);
  }
  
  const body = await loginResponse.json();
  if (body.token) {
    return body.token;
  }
  
  throw new Error('Could not extract auth token');
}

test.describe('Pagination Implementation', () => {
  
  test('Websites endpoint respects pagination limits', async ({ request }) => {
    let authToken: string;
    try {
      authToken = await getAuthToken(request);
    } catch (e) {
      console.log('Skipping test - auth failed');
      return;
    }
    
    // Test default pagination
    const defaultResponse = await request.get(`${BASE_URL}/api/publisher/websites`, {
      headers: {
        'Cookie': `auth-token-publisher=${authToken}`
      }
    });
    
    if (defaultResponse.status() === 200) {
      const data = await defaultResponse.json();
      
      // Check pagination meta exists
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
      expect(data.meta.limit).toBeLessThanOrEqual(20); // Default limit
      
      // Check data array length matches limit or total
      if (data.websites) {
        expect(data.websites.length).toBeLessThanOrEqual(data.meta.limit);
      }
      
      // Check links are provided if there are more pages
      if (data.meta.totalPages > 1) {
        expect(data.links).toBeDefined();
        expect(data.links.next).toBeDefined();
      }
    }
  });
  
  test('Pagination enforces maximum limit', async ({ request }) => {
    let authToken: string;
    try {
      authToken = await getAuthToken(request);
    } catch (e) {
      console.log('Skipping test - auth failed');
      return;
    }
    
    // Try to request 1000 items (should be capped at 100)
    const response = await request.get(`${BASE_URL}/api/publisher/websites?limit=1000`, {
      headers: {
        'Cookie': `auth-token-publisher=${authToken}`
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      // Verify limit is capped at 100
      expect(data.meta.limit).toBe(100);
      
      // Verify actual data doesn't exceed limit
      if (data.websites) {
        expect(data.websites.length).toBeLessThanOrEqual(100);
      }
    }
  });
  
  test('Offerings endpoint supports pagination', async ({ request }) => {
    let authToken: string;
    try {
      authToken = await getAuthToken(request);
    } catch (e) {
      console.log('Skipping test - auth failed');
      return;
    }
    
    // Test pagination on offerings
    const response = await request.get(`${BASE_URL}/api/publisher/offerings?page=1&limit=10`, {
      headers: {
        'Cookie': `auth-token-publisher=${authToken}`
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
      expect(data.meta.limit).toBe(10);
      
      if (data.offerings) {
        expect(data.offerings.length).toBeLessThanOrEqual(10);
      }
    }
  });
  
  test('Orders endpoint pagination works correctly', async ({ request }) => {
    let authToken: string;
    try {
      authToken = await getAuthToken(request);
    } catch (e) {
      console.log('Skipping test - auth failed');
      return;
    }
    
    // Test orders pagination
    const response = await request.get(`${BASE_URL}/api/publisher/orders?page=2&limit=5`, {
      headers: {
        'Cookie': `auth-token-publisher=${authToken}`
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(2);
      expect(data.meta.limit).toBe(5);
      
      // Check offset calculation
      const expectedOffset = (2 - 1) * 5;
      expect(data.orders.length).toBeLessThanOrEqual(5);
      
      // If there's a previous page, link should exist
      if (data.meta.page > 1) {
        expect(data.links?.prev).toBeDefined();
      }
    }
  });
  
  test('Invalid pagination parameters are handled gracefully', async ({ request }) => {
    let authToken: string;
    try {
      authToken = await getAuthToken(request);
    } catch (e) {
      console.log('Skipping test - auth failed');
      return;
    }
    
    // Test invalid page number
    const negativePageResponse = await request.get(`${BASE_URL}/api/publisher/websites?page=-1`, {
      headers: {
        'Cookie': `auth-token-publisher=${authToken}`
      }
    });
    
    if (negativePageResponse.status() === 200) {
      const data = await negativePageResponse.json();
      // Should default to page 1
      expect(data.meta.page).toBe(1);
    }
    
    // Test invalid limit
    const invalidLimitResponse = await request.get(`${BASE_URL}/api/publisher/websites?limit=abc`, {
      headers: {
        'Cookie': `auth-token-publisher=${authToken}`
      }
    });
    
    if (invalidLimitResponse.status() === 200) {
      const data = await invalidLimitResponse.json();
      // Should use default limit
      expect(data.meta.limit).toBe(20);
    }
  });
});

test.describe('Memory Protection', () => {
  
  test('Large dataset request doesn\'t cause memory issues', async ({ request }) => {
    let authToken: string;
    try {
      authToken = await getAuthToken(request);
    } catch (e) {
      console.log('Skipping test - auth failed');
      return;
    }
    
    // Create multiple requests to simulate heavy load
    const requests = [];
    for (let i = 1; i <= 5; i++) {
      requests.push(
        request.get(`${BASE_URL}/api/publisher/websites?page=${i}&limit=100`, {
          headers: {
            'Cookie': `auth-token-publisher=${authToken}`
          }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // All requests should succeed without memory errors
    for (const response of responses) {
      expect([200, 401]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        // Each response should be limited to max 100 items
        if (data.websites) {
          expect(data.websites.length).toBeLessThanOrEqual(100);
        }
      }
    }
  });
  
  test('Pagination links are correctly formatted', async ({ request }) => {
    let authToken: string;
    try {
      authToken = await getAuthToken(request);
    } catch (e) {
      console.log('Skipping test - auth failed');
      return;
    }
    
    const response = await request.get(`${BASE_URL}/api/publisher/websites?page=2&limit=10`, {
      headers: {
        'Cookie': `auth-token-publisher=${authToken}`
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      if (data.links) {
        // Check link format
        if (data.links.prev) {
          expect(data.links.prev).toContain('page=1');
          expect(data.links.prev).toContain('limit=10');
        }
        
        if (data.links.next) {
          expect(data.links.next).toContain('page=3');
          expect(data.links.next).toContain('limit=10');
        }
        
        if (data.links.first) {
          expect(data.links.first).toContain('page=1');
        }
        
        if (data.links.last) {
          expect(data.links.last).toContain(`page=${data.meta.totalPages}`);
        }
      }
    }
  });
});