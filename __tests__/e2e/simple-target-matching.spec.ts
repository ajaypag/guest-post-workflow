import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';
const TEST_CLIENT_ID = '99f819ed-9118-4e08-8802-2df99492d1c5'; 
const LOGIN_EMAIL = 'ajay@outreachlabs.com';
const LOGIN_PASSWORD = 'FA64!I$nrbCauS^d';

async function loginAndNavigate(page: any, targetUrl: string) {
  console.log('🔐 Starting login process...');
  
  // 1. Go to login page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  // 2. Fill credentials and login
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  // 3. Wait for login to complete (check for success indicators)
  await page.waitForFunction(
    () => !window.location.href.includes('/login'),
    { timeout: 15000 }
  );
  
  console.log('✅ Login completed, now navigating to target page...');
  
  // 4. Navigate to target page
  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');
  
  console.log('📍 Successfully navigated to:', page.url());
  return page.url();
}

test.describe('Target URL Matching Frontend Tests', () => {
  
  test('should login and access bulk analysis page', async ({ page }) => {
    const targetUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`;
    const finalUrl = await loginAndNavigate(page, targetUrl);
    
    // Verify we're on the right page
    expect(finalUrl).toContain('bulk-analysis');
    expect(finalUrl).not.toContain('/login');
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/target-matching/01-bulk-analysis-page.png',
      fullPage: true 
    });
    
    // Look for bulk analysis content
    const pageText = await page.textContent('body');
    console.log('Page contains "bulk":', pageText?.toLowerCase().includes('bulk'));
    console.log('Page contains "analysis":', pageText?.toLowerCase().includes('analysis'));
  });

  test('should find and navigate to projects', async ({ page }) => {
    const targetUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`;
    await loginAndNavigate(page, targetUrl);
    
    // Look for project navigation
    const projectLinks = page.locator('a[href*="projects"]');
    const projectButtons = page.locator('button:has-text("project"), a:has-text("project")');
    
    console.log(`Found ${await projectLinks.count()} project links`);
    console.log(`Found ${await projectButtons.count()} project buttons`);
    
    if (await projectLinks.count() > 0) {
      const firstProject = projectLinks.first();
      console.log('🎯 Clicking on first project link...');
      await firstProject.click();
      await page.waitForLoadState('domcontentloaded');
      
      console.log('✅ Navigated to project:', page.url());
      
      // Take screenshot of project page
      await page.screenshot({ 
        path: 'test-results/target-matching/02-project-page.png',
        fullPage: true 
      });
    } else {
      console.log('⚠️ No project links found on bulk analysis page');
      await page.screenshot({ 
        path: 'test-results/target-matching/02-no-projects.png',
        fullPage: true 
      });
    }
  });

  test('should find domains and target matching UI elements', async ({ page }) => {
    // Login and navigate to bulk analysis
    const targetUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`;
    await loginAndNavigate(page, targetUrl);
    
    // Try to find project and navigate to it
    const projectLinks = page.locator('a[href*="projects/"]');
    if (await projectLinks.count() > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
      console.log('✅ On project page:', page.url());
    }
    
    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);
    
    // Look for target matching UI elements
    const elements = {
      tables: await page.locator('table').count(),
      domainCells: await page.locator('td:has-text(".com"), td:has-text(".org")').count(),
      targetMatchButtons: await page.locator('button:has-text("Match Target"), button:has-text("Target URLs")').count(),
      aiSuggestionButtons: await page.locator('button:has-text("AI suggest"), button:has-text("Get AI")').count(),
      targetPageHeaders: await page.locator('th:has-text("Target Page"), th:has-text("Target URL")').count(),
      qualityBadges: await page.locator('[class*="quality"], span:has-text("excellent"), span:has-text("good")').count(),
      checkboxes: await page.locator('input[type="checkbox"]').count()
    };
    
    console.log('🔍 UI Elements Found:');
    Object.entries(elements).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
    
    // Take comprehensive screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/03-ui-elements.png',
      fullPage: true 
    });
    
    // If we found domains, try to interact with them
    if (elements.domainCells > 0) {
      console.log('✅ Found domain table! Testing interactions...');
      
      // Try to select some domains
      const checkboxes = page.locator('input[type="checkbox"]');
      if (await checkboxes.count() > 0) {
        console.log('Selecting first few domains...');
        for (let i = 0; i < Math.min(3, await checkboxes.count()); i++) {
          await checkboxes.nth(i).check();
          await page.waitForTimeout(500);
        }
        
        // Look for bulk action buttons that appear after selection
        await page.waitForTimeout(1000);
        const bulkButtons = page.locator('button:has-text("Match Target"), button:has-text("Target URL")');
        console.log(`Found ${await bulkButtons.count()} bulk action buttons after selection`);
        
        if (await bulkButtons.count() > 0) {
          console.log('🎯 Target matching button found and enabled!');
          const button = bulkButtons.first();
          
          // Check button state
          const isVisible = await button.isVisible();
          const isEnabled = !(await button.isDisabled());
          console.log(`Button visible: ${isVisible}, enabled: ${isEnabled}`);
          
          if (isVisible && isEnabled) {
            await button.hover();
            await page.screenshot({ 
              path: 'test-results/target-matching/04-target-match-button.png' 
            });
          }
        }
      }
    } else {
      console.log('⚠️ No domain table found - may need different navigation');
    }
  });

  test('should test Target Page column with AI suggestions', async ({ page }) => {
    await loginAndNavigate(page, `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`);
    
    // Navigate to project if available
    const projectLinks = page.locator('a[href*="projects/"]');
    if (await projectLinks.count() > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
    }
    
    await page.waitForTimeout(2000);
    
    // Look specifically for Target Page column
    const targetPageCells = page.locator('td').filter({ hasText: /AI Suggested|Multiple options|Not selected/ });
    const sparkleIcons = page.locator('[class*="sparkle"], svg[class*="sparkle"]');
    const qualityIndicators = page.locator('span:has-text("🎯"), span:has-text("✅"), span:has-text("⚠️")');
    
    console.log('🎯 Target Page Column Elements:');
    console.log(`  Target page cells: ${await targetPageCells.count()}`);
    console.log(`  Sparkle icons: ${await sparkleIcons.count()}`);
    console.log(`  Quality indicators: ${await qualityIndicators.count()}`);
    
    // Look for "Get AI suggestion" buttons
    const aiSuggestButtons = page.locator('button:has-text("🎯 Get AI suggestion"), button:has-text("Get AI")');
    console.log(`  AI suggestion buttons: ${await aiSuggestButtons.count()}`);
    
    if (await aiSuggestButtons.count() > 0) {
      console.log('✅ Found AI suggestion buttons in Target Page column!');
      await page.screenshot({ 
        path: 'test-results/target-matching/05-target-page-column.png',
        fullPage: true 
      });
    }
  });

  test('should verify MatchQualityIndicator components', async ({ page }) => {
    await loginAndNavigate(page, `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis`);
    
    // Navigate to project
    const projectLinks = page.locator('a[href*="projects/"]');
    if (await projectLinks.count() > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
    }
    
    await page.waitForTimeout(2000);
    
    // Look for quality indicator elements
    const qualityElements = {
      excellent: await page.locator('span:has-text("🎯"), span:has-text("excellent")').count(),
      good: await page.locator('span:has-text("✅"), span:has-text("good")').count(),
      fair: await page.locator('span:has-text("⚠️"), span:has-text("fair")').count(),
      poor: await page.locator('span:has-text("❌"), span:has-text("poor")').count()
    };
    
    console.log('🏆 Quality Indicators Found:');
    Object.entries(qualityElements).forEach(([quality, count]) => {
      console.log(`  ${quality}: ${count}`);
    });
    
    const totalQualityIndicators = Object.values(qualityElements).reduce((a, b) => a + b, 0);
    if (totalQualityIndicators > 0) {
      console.log('✅ MatchQualityIndicator components are present!');
    } else {
      console.log('⚠️ No quality indicators found - may need domains with target matching data');
    }
    
    await page.screenshot({ 
      path: 'test-results/target-matching/06-quality-indicators.png',
      fullPage: true 
    });
  });
});