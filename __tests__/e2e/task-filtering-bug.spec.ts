/**
 * E2E Tests for Task Filtering Bug
 * 
 * Critical Bug: URL /internal/tasks?types=workflow shows all order tasks
 * instead of filtering correctly. This test reproduces the exact bug
 * scenario reported.
 */

import { test, expect, type Page } from '@playwright/test';

// Helper function to mock authentication and API responses
async function setupAuthentication(page: Page) {
  // Mock the session with the specific user ID from the bug report
  await page.route('**/api/auth/session', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc',
          email: 'ajay@outreachlabs.com',
          name: 'Ajay',
          userType: 'internal'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Mock authentication check
  await page.route('**/api/auth/check', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        userType: 'internal'
      })
    });
  });

  await page.goto('/', { waitUntil: 'networkidle' });
}

// Helper to capture API response
async function captureTaskAPIResponse(page: Page, url: string) {
  let apiResponse: any = null;
  
  await page.route('**/api/internal/tasks*', async route => {
    const response = await route.fetch();
    const responseData = await response.json();
    apiResponse = responseData;
    
    await route.fulfill({
      status: response.status(),
      contentType: 'application/json',
      body: JSON.stringify(responseData)
    });
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Wait for API call to complete
  await page.waitForTimeout(1000);
  
  return apiResponse;
}

test.describe('Task Filtering Bug - Critical Issue', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthentication(page);
  });

  test('REPRODUCE BUG: /internal/tasks?types=workflow returns order tasks instead of empty array', async ({ page }) => {
    // This test reproduces the exact bug scenario
    const apiResponse = await captureTaskAPIResponse(page, '/internal/tasks?types=workflow');
    
    // The bug: API returns order tasks when filtering by workflow
    // Expected: 0 tasks (since user has no workflows assigned)
    // Actual: 11 order tasks returned
    
    expect(apiResponse).not.toBeNull();
    
    // Check stats - these are calculated correctly
    expect(apiResponse.stats.byType.workflow).toBe(0);
    expect(apiResponse.stats.byType.order).toBe(11);
    
    // BUG: Tasks array contains orders instead of being empty
    console.log('API Response for workflow filter:', {
      totalTasks: apiResponse.tasks.length,
      taskTypes: apiResponse.tasks.map((t: any) => t.type),
      stats: apiResponse.stats.byType
    });
    
    // This assertion should pass after the bug is fixed
    // Currently fails because bug returns all order tasks
    expect(apiResponse.tasks).toHaveLength(0);
    
    // All tasks should be workflow type (when there are any)
    apiResponse.tasks.forEach((task: any) => {
      expect(task.type).toBe('workflow');
    });
  });

  test('REPRODUCE BUG: /internal/tasks?types=order returns correct order tasks', async ({ page }) => {
    const apiResponse = await captureTaskAPIResponse(page, '/internal/tasks?types=order');
    
    expect(apiResponse).not.toBeNull();
    
    // This should work correctly
    expect(apiResponse.stats.byType.order).toBe(11);
    expect(apiResponse.stats.byType.workflow).toBe(0);
    expect(apiResponse.tasks).toHaveLength(11);
    
    // All tasks should be order type
    apiResponse.tasks.forEach((task: any) => {
      expect(task.type).toBe('order');
    });
  });

  test('REPRODUCE BUG: /internal/tasks?types=workflow,order should return only orders (no workflows)', async ({ page }) => {
    const apiResponse = await captureTaskAPIResponse(page, '/internal/tasks?types=workflow,order');
    
    expect(apiResponse).not.toBeNull();
    
    // Stats should show correct counts
    expect(apiResponse.stats.byType.order).toBe(11);
    expect(apiResponse.stats.byType.workflow).toBe(0);
    
    // Tasks array should contain 11 order tasks (no workflows to include)
    expect(apiResponse.tasks).toHaveLength(11);
    
    apiResponse.tasks.forEach((task: any) => {
      expect(['order', 'workflow']).toContain(task.type);
    });
  });

  test('REPRODUCE BUG: /internal/tasks (no filter) should return all tasks', async ({ page }) => {
    const apiResponse = await captureTaskAPIResponse(page, '/internal/tasks');
    
    expect(apiResponse).not.toBeNull();
    
    // Should return all 11 order tasks
    expect(apiResponse.stats.byType.order).toBe(11);
    expect(apiResponse.stats.byType.workflow).toBe(0);
    expect(apiResponse.stats.total).toBe(11);
    expect(apiResponse.tasks).toHaveLength(11);
  });

  test('UI reflects filtering bug: workflow filter shows order tasks in table', async ({ page }) => {
    await page.goto('/internal/tasks?types=workflow', { waitUntil: 'networkidle' });
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="task-list"], .task-list, table', { timeout: 10000 });
    
    // Check if there are task rows
    const taskRows = await page.locator('table tbody tr, .task-row, [data-testid="task-row"]').count();
    
    // BUG: Should show 0 rows, but currently shows 11 order tasks
    console.log('Task rows visible in UI:', taskRows);
    
    if (taskRows > 0) {
      // Check task types in the UI
      const taskTypes = await page.locator('table tbody tr, .task-row').allTextContents();
      console.log('Task content in UI:', taskTypes.slice(0, 3)); // First 3 rows for debugging
      
      // Should show no tasks when filtering by workflow
      expect(taskRows).toBe(0);
    }
  });

  test('Stats display should be correct even with filtering bug', async ({ page }) => {
    await page.goto('/internal/tasks?types=workflow', { waitUntil: 'networkidle' });
    
    // Look for stats display elements
    const statsSelectors = [
      '[data-testid="stats"]',
      '.stats',
      '.task-stats',
      '[data-testid="workflow-count"]'
    ];
    
    let statsFound = false;
    for (const selector of statsSelectors) {
      const statsElement = await page.locator(selector).first();
      if (await statsElement.isVisible().catch(() => false)) {
        const statsText = await statsElement.textContent();
        console.log('Stats display:', statsText);
        
        // Stats should show 0 workflows
        if (statsText?.includes('workflow') || statsText?.includes('Workflow')) {
          expect(statsText).toContain('0');
        }
        statsFound = true;
        break;
      }
    }
    
    if (!statsFound) {
      console.log('No stats display element found with tested selectors');
    }
  });

  test('API endpoint parameter parsing: type vs types parameter', async ({ page }) => {
    // Test both parameter formats that might be used
    
    // Test 'type' parameter (what the API route expects)
    const typeResponse = await captureTaskAPIResponse(page, '/internal/tasks?type=workflow');
    
    // Test 'types' parameter (what the URL shows)
    const typesResponse = await captureTaskAPIResponse(page, '/internal/tasks?types=workflow');
    
    console.log('Type parameter response:', typeResponse?.tasks?.length || 0);
    console.log('Types parameter response:', typesResponse?.tasks?.length || 0);
    
    // Both should return the same result (currently both show the bug)
    expect(typeResponse?.tasks?.length || 0).toBe(typesResponse?.tasks?.length || 0);
  });
});

test.describe('Edge Cases for Task Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthentication(page);
  });

  test('Multiple type parameters should work correctly', async ({ page }) => {
    const apiResponse = await captureTaskAPIResponse(page, '/internal/tasks?type=order,workflow');
    
    expect(apiResponse).not.toBeNull();
    
    // Should include both order and workflow tasks (only orders exist for this user)
    apiResponse.tasks.forEach((task: any) => {
      expect(['order', 'workflow']).toContain(task.type);
    });
  });

  test('Invalid type parameter should return empty result', async ({ page }) => {
    const apiResponse = await captureTaskAPIResponse(page, '/internal/tasks?type=invalid_type');
    
    expect(apiResponse).not.toBeNull();
    expect(apiResponse.tasks).toHaveLength(0);
    expect(apiResponse.stats.total).toBe(0);
  });

  test('Empty type parameter should return all tasks', async ({ page }) => {
    const apiResponse = await captureTaskAPIResponse(page, '/internal/tasks?type=');
    
    expect(apiResponse).not.toBeNull();
    
    // Should behave like no filter
    expect(apiResponse.tasks.length).toBeGreaterThan(0);
    expect(apiResponse.stats.total).toBe(apiResponse.tasks.length);
  });
});