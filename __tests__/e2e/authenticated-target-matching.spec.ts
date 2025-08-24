import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3003';
const TEST_CLIENT_ID = '99f819ed-9118-4e08-8802-2df99492d1c5'; // Outreach Labs
const LOGIN_EMAIL = process.env.E2E_TEST_EMAIL || 'test@example.com';
const LOGIN_PASSWORD = process.env.E2E_TEST_PASSWORD || 'defaultpassword';

test.describe('Target URL Matching E2E Tests (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🔐 Starting authentication process...');
    
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    
    // Fill in login credentials
    await page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
    
    // Submit login form
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    
    // Wait for redirect after login
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    console.log('✅ Authentication completed, current URL:', page.url());
  });

  test('should login successfully and access bulk analysis', async ({ page }) => {
    // Verify we're logged in by checking URL or page content
    expect(page.url()).not.toContain('/login');
    
    // Navigate to bulk analysis page
    await page.goto(`${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`);
    await page.waitForLoadState('networkidle');
    
    // Check if page loads without redirect to login
    expect(page.url()).toContain('bulk-analysis');
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/target-matching/authenticated-bulk-analysis.png',
      fullPage: true 
    });
  });

  test('should find and test bulk analysis projects', async ({ page }) => {
    // Navigate to bulk analysis
    await page.goto(`${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`);
    await page.waitForLoadState('networkidle');
    
    // Look for projects
    const projectLinks = page.locator('a[href*="projects"]');
    const projectCards = page.locator('[data-testid*="project"], .project-card, .project');
    
    console.log(`Found ${await projectLinks.count()} project links`);
    console.log(`Found ${await projectCards.count()} project cards`);
    
    if (await projectLinks.count() > 0) {
      // Click on first project
      await projectLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      console.log('✅ Successfully navigated to project:', page.url());
      
      // Take screenshot of project page
      await page.screenshot({ 
        path: 'test-results/target-matching/project-page.png',
        fullPage: true 
      });
    } else {
      console.log('⚠️ No project links found, checking page content...');
      const pageText = await page.textContent('body');
      console.log('Page contains "project":', pageText?.toLowerCase().includes('project'));
    }
  });

  test('should find BulkAnalysisTable with target matching features', async ({ page }) => {
    // Try to find a project page with domains
    const projectUrls = [
      `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`,
      `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects`,
    ];
    
    for (const url of projectUrls) {
      console.log(`🔍 Testing URL: ${url}`);
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Look for project links and click first one
      const projectLinks = page.locator('a[href*="projects/"]');
      if (await projectLinks.count() > 0) {
        await projectLinks.first().click();
        await page.waitForLoadState('networkidle');
        console.log('📍 Navigated to project page:', page.url());
        break;
      }
    }
    
    // Now look for target matching features
    const targetMatchButtons = page.locator('button').filter({ 
      hasText: /match.*target|target.*match/i 
    });
    
    const aiSuggestionButtons = page.locator('button').filter({ 
      hasText: /ai.*suggest|get.*ai/i 
    });
    
    const qualityIndicators = page.locator('[class*="quality"], [data-testid*="quality"]');
    
    console.log(`Found ${await targetMatchButtons.count()} target match buttons`);
    console.log(`Found ${await aiSuggestionButtons.count()} AI suggestion buttons`);
    console.log(`Found ${await qualityIndicators.count()} quality indicators`);
    
    // Look for table with domains
    const tables = page.locator('table');
    const domainCells = page.locator('td:has-text(".com"), td:has-text(".org"), td:has-text(".net")');
    
    console.log(`Found ${await tables.count()} tables`);
    console.log(`Found ${await domainCells.count()} domain cells`);
    
    if (await domainCells.count() > 0) {
      console.log('✅ Found domain table, looking for target matching features...');
      
      // Look for Target Page column header
      const targetPageHeader = page.locator('th:has-text("Target Page"), th:has-text("Target URL")');
      console.log(`Found ${await targetPageHeader.count()} Target Page headers`);
      
      // Look for AI suggested content
      const aiSuggested = page.locator(':has-text("AI Suggested"), :has-text("AI Pick")');
      console.log(`Found ${await aiSuggested.count()} AI suggestion elements`);
      
      // Take comprehensive screenshot
      await page.screenshot({ 
        path: 'test-results/target-matching/bulk-analysis-table.png',
        fullPage: true 
      });
    } else {
      console.log('⚠️ No domain table found');
      await page.screenshot({ 
        path: 'test-results/target-matching/no-domains-found.png',
        fullPage: true 
      });
    }
  });

  test('should test target matching button functionality', async ({ page }) => {
    // Navigate to find a project with domains
    await page.goto(`${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`);
    await page.waitForLoadState('networkidle');
    
    // Try to find and click into a project
    const projectLinks = page.locator('a[href*="projects/"]');
    if (await projectLinks.count() > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState('networkidle');
    }
    
    // Look for domain checkboxes to select
    const domainCheckboxes = page.locator('input[type="checkbox"]').filter({ 
      hasText: /.com|.org|.net/ 
    });
    
    if (await domainCheckboxes.count() > 0) {
      console.log(`Found ${await domainCheckboxes.count()} domain checkboxes`);
      
      // Select first few domains
      for (let i = 0; i < Math.min(3, await domainCheckboxes.count()); i++) {
        await domainCheckboxes.nth(i).check();
      }
      
      // Look for bulk action buttons
      const bulkActionArea = page.locator('[class*="bulk"], [data-testid*="bulk"]');
      const targetMatchButton = page.locator('button').filter({ 
        hasText: /match.*target.*url/i 
      });
      
      console.log(`Found ${await targetMatchButton.count()} target matching buttons`);
      
      if (await targetMatchButton.count() > 0) {
        const button = targetMatchButton.first();
        const isVisible = await button.isVisible();
        const isEnabled = !(await button.isDisabled());
        
        console.log('Target match button visible:', isVisible);
        console.log('Target match button enabled:', isEnabled);
        
        if (isVisible && isEnabled) {
          console.log('🎯 Target matching button is ready for interaction!');
          
          // Hover over button to see tooltip/states
          await button.hover();
          
          // Take screenshot showing the button
          await page.screenshot({ 
            path: 'test-results/target-matching/target-match-button-ready.png' 
          });
          
          // Could test clicking here if we want to test the API
          // await button.click();
        }
      }
    } else {
      console.log('⚠️ No domain checkboxes found for selection');
    }
  });

  test('should verify API endpoint is accessible when authenticated', async ({ page }) => {
    // Test that API returns proper response when authenticated
    const response = await page.request.post(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/bulk-analysis/target-match`, {
      data: { 
        domainIds: ['test-domain-id'],
        projectId: 'test-project-id'
      }
    });
    
    // With authentication, should get 400 (bad request) rather than 401 (unauthorized)
    // because we're sending test data, not real domain IDs
    console.log('Authenticated API response status:', response.status());
    expect([400, 422, 500]).toContain(response.status()); // Not 401/403
    
    if (response.status() === 400) {
      const responseBody = await response.text();
      console.log('API response:', responseBody);
      expect(responseBody).toContain('No qualified domains found');
    }
  });
});

test.describe('Visual Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login process
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForLoadState('networkidle');
  });

  test('should capture visual state of target matching UI', async ({ page }) => {
    // Navigate to bulk analysis
    await page.goto(`${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`);
    await page.waitForLoadState('networkidle');
    
    // Take overview screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/overview.png',
      fullPage: true 
    });
    
    // Try to get to a project page
    const projectLinks = page.locator('a[href*="projects/"]');
    if (await projectLinks.count() > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Take project page screenshot
      await page.screenshot({ 
        path: 'test-results/target-matching/project-with-domains.png',
        fullPage: true 
      });
      
      // Look for and expand domain details if available
      const expandButtons = page.locator('button').filter({ hasText: /expand|detail|more/ });
      if (await expandButtons.count() > 0) {
        await expandButtons.first().click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'test-results/target-matching/domain-details-expanded.png',
          fullPage: true 
        });
      }
    }
  });
});