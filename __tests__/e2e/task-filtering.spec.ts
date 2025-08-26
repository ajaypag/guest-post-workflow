import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'ajay@outreachlabs.com';
const TEST_PASSWORD = 'FA64!I$nrbCauS^d';

test.describe('Task Filtering Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page with redirect to internal tasks
    await page.goto('http://localhost:3000/login?redirect=/internal/tasks');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Perform login with better selectors
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    
    // Click the sign in button
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect - could be /account/dashboard or /internal/tasks or /
    await page.waitForURL((url) => {
      return url.pathname !== '/login';
    }, { timeout: 10000 });
    
    // Navigate to tasks page if not already there
    if (!page.url().includes('/internal/tasks')) {
      await page.goto('http://localhost:3000/internal/tasks');
    }
    await page.waitForLoadState('networkidle');
  });

  test('should show current user tasks by default', async ({ page }) => {
    // Check that "My Tasks" is selected
    const dropdown = page.locator('button').filter({ hasText: 'My Tasks' });
    await expect(dropdown).toBeVisible();
    
    // Check that tasks are displayed (or no tasks message)
    const tasksContainer = page.locator('main');
    await expect(tasksContainer).toContainText(/task|no tasks/i);
    
    console.log('✅ My Tasks view loads correctly');
  });

  test('should show other user tasks when selected', async ({ page }) => {
    // Open the dropdown
    const dropdown = page.locator('button').filter({ hasText: /My Tasks|All Tasks|Team Members/i }).first();
    await dropdown.click();
    
    // Wait for dropdown menu to appear
    await page.waitForSelector('[role="listbox"], .absolute.z-10, [data-radix-popper-content-wrapper]', { timeout: 5000 });
    
    // Look for team members section or any user with tasks
    const teamMembersOptions = page.locator('button[role="option"], div[role="option"], button').filter({ hasText: /@outreachlabs\.com/ });
    const optionCount = await teamMembersOptions.count();
    
    if (optionCount > 0) {
      // Get the first user with tasks (look for one with a count)
      const userWithTasks = teamMembersOptions.filter({ hasText: /\(\d+\/\d+\)/ }).first();
      const hasUserWithTasks = await userWithTasks.count() > 0;
      
      if (hasUserWithTasks) {
        const userText = await userWithTasks.textContent();
        console.log(`Selecting user: ${userText}`);
        
        // Click on the user
        await userWithTasks.click();
        
        // Wait for the tasks to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Check what's displayed
        const mainContent = await page.locator('main').textContent();
        console.log('Main content after selection:', mainContent?.substring(0, 200));
        
        // Check if tasks are shown or if it says "No tasks"
        if (mainContent?.includes('No tasks')) {
          // Extract the task count from the dropdown
          const match = userText?.match(/\((\d+)\/(\d+)\)/);
          if (match && parseInt(match[2]) > 0) {
            throw new Error(`User ${userText} shows ${match[2]} tasks in dropdown but displays "No tasks" when selected`);
          }
        }
        
        console.log('✅ User task filtering works');
      } else {
        console.log('⚠️ No users with tasks found in dropdown');
      }
    } else {
      console.log('⚠️ No team members found in dropdown');
    }
  });

  test('should show all tasks when "All Tasks" is selected', async ({ page }) => {
    // Open the dropdown
    const dropdown = page.locator('button').filter({ hasText: /My Tasks|All Tasks/i }).first();
    await dropdown.click();
    
    // Select "All Tasks"
    const allTasksOption = page.locator('button[role="option"], div[role="option"], button').filter({ hasText: 'All Tasks' }).first();
    
    if (await allTasksOption.count() > 0) {
      await allTasksOption.click();
      
      // Wait for tasks to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Verify the dropdown now shows "All Tasks"
      await expect(page.locator('button').filter({ hasText: 'All Tasks' })).toBeVisible();
      
      console.log('✅ All Tasks view loads correctly');
    } else {
      console.log('⚠️ "All Tasks" option not found');
    }
  });

  test('should show unassigned tasks when selected', async ({ page }) => {
    // Open the dropdown  
    const dropdown = page.locator('button').filter({ hasText: /My Tasks|Unassigned/i }).first();
    await dropdown.click();
    
    // Select "Unassigned"
    const unassignedOption = page.locator('button[role="option"], div[role="option"], button').filter({ hasText: 'Unassigned' }).first();
    
    if (await unassignedOption.count() > 0) {
      await unassignedOption.click();
      
      // Wait for tasks to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Verify the dropdown now shows "Unassigned"
      await expect(page.locator('button').filter({ hasText: 'Unassigned' })).toBeVisible();
      
      console.log('✅ Unassigned tasks view loads correctly');
    } else {
      console.log('⚠️ "Unassigned" option not found');
    }
  });
});

test('debug: inspect API calls', async ({ page }) => {
  // Set up request interception
  const apiCalls: any[] = [];
  
  page.on('request', request => {
    if (request.url().includes('/api/internal/tasks')) {
      apiCalls.push({
        url: request.url(),
        method: request.method(),
        params: new URL(request.url()).searchParams.toString()
      });
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/internal/tasks')) {
      response.json().then(data => {
        console.log('API Response:', {
          url: response.url(),
          status: response.status(),
          taskCount: data.tasks?.length || 0,
          stats: data.stats
        });
      }).catch(() => {});
    }
  });
  
  // Login
  await page.goto('http://localhost:3000/login?redirect=/internal/tasks');
  await page.waitForLoadState('domcontentloaded');
  
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for redirect
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  
  // Go to tasks page if not already there
  if (!page.url().includes('/internal/tasks')) {
    await page.goto('http://localhost:3000/internal/tasks');
  }
  await page.waitForLoadState('networkidle');
  
  console.log('Initial API calls:', apiCalls);
  
  // Try selecting another user
  const dropdown = page.locator('button').filter({ hasText: /My Tasks/i }).first();
  await dropdown.click();
  await page.waitForTimeout(500);
  
  // Find and click a user with tasks
  const userOption = page.locator('button[role="option"], div[role="option"]').filter({ hasText: /@outreachlabs\.com/ }).filter({ hasText: /\(\d+\/\d+\)/ }).first();
  
  if (await userOption.count() > 0) {
    const userText = await userOption.textContent();
    console.log('Selecting user:', userText);
    
    apiCalls.length = 0; // Clear previous calls
    await userOption.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    console.log('API calls after user selection:', apiCalls);
  }
});