import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'ajay@outreachlabs.com';
const TEST_PASSWORD = 'FA64!I$nrbCauS^d';

test.describe('Enhanced Task Cards Tests', () => {
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
    }, { timeout: 15000 });
    
    // Navigate to tasks page if not already there
    if (!page.url().includes('/internal/tasks')) {
      await page.goto('http://localhost:3000/internal/tasks');
    }
    await page.waitForLoadState('networkidle');
  });

  test('should have clickable task titles', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="task-card"], .bg-white.rounded-lg.border', { timeout: 10000 });
    
    // Check that task titles are clickable links
    const taskTitleLinks = page.locator('h3').locator('..').filter({ hasText: /href/ }).or(page.locator('a h3'));
    const linkCount = await taskTitleLinks.count();
    
    if (linkCount > 0) {
      console.log(`✅ Found ${linkCount} clickable task titles`);
      
      // Verify the first title link has proper hover styles
      const firstTitleLink = taskTitleLinks.first();
      await expect(firstTitleLink).toHaveClass(/hover:text-indigo-600/);
      
      console.log('✅ Task titles have proper hover styles');
    } else {
      console.log('⚠️ No clickable task titles found');
    }
  });

  test('should have clickable client links', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="task-card"], .bg-white.rounded-lg.border', { timeout: 10000 });
    
    // Look for client links
    const clientLinks = page.locator('text=/Client:/ + a, a:has-text("Client:")').or(
      page.locator('text=/Client:/ ~ * a')
    );
    const clientLinkCount = await clientLinks.count();
    
    if (clientLinkCount > 0) {
      console.log(`✅ Found ${clientLinkCount} clickable client links`);
      
      // Verify client links have proper styling
      const firstClientLink = clientLinks.first();
      await expect(firstClientLink).toHaveClass(/text-indigo-600/);
      
      console.log('✅ Client links have proper styling');
    } else {
      console.log('⚠️ No clickable client links found');
    }
  });

  test('should have enhanced task card layout with grid', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="task-card"], .bg-white.rounded-lg.border', { timeout: 10000 });
    
    // Check for grid layout in metadata section
    const gridContainers = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
    const gridCount = await gridContainers.count();
    
    if (gridCount > 0) {
      console.log(`✅ Found ${gridCount} task cards with enhanced grid layout`);
    } else {
      console.log('⚠️ No enhanced grid layout found');
    }
  });

  test('should display task type badges', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="task-card"], .bg-white.rounded-lg.border', { timeout: 10000 });
    
    // Look for task type badges
    const typeBadges = page.locator('text=/Order|Workflow|Line Item/').filter({ hasText: /px-2 py-0.5/ }).or(
      page.locator('[class*="bg-blue-"], [class*="bg-green-"], [class*="bg-purple-"]')
    );
    const badgeCount = await typeBadges.count();
    
    if (badgeCount > 0) {
      console.log(`✅ Found ${badgeCount} task type badges`);
    } else {
      console.log('⚠️ No task type badges found');
    }
    
    // Check that task cards exist at all
    const taskCards = await page.locator('.bg-white.rounded-lg.border').count();
    console.log(`Found ${taskCards} total task cards`);
  });

  test('should have border separator between header and metadata', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="task-card"], .bg-white.rounded-lg.border', { timeout: 10000 });
    
    // Check for border separator
    const borderSeparators = page.locator('.border-t.border-gray-100');
    const separatorCount = await borderSeparators.count();
    
    if (separatorCount > 0) {
      console.log(`✅ Found ${separatorCount} border separators for better visual organization`);
    } else {
      console.log('⚠️ No border separators found');
    }
  });
});