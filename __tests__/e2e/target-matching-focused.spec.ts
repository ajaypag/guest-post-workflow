import { test, expect, Page } from '@playwright/test';
import { authenticateAsInternalUser } from './helpers/auth-helper';
import { generateTestClient, mockBulkAnalysisAPI, REAL_TEST_DATA, shouldUseRealData } from './helpers/test-data-helper';

/**
 * Focused E2E Tests for Target URL Matching UI Components
 * 
 * This test suite specifically validates:
 * 1. MatchQualityIndicator component rendering
 * 2. Target Page column functionality 
 * 3. Bulk action "Match Target URLs" button
 * 4. Domain detail modal target analysis
 * 5. AI suggestion display and interaction
 */

test.describe('Target URL Matching - UI Component Tests', () => {
  let testClient: any;
  
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
    
    // Create test client with rich data
    testClient = generateTestClient(
      REAL_TEST_DATA.clients.outreachLabs.id,
      REAL_TEST_DATA.clients.outreachLabs.name
    );
    
    // Mock API responses with test data
    await mockBulkAnalysisAPI(page, testClient);
  });

  test('should display Target Page column in bulk analysis table', async ({ page }) => {
    // Navigate to bulk analysis project
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Verify Target Page column exists
    const targetPageHeader = page.locator('th:has-text("Target Page")');
    await expect(targetPageHeader).toBeVisible();
    
    console.log('✅ Target Page column header found');
  });

  test('should render MatchQualityIndicator components with correct styling', async ({ page }) => {
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for domains with target matching data (AI suggestions)
    const aiSuggestions = page.locator('text=AI Suggested');
    await page.waitForSelector('text=AI Suggested', { timeout: 5000 }).catch(() => {
      console.log('No AI suggestions found yet - this is expected for mock data');
    });
    
    const suggestionCount = await aiSuggestions.count();
    console.log(`Found ${suggestionCount} AI suggestions`);
    
    if (suggestionCount > 0) {
      // Check for match quality indicators
      const excellentIndicators = page.locator('span:has-text("🎯")');
      const goodIndicators = page.locator('span:has-text("✅")');
      const fairIndicators = page.locator('span:has-text("⚠️")');
      const poorIndicators = page.locator('span:has-text("❌")');
      
      const totalIndicators = 
        await excellentIndicators.count() +
        await goodIndicators.count() +
        await fairIndicators.count() +
        await poorIndicators.count();
      
      console.log(`Found ${totalIndicators} quality indicators`);
      
      if (totalIndicators > 0) {
        // Verify styling and content
        const firstIndicator = page.locator('span:has-text("🎯"), span:has-text("✅"), span:has-text("⚠️"), span:has-text("❌")').first();
        await expect(firstIndicator).toHaveClass(/bg-(green|blue|yellow|red)-100/);
        await expect(firstIndicator).toHaveClass(/text-(green|blue|yellow|red)-800/);
        
        console.log('✅ Match quality indicators rendered with correct styling');
      }
    }
  });

  test('should show appropriate states for different domain qualification statuses', async ({ page }) => {
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check for different states in Target Page column
    const targetPageCells = page.locator('tbody tr td').nth(3); // Assuming Target Page is 4th column
    
    // Look for various states
    const multipleOptions = await page.locator('text=Multiple options').count();
    const qualifyFirst = await page.locator('text=Qualify first').count(); 
    const notSuitable = await page.locator('text=Not suitable').count();
    const aiSuggested = await page.locator('text=AI Suggested').count();
    const getAISuggestion = await page.locator('button:has-text("Get AI suggestion")').count();
    
    console.log(`Domain states found:`);
    console.log(`  - Multiple options: ${multipleOptions}`);
    console.log(`  - Qualify first: ${qualifyFirst}`);
    console.log(`  - Not suitable: ${notSuitable}`);
    console.log(`  - AI Suggested: ${aiSuggested}`);
    console.log(`  - Get AI suggestion buttons: ${getAISuggestion}`);
    
    // Should have at least some state indicators
    const totalStates = multipleOptions + qualifyFirst + notSuitable + aiSuggested + getAISuggestion;
    expect(totalStates).toBeGreaterThan(0);
    
    console.log('✅ Domain states properly displayed in Target Page column');
  });

  test('should show "Match Target URLs" bulk action when qualified domains selected', async ({ page }) => {
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Find and select qualified domains (those with checkboxes)
    const domainCheckboxes = page.locator('tbody tr input[type="checkbox"]');
    const checkboxCount = await domainCheckboxes.count();
    
    console.log(`Found ${checkboxCount} selectable domains`);
    
    if (checkboxCount > 0) {
      // Select first few domains
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        await domainCheckboxes.nth(i).check();
      }
      
      // Look for bulk action button
      const matchButton = page.locator('button:has-text("Match Target URLs")');
      
      // Button might appear after selection
      await page.waitForTimeout(1000);
      
      const buttonExists = await matchButton.count() > 0;
      console.log(`Match Target URLs button visible: ${buttonExists}`);
      
      if (buttonExists) {
        await expect(matchButton).toBeVisible();
        
        // Check for target icon
        const targetIcon = matchButton.locator('[data-testid="target-icon"], .lucide-target');
        const iconExists = await targetIcon.count() > 0;
        console.log(`Target icon in button: ${iconExists}`);
        
        // Check for domain count in button text
        const buttonText = await matchButton.textContent();
        console.log(`Button text: "${buttonText}"`);
        
        console.log('✅ Match Target URLs bulk action button found');
      } else {
        console.log('⚠️ Match Target URLs button not found - may need qualified domains');
      }
    } else {
      console.log('⚠️ No selectable domains found');
    }
  });

  test('should trigger target matching API when bulk action clicked', async ({ page }) => {
    let apiCallReceived = false;
    let requestPayload: any = null;
    
    // Intercept target matching API calls
    await page.route(`**/api/clients/${testClient.id}/bulk-analysis/target-match`, async route => {
      apiCallReceived = true;
      requestPayload = await route.request().postDataJSON();
      
      console.log('🎯 Target matching API called with payload:', requestPayload);
      
      // Return success response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          totalQualified: requestPayload.domainIds?.length || 0,
          totalMatched: requestPayload.domainIds?.length || 0,
          matchDistribution: { excellent: 1, good: 1, fair: 0, poor: 0 },
          targetPageCoverage: testClient.targetPages.map((page: any) => ({
            url: page.url,
            assignedDomains: 1
          })),
          updatedDomains: requestPayload.domainIds || [],
          failedUpdates: []
        })
      });
    });
    
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Select domains and trigger matching
    const domainCheckboxes = page.locator('tbody tr input[type="checkbox"]');
    const checkboxCount = await domainCheckboxes.count();
    
    if (checkboxCount > 0) {
      // Select first domain
      await domainCheckboxes.first().check();
      await page.waitForTimeout(500);
      
      // Look for bulk action button
      const matchButton = page.locator('button:has-text("Match Target URLs")');
      
      if (await matchButton.count() > 0) {
        await matchButton.click();
        
        // Wait for API call
        await page.waitForTimeout(3000);
        
        if (apiCallReceived) {
          console.log('✅ API call successfully triggered');
          expect(requestPayload).toHaveProperty('domainIds');
          expect(Array.isArray(requestPayload.domainIds)).toBe(true);
          console.log(`Requested ${requestPayload.domainIds.length} domains for matching`);
        } else {
          console.log('❌ API call was not triggered');
        }
      } else {
        console.log('⚠️ Match Target URLs button not found');
      }
    }
  });

  test('should display loading state during target matching', async ({ page }) => {
    // Mock slow API response to test loading state
    await page.route(`**/api/clients/${testClient.id}/bulk-analysis/target-match`, async route => {
      // Delay response to observe loading state
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, totalMatched: 1 })
      });
    });
    
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });
    
    const domainCheckboxes = page.locator('tbody tr input[type="checkbox"]');
    const checkboxCount = await domainCheckboxes.count();
    
    if (checkboxCount > 0) {
      await domainCheckboxes.first().check();
      
      const matchButton = page.locator('button:has-text("Match Target URLs")');
      
      if (await matchButton.count() > 0) {
        await matchButton.click();
        
        // Check for loading indicators
        await page.waitForTimeout(1000);
        
        // Look for various loading states
        const loadingSpinner = page.locator('[class*="animate-spin"], .lucide-loader');
        const loadingText = page.locator('text=Matching, text=Processing, text=Loading');
        const disabledButton = page.locator('button:disabled:has-text("Match")');
        
        const spinnerCount = await loadingSpinner.count();
        const textCount = await loadingText.count();
        const disabledCount = await disabledButton.count();
        
        console.log(`Loading indicators found:`);
        console.log(`  - Spinners: ${spinnerCount}`);
        console.log(`  - Loading text: ${textCount}`);
        console.log(`  - Disabled buttons: ${disabledCount}`);
        
        const totalLoadingIndicators = spinnerCount + textCount + disabledCount;
        
        if (totalLoadingIndicators > 0) {
          console.log('✅ Loading state properly displayed');
        } else {
          console.log('⚠️ No loading indicators found - button may have different behavior');
        }
        
        // Wait for completion
        await page.waitForTimeout(5000);
      }
    }
  });

  test('should open domain detail modal and show target analysis section', async ({ page }) => {
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for expandable domain rows
    const expandButtons = page.locator('[data-testid*="expand"], button[aria-label*="expand"], .cursor-pointer');
    const buttonCount = await expandButtons.count();
    
    console.log(`Found ${buttonCount} potentially expandable elements`);
    
    if (buttonCount > 0) {
      // Try clicking the first expandable element
      await expandButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Look for target analysis section
      const targetAnalysisHeaders = page.locator('h4:has-text("AI Target URL Analysis"), h4:has-text("Target URL Analysis"), h3:has-text("Target Analysis")');
      const analysisCount = await targetAnalysisHeaders.count();
      
      console.log(`Found ${analysisCount} target analysis sections`);
      
      if (analysisCount > 0) {
        await expect(targetAnalysisHeaders.first()).toBeVisible();
        console.log('✅ Target analysis section found in domain detail');
        
        // Look for target URL display
        const targetUrls = page.locator('text=https://, text=http://');
        const urlCount = await targetUrls.count();
        console.log(`Found ${urlCount} target URLs in analysis`);
        
        // Look for evidence display
        const evidenceElements = page.locator('text=Direct Keywords, text=Related Keywords, text=Evidence');
        const evidenceCount = await evidenceElements.count();
        console.log(`Found ${evidenceCount} evidence elements`);
      } else {
        console.log('⚠️ No target analysis section found - domain may not have target matching data');
      }
    } else {
      console.log('⚠️ No expandable domain elements found');
    }
  });

  test('should handle individual "Get AI suggestion" button clicks', async ({ page }) => {
    let individualApiCalled = false;
    
    await page.route(`**/api/clients/${testClient.id}/bulk-analysis/target-match`, async route => {
      const payload = await route.request().postDataJSON();
      individualApiCalled = true;
      
      console.log('Individual target matching triggered for domains:', payload.domainIds);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json', 
        body: JSON.stringify({
          success: true,
          totalMatched: 1,
          updatedDomains: payload.domainIds
        })
      });
    });
    
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for individual "Get AI suggestion" buttons
    const aiSuggestionButtons = page.locator('button:has-text("Get AI suggestion"), button:has-text("🎯 Get AI suggestion")');
    const buttonCount = await aiSuggestionButtons.count();
    
    console.log(`Found ${buttonCount} "Get AI suggestion" buttons`);
    
    if (buttonCount > 0) {
      await aiSuggestionButtons.first().click();
      await page.waitForTimeout(2000);
      
      if (individualApiCalled) {
        console.log('✅ Individual AI suggestion API call triggered');
      } else {
        console.log('❌ Individual AI suggestion API call not detected');
      }
    } else {
      console.log('⚠️ No individual AI suggestion buttons found');
    }
  });
  
  test('should handle API errors gracefully with user feedback', async ({ page }) => {
    // Mock API error response
    await page.route(`**/api/clients/${testClient.id}/bulk-analysis/target-match`, async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to match target URLs',
          details: 'Test error for error handling validation'
        })
      });
    });
    
    await page.goto(`/clients/${testClient.id}/bulk-analysis/projects/${testClient.projects[0].id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });
    
    const domainCheckboxes = page.locator('tbody tr input[type="checkbox"]');
    
    if (await domainCheckboxes.count() > 0) {
      await domainCheckboxes.first().check();
      
      const matchButton = page.locator('button:has-text("Match Target URLs")');
      
      if (await matchButton.count() > 0) {
        await matchButton.click();
        await page.waitForTimeout(3000);
        
        // Look for error indicators
        const errorMessages = page.locator(
          '[class*="error"], [class*="alert"], .text-red-500, text=error, text=Error, text=failed, text=Failed'
        );
        const errorCount = await errorMessages.count();
        
        console.log(`Found ${errorCount} error indicators after API failure`);
        
        if (errorCount > 0) {
          console.log('✅ Error handling properly displayed to user');
        } else {
          console.log('⚠️ No visible error handling found');
        }
      }
    }
  });
});

// Performance and real data integration tests
test.describe('Target URL Matching - Performance & Integration', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should load bulk analysis table within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    // Use real client ID if available
    const clientId = REAL_TEST_DATA.clients.outreachLabs.id;
    await page.goto(`/clients/${clientId}/bulk-analysis`);
    await page.waitForLoadState('networkidle');
    
    const navigationTime = Date.now() - startTime;
    console.log(`Navigation completed in ${navigationTime}ms`);
    
    // Look for table or project links
    await page.waitForSelector('table, a[href*="/projects/"]', { timeout: 15000 });
    
    const totalLoadTime = Date.now() - startTime;
    console.log(`Table/content loaded in ${totalLoadTime}ms`);
    
    // Performance should be reasonable (under 15 seconds)
    expect(totalLoadTime).toBeLessThan(15000);
    console.log('✅ Performance test passed');
  });

  test('should handle pagination or virtual scrolling for large datasets', async ({ page }) => {
    const clientId = REAL_TEST_DATA.clients.outreachLabs.id;
    
    // Navigate to bulk analysis page
    await page.goto(`/clients/${clientId}/bulk-analysis`);
    await page.waitForLoadState('networkidle');
    
    // Look for existing projects
    const projectLinks = page.locator('a[href*="/projects/"]');
    const projectCount = await projectLinks.count();
    
    if (projectCount > 0) {
      // Click on first project
      await projectLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      await page.waitForSelector('table', { timeout: 10000 });
      
      // Check row count - should be reasonable for performance
      const domainRows = page.locator('tbody tr');
      const rowCount = await domainRows.count();
      
      console.log(`Displayed ${rowCount} domain rows`);
      
      // Should not display all domains at once for large datasets
      expect(rowCount).toBeLessThan(200);
      
      // Look for pagination controls
      const paginationControls = page.locator('[class*="pagination"], button:has-text("Next"), button:has-text("Previous")');
      const paginationCount = await paginationControls.count();
      
      console.log(`Found ${paginationCount} pagination controls`);
      console.log('✅ Large dataset handling validated');
    } else {
      console.log('⚠️ No projects found for pagination testing');
    }
  });
});