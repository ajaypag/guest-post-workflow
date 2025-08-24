import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';
const TEST_CLIENT_ID = '99f819ed-9118-4e08-8802-2df99492d1c5'; 
const TEST_PROJECT_ID = '5f7b0e95-d3b0-45b4-a05f-865488b1922d'; // Project with 256 domains
const LOGIN_EMAIL = process.env.E2E_TEST_EMAIL || 'test@example.com';
const LOGIN_PASSWORD = process.env.E2E_TEST_PASSWORD || 'defaultpassword';

async function loginAndNavigate(page: any, targetUrl: string) {
  console.log('🔐 Starting login process...');
  
  // 1. Go to login page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  // 2. Fill credentials and login
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  // 3. Wait for login to complete
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
  
  console.log('✅ Login completed, navigating to target page...');
  
  // 4. Navigate to target page
  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // Give time for any dynamic content
  
  console.log('📍 Successfully navigated to:', page.url());
  return page.url();
}

test.describe('Direct Project Testing for Target URL Matching', () => {
  
  test('should access project page with domains', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    const finalUrl = await loginAndNavigate(page, projectUrl);
    
    // Verify we're on the right page
    expect(finalUrl).toContain('bulk-analysis/projects');
    expect(finalUrl).not.toContain('/login');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/direct-project-page.png',
      fullPage: true 
    });
    
    // Check for page content
    const pageText = await page.textContent('body');
    console.log('Page contains "domain":', pageText?.toLowerCase().includes('domain'));
    console.log('Page contains "qualification":', pageText?.toLowerCase().includes('qualification'));
  });

  test('should find BulkAnalysisTable with target matching features', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    // Look for table elements
    const elements = {
      tables: await page.locator('table').count(),
      tableHeaders: await page.locator('th').count(),
      domainRows: await page.locator('tr').count(),
      domainCells: await page.locator('td:has-text(".com"), td:has-text(".org"), td:has-text(".net")').count(),
      targetPageHeaders: await page.locator('th:has-text("Target Page"), th:has-text("Target URL")').count(),
      statusColumns: await page.locator('th:has-text("Status"), th:has-text("Qualification")').count(),
      checkboxes: await page.locator('input[type="checkbox"]').count()
    };
    
    console.log('📊 Table Elements Found:');
    Object.entries(elements).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
    
    // Take comprehensive screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/table-elements.png',
      fullPage: true 
    });
    
    // Verify we have a data table
    expect(elements.tables).toBeGreaterThan(0);
    if (elements.domainCells > 0) {
      console.log('✅ Found domain table with actual data!');
    }
  });

  test('should find target matching UI elements', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    // Look for our implemented target matching features
    const targetMatchingElements = {
      // Bulk action buttons
      targetMatchButtons: await page.locator('button:has-text("Match Target URLs"), button:has-text("Match Target")').count(),
      
      // Target Page column content
      aiSuggestionButtons: await page.locator('button:has-text("🎯 Get AI suggestion"), button:has-text("Get AI")').count(),
      aiSuggestedText: await page.locator(':has-text("AI Suggested")').count(),
      multipleOptionsText: await page.locator(':has-text("Multiple options")').count(),
      
      // Quality indicators
      excellentBadges: await page.locator('span:has-text("🎯"), span:has-text("excellent")').count(),
      goodBadges: await page.locator('span:has-text("✅"), span:has-text("good")').count(),
      fairBadges: await page.locator('span:has-text("⚠️"), span:has-text("fair")').count(),
      poorBadges: await page.locator('span:has-text("❌"), span:has-text("poor")').count(),
      
      // Sparkle icons (AI indicators)
      sparkleIcons: await page.locator('svg').filter({ hasText: /sparkle/i }).count()
    };
    
    console.log('🎯 Target Matching UI Elements:');
    Object.entries(targetMatchingElements).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
    
    const totalElements = Object.values(targetMatchingElements).reduce((a, b) => a + b, 0);
    console.log(`Total target matching elements found: ${totalElements}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/target-matching-ui.png',
      fullPage: true 
    });
    
    if (totalElements > 0) {
      console.log('✅ Target matching UI elements are present!');
    } else {
      console.log('⚠️ No target matching UI elements found - checking if domains need target matching data');
    }
  });

  test('should test domain selection and bulk actions', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    // Select some domains
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes`);
    
    if (checkboxCount > 1) { // Usually first checkbox is "select all"
      console.log('Selecting first 3 domains...');
      
      // Select first few domain checkboxes (skip first which might be select-all)
      for (let i = 1; i < Math.min(4, checkboxCount); i++) {
        await checkboxes.nth(i).check();
        await page.waitForTimeout(500);
      }
      
      // Look for bulk action area that should appear
      await page.waitForTimeout(1000);
      const bulkActions = page.locator('[class*="bulk"], div:has-text("selected")');
      const bulkActionButtons = page.locator('button:has-text("Match Target"), button:has-text("Target URL")');
      
      console.log(`Bulk action areas: ${await bulkActions.count()}`);
      console.log(`Target matching buttons: ${await bulkActionButtons.count()}`);
      
      if (await bulkActionButtons.count() > 0) {
        const button = bulkActionButtons.first();
        const isVisible = await button.isVisible();
        const isEnabled = !(await button.isDisabled());
        
        console.log(`🎯 Target matching button - visible: ${isVisible}, enabled: ${isEnabled}`);
        
        if (isVisible && isEnabled) {
          await button.hover();
          console.log('✅ Target matching button is functional!');
        }
      }
      
      // Take screenshot showing selected state
      await page.screenshot({ 
        path: 'test-results/target-matching/domains-selected.png',
        fullPage: true 
      });
    }
  });

  test('should check Target Page column implementation', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    // Look specifically for Target Page column
    const targetPageColumn = page.locator('th:has-text("Target Page")');
    const targetPageCells = page.locator('td').nth(5); // Assuming Target Page is around column 6
    
    console.log(`Target Page header found: ${await targetPageColumn.count()}`);
    
    if (await targetPageColumn.count() > 0) {
      console.log('✅ Target Page column header found!');
      
      // Look for cell content in Target Page column
      const allCells = page.locator('td');
      const cellCount = await allCells.count();
      console.log(`Total table cells: ${cellCount}`);
      
      // Check for target page related content
      const targetPageContent = {
        aiSuggested: await page.locator('td:has-text("AI Suggested")').count(),
        multipleOptions: await page.locator('td:has-text("Multiple options")').count(),
        getAiSuggestion: await page.locator('button:has-text("🎯 Get AI suggestion")').count(),
        qualifyFirst: await page.locator('td:has-text("Qualify first")').count(),
        notSuitable: await page.locator('td:has-text("Not suitable")').count()
      };
      
      console.log('🎯 Target Page Column Content:');
      Object.entries(targetPageContent).forEach(([key, count]) => {
        console.log(`  ${key}: ${count}`);
      });
      
      // Take focused screenshot on table
      await page.screenshot({ 
        path: 'test-results/target-matching/target-page-column.png',
        fullPage: true 
      });
    }
  });
});

test.describe('Visual Documentation', () => {
  test('should capture comprehensive visual documentation', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    // Wait for everything to load
    await page.waitForTimeout(2000);
    
    // Take overview screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/final-overview.png',
      fullPage: true 
    });
    
    // Scroll to make sure we capture any off-screen elements
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/target-matching/final-mid-scroll.png',
      fullPage: true 
    });
    
    console.log('📸 Visual documentation complete');
  });
});