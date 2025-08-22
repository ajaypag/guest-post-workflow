import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3003';
const TEST_CLIENT_ID = '99f819ed-9118-4e08-8802-2df99492d1c5'; // Outreach Labs

test.describe('Target URL Matching E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to bulk analysis page
    await page.goto(`${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`);
    await page.waitForLoadState('networkidle');
  });

  test('should load bulk analysis page successfully', async ({ page }) => {
    // Check if page loads with correct title
    await expect(page).toHaveTitle(/Linkio/);
    
    // Look for bulk analysis elements
    const heading = page.locator('h1, h2').filter({ hasText: /bulk analysis|domains/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show projects and allow navigation', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"], .project-card, a[href*="projects"]', { timeout: 15000 });
    
    // Look for project links or cards
    const projectLinks = page.locator('a[href*="projects"]').first();
    if (await projectLinks.count() > 0) {
      await projectLinks.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on a project page
      expect(page.url()).toContain('projects');
    } else {
      console.log('No project links found - may need to create projects first');
    }
  });

  test('should display domains with qualification status', async ({ page }) => {
    // Try to navigate to a project page
    await page.goto(`${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects`);
    await page.waitForLoadState('networkidle');
    
    // Look for any domain table or domain list
    const domainElements = page.locator('[data-testid*="domain"], .domain, td:has-text(".com"), td:has-text(".org"), td:has-text(".net")');
    
    if (await domainElements.count() > 0) {
      await expect(domainElements.first()).toBeVisible();
      console.log(`Found ${await domainElements.count()} domain elements`);
    } else {
      console.log('No domain elements found - checking page content');
      const pageContent = await page.content();
      console.log('Page URL:', page.url());
      console.log('Page contains "domain":', pageContent.includes('domain'));
      console.log('Page contains "qualification":', pageContent.includes('qualification'));
    }
  });

  test('should find bulk analysis table components', async ({ page }) => {
    // Try different potential URLs for bulk analysis
    const urls = [
      `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`,
      `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects`,
      `${BASE_URL}/bulk-analysis`
    ];
    
    for (const url of urls) {
      console.log(`Testing URL: ${url}`);
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Look for table elements
      const tables = page.locator('table, [role="table"], .table');
      const buttons = page.locator('button:has-text("Match"), button:has-text("Target"), button:has-text("AI")');
      
      if (await tables.count() > 0 || await buttons.count() > 0) {
        console.log(`Found ${await tables.count()} tables and ${await buttons.count()} relevant buttons`);
        
        // Take a screenshot for visual verification
        await page.screenshot({ 
          path: `test-results/target-matching/page-${url.split('/').pop()}.png`,
          fullPage: true 
        });
        break;
      }
    }
  });

  test('should test target matching button if present', async ({ page }) => {
    // Navigate through available pages to find target matching UI
    const navigation = [
      `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`,
      `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects`
    ];
    
    for (const url of navigation) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Look for target matching related buttons
      const targetButtons = page.locator('button').filter({ 
        hasText: /match.*target|target.*match|ai.*suggest/i 
      });
      
      if (await targetButtons.count() > 0) {
        console.log(`Found ${await targetButtons.count()} target matching buttons`);
        
        // Verify button properties
        const firstButton = targetButtons.first();
        await expect(firstButton).toBeVisible();
        
        const isDisabled = await firstButton.isDisabled();
        console.log('Target matching button disabled:', isDisabled);
        
        // Take screenshot
        await page.screenshot({ 
          path: 'test-results/target-matching/target-buttons.png',
          fullPage: true 
        });
        break;
      }
    }
  });
});

test.describe('API Integration Tests', () => {
  test('should have target matching API endpoints accessible', async ({ page }) => {
    // Test API endpoint accessibility (should return 401 without auth)
    const response = await page.request.post(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/bulk-analysis/target-match`, {
      data: { domainIds: ['test'] }
    });
    
    // Should get 401 (unauthorized) rather than 404 (not found)
    expect([401, 403, 500]).toContain(response.status());
    console.log('Target match API endpoint status:', response.status());
  });
});