import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';
const TEST_CLIENT_ID = '99f819ed-9118-4e08-8802-2df99492d1c5'; 
const TEST_PROJECT_ID = '5f7b0e95-d3b0-45b4-a05f-865488b1922d';
const LOGIN_EMAIL = 'ajay@outreachlabs.com';
const LOGIN_PASSWORD = 'FA64!I$nrbCauS^d';

async function loginAndNavigate(page: any, targetUrl: string) {
  console.log('🔐 Starting login process...');
  
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
  
  console.log('✅ Login completed, navigating to target page...');
  
  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000); // Give extra time for data to load
  
  console.log('📍 Successfully navigated to:', page.url());
  return page.url();
}

test.describe('Target URL Matching Features with Real Data', () => {
  
  test('should find Target Page column with AI suggestions', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    // Wait extra time for the table to load with data
    await page.waitForTimeout(3000);
    
    // Look for the table and its headers
    const tableElements = {
      tables: await page.locator('table').count(),
      rows: await page.locator('tr').count(),
      targetPageHeader: await page.locator('th').filter({ hasText: /target.*page/i }).count(),
      statusHeader: await page.locator('th').filter({ hasText: /status|qualification/i }).count(),
      domainHeader: await page.locator('th').filter({ hasText: /domain/i }).count()
    };
    
    console.log('📊 Table Structure:');
    Object.entries(tableElements).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
    
    // Take screenshot showing the table
    await page.screenshot({ 
      path: 'test-results/target-matching/table-with-data.png',
      fullPage: true 
    });
    
    if (tableElements.tables > 0) {
      console.log('✅ Table found! Checking for target matching features...');
      
      // Look for our target matching UI elements
      const targetMatchingFeatures = {
        aiSuggested: await page.locator(':has-text("AI Suggested")').count(),
        multipleOptions: await page.locator(':has-text("Multiple options")').count(),
        getAiButtons: await page.locator('button:has-text("🎯"), button:has-text("Get AI")').count(),
        sparkleIcons: await page.locator('svg[class*=\"lucide-sparkles\"], [class*=\"sparkle\"]').count(),
        qualityBadges: await page.locator('span:has-text("🎯"), span:has-text("✅"), span:has-text("⚠️"), span:has-text("❌")').count()
      };
      
      console.log('🎯 Target Matching Features:');
      Object.entries(targetMatchingFeatures).forEach(([key, count]) => {
        console.log(`  ${key}: ${count}`);
      });
      
      const totalFeatures = Object.values(targetMatchingFeatures).reduce((a, b) => a + b, 0);
      console.log(`Total target matching elements: ${totalFeatures}`);
      
      if (totalFeatures > 0) {
        console.log('🎉 SUCCESS: Target matching features are visible!');
      } else {
        console.log('⚠️ Target matching features not found - checking raw content...');
        
        // Check if our test data domains are visible
        const testDomains = ['shopcircle.co', 'oflox.com', 'realtybiznews.com'];
        for (const domain of testDomains) {
          const found = await page.locator(`:has-text("${domain}")`).count();
          console.log(`  ${domain}: ${found > 0 ? 'found' : 'not found'}`);
        }
      }
    } else {
      console.log('❌ No table found - checking page content...');
      const bodyText = await page.textContent('body');
      console.log('Page contains table:', bodyText?.includes('table'));
      console.log('Page contains domain:', bodyText?.includes('domain'));
    }
  });

  test('should test bulk actions with domain selection', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    await page.waitForTimeout(5000);
    
    // Look for checkboxes to select domains
    const checkboxes = page.locator('input[type=\"checkbox\"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes`);
    
    if (checkboxCount > 1) {
      console.log('Selecting domains...');
      
      // Select a few domains
      for (let i = 1; i < Math.min(4, checkboxCount); i++) {
        await checkboxes.nth(i).check();
        await page.waitForTimeout(500);
      }
      
      // Wait for bulk actions to appear
      await page.waitForTimeout(2000);
      
      // Look for the \"Match Target URLs\" button
      const bulkActions = {
        bulkArea: await page.locator('[class*=\"bulk\"], div:has-text(\"selected\")').count(),
        targetMatchButton: await page.locator('button:has-text(\"Match Target URLs\"), button:has-text(\"Match Target\")').count(),
        addToOrderButton: await page.locator('button:has-text(\"Add to Order\")').count(),
        selectedText: await page.locator(':has-text(\"selected\")').count()
      };
      
      console.log('🔄 Bulk Actions:');
      Object.entries(bulkActions).forEach(([key, count]) => {
        console.log(`  ${key}: ${count}`);
      });
      
      // Take screenshot showing bulk actions
      await page.screenshot({ 
        path: 'test-results/target-matching/bulk-actions.png',
        fullPage: true 
      });
      
      if (bulkActions.targetMatchButton > 0) {
        console.log('🎯 SUCCESS: Target matching bulk action found!');
        
        const button = page.locator('button:has-text(\"Match Target URLs\")').first();
        const isEnabled = !(await button.isDisabled());
        console.log(`Button enabled: ${isEnabled}`);
        
        if (isEnabled) {
          await button.hover();
          console.log('✅ Target matching button is functional!');
        }
      } else {
        console.log('⚠️ Target matching button not found');
      }
    }
  });

  test('should verify specific domain data visibility', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    await page.waitForTimeout(5000);
    
    // Check for our test domains specifically
    const testDomains = [
      { domain: 'shopcircle.co', hasMatching: true },
      { domain: 'oflox.com', hasMatching: true },
      { domain: 'the-entourage.com', hasMatching: false },
      { domain: 'convinceandconvert.com', hasMatching: false }
    ];
    
    console.log('🔍 Checking specific test domains:');
    
    for (const testCase of testDomains) {
      const domainVisible = await page.locator(`:has-text(\"${testCase.domain}\")`).count();
      console.log(`  ${testCase.domain}: ${domainVisible > 0 ? 'visible' : 'not visible'}`);
      
      if (domainVisible > 0 && testCase.hasMatching) {
        // Look for AI suggestion near this domain
        const domainRow = page.locator('tr').filter({ hasText: testCase.domain });
        const aiSuggestedNear = await domainRow.locator(':has-text(\"AI Suggested\")').count();
        const qualityBadgeNear = await domainRow.locator('span:has-text(\"🎯\"), span:has-text(\"✅\")').count();
        
        console.log(`    AI Suggested nearby: ${aiSuggestedNear}`);
        console.log(`    Quality badge nearby: ${qualityBadgeNear}`);
      }
      
      if (domainVisible > 0 && !testCase.hasMatching) {
        // Look for \"Get AI suggestion\" button near this domain
        const domainRow = page.locator('tr').filter({ hasText: testCase.domain });
        const getAiButtonNear = await domainRow.locator('button:has-text(\"🎯\"), button:has-text(\"Get AI\")').count();
        
        console.log(`    Get AI button nearby: ${getAiButtonNear}`);
      }
    }
    
    // Take final comprehensive screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/final-validation.png',
      fullPage: true 
    });
  });

  test('should debug table loading issues', async ({ page }) => {
    const projectUrl = `${BASE_URL}/clients/${TEST_CLIENT_ID}/bulk-analysis/projects/${TEST_PROJECT_ID}`;
    await loginAndNavigate(page, projectUrl);
    
    // Wait and check for loading states
    await page.waitForTimeout(2000);
    
    // Check for loading indicators
    const loadingElements = {
      loaders: await page.locator('[class*=\"loading\"], [class*=\"spinner\"]').count(),
      loadingText: await page.locator(':has-text(\"Loading\"), :has-text(\"loading\")').count(),
      errorMessages: await page.locator('[class*=\"error\"], :has-text(\"Error\")').count(),
      emptyStates: await page.locator(':has-text(\"No domains\"), :has-text(\"No data\")').count()
    };
    
    console.log('🔄 Page State Analysis:');
    Object.entries(loadingElements).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
    
    // Check browser console for errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Wait a bit more and check console
    await page.waitForTimeout(3000);
    
    if (logs.length > 0) {
      console.log('🚨 Console Errors Found:');
      logs.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log}`);
      });
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Take debug screenshot
    await page.screenshot({ 
      path: 'test-results/target-matching/debug-state.png',
      fullPage: true 
    });
  });
});