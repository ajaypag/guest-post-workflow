/**
 * Client Detail Page Audit Test
 * 
 * Comprehensive test to audit the client detail page for:
 * 1. Tab navigation functionality
 * 2. Activity timeline component issues (duplicate components)
 * 3. Overall UX and layout issues
 * 4. Visual and functional problems
 */

import { test, expect, Page } from '@playwright/test';

const CLIENT_ID = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
const LOGIN_EMAIL = 'ajay@outreachlabs.com';

// Helper function for authentication
async function loginAsInternal(page: Page) {
  await page.goto('/login');
  
  // Fill login form
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', 'password123'); // Adjust as needed
  
  // Submit login
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForURL(/\/(clients|dashboard)/, { timeout: 10000 });
}

test.describe('Client Detail Page Audit', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for all operations
    page.setDefaultTimeout(30000);
  });

  test('should complete comprehensive audit of client detail page', async ({ page }) => {
    // Step 1: Authentication
    console.log('🔐 Step 1: Authenticating...');
    await loginAsInternal(page);
    
    // Take screenshot after login
    await page.screenshot({ 
      path: 'test-results/01-after-login.png', 
      fullPage: true 
    });

    // Step 2: Navigate to client detail page
    console.log('🔍 Step 2: Navigating to client detail page...');
    await page.goto(`/clients/${CLIENT_ID}`);
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/02-client-detail-initial.png', 
      fullPage: true 
    });

    // Step 3: Test basic page structure
    console.log('📋 Step 3: Testing basic page structure...');
    
    // Check if main elements are present
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    const clientName = await page.locator('h1').textContent();
    console.log(`✅ Client name loaded: ${clientName}`);
    
    // Check for website link
    const websiteLink = page.locator('a[href*="http"]:has(.lucide-globe)');
    if (await websiteLink.count() > 0) {
      console.log('✅ Website link found');
    } else {
      console.log('⚠️ Website link not found');
    }

    // Step 4: Test tab navigation functionality
    console.log('🔄 Step 4: Testing tab navigation...');
    
    // Find all tab elements
    const tabs = page.locator('[role="tab"], button:has-text("Overview"), button:has-text("Pages"), button:has-text("Orders"), button:has-text("Brand"), button:has-text("Settings")');
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} potential tab elements`);
    
    // Test clicking each tab
    const tabNames = ['overview', 'pages', 'orders', 'brand', 'settings'];
    
    for (const tabName of tabNames) {
      try {
        // Look for tab button (case insensitive)
        const tabButton = page.locator(`button:has-text("${tabName}")`, { hasText: new RegExp(tabName, 'i') });
        
        if (await tabButton.count() > 0) {
          console.log(`🔄 Testing ${tabName} tab...`);
          await tabButton.first().click();
          
          // Wait a moment for content to load
          await page.waitForTimeout(1000);
          
          // Take screenshot of each tab
          await page.screenshot({ 
            path: `test-results/03-tab-${tabName}.png`, 
            fullPage: true 
          });
          
          console.log(`✅ ${tabName} tab clicked successfully`);
        } else {
          console.log(`⚠️ ${tabName} tab not found`);
        }
      } catch (error) {
        console.log(`❌ Error clicking ${tabName} tab: ${error}`);
      }
    }

    // Step 5: Check for duplicate Activity Timeline components
    console.log('👥 Step 5: Checking for duplicate Activity Timeline components...');
    
    // Go back to overview tab to check activity timeline
    const overviewTab = page.locator('button:has-text("Overview")').first();
    if (await overviewTab.count() > 0) {
      await overviewTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for activity timeline components
    const activitySections = page.locator('h3:has-text("Recent Activity"), h3:has-text("Activity Timeline"), .activity-timeline');
    const activityCount = await activitySections.count();
    
    console.log(`Found ${activityCount} activity-related sections`);
    
    if (activityCount > 1) {
      console.log('⚠️ ISSUE DETECTED: Multiple activity sections found (potential duplicates)');
      
      // Take detailed screenshot highlighting the issue
      await page.screenshot({ 
        path: 'test-results/04-duplicate-activity-sections.png', 
        fullPage: true 
      });
      
      // Get details about each activity section
      for (let i = 0; i < activityCount; i++) {
        const section = activitySections.nth(i);
        const sectionText = await section.textContent();
        console.log(`Activity section ${i + 1}: ${sectionText?.substring(0, 100)}...`);
      }
    } else {
      console.log('✅ No duplicate activity sections detected');
    }

    // Step 6: Check Quick Actions positioning
    console.log('⚡ Step 6: Checking Quick Actions positioning...');
    
    const quickActionsSection = page.locator('h3:has-text("Quick Actions")');
    if (await quickActionsSection.count() > 0) {
      console.log('✅ Quick Actions section found');
      
      // Check if it's positioned correctly relative to activity sections
      const quickActionsBounds = await quickActionsSection.boundingBox();
      console.log(`Quick Actions position: ${JSON.stringify(quickActionsBounds)}`);
    } else {
      console.log('⚠️ Quick Actions section not found');
    }

    // Step 7: Test responsive behavior
    console.log('📱 Step 7: Testing responsive behavior...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/05-mobile-view.png', 
      fullPage: true 
    });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/06-tablet-view.png', 
      fullPage: true 
    });
    
    // Back to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);

    // Step 8: Test interactive elements
    console.log('🔘 Step 8: Testing interactive elements...');
    
    // Test buttons and links
    const buttons = page.locator('button, a[href]');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} interactive elements`);
    
    // Check for any obvious broken interactions
    let brokenElements = 0;
    for (let i = 0; i < Math.min(buttonCount, 10); i++) { // Test first 10 to avoid timeout
      try {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        if (!isVisible || !isEnabled) {
          brokenElements++;
        }
      } catch (error) {
        brokenElements++;
      }
    }
    
    if (brokenElements > 0) {
      console.log(`⚠️ Found ${brokenElements} potentially problematic interactive elements`);
    } else {
      console.log('✅ Interactive elements appear to be working');
    }

    // Step 9: Check for JavaScript errors
    console.log('🐛 Step 9: Checking for JavaScript errors...');
    
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate around to trigger any errors
    await page.reload();
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log(`❌ Found ${consoleErrors.length} JavaScript errors:`);
      consoleErrors.forEach((error, index) => {
        console.log(`Error ${index + 1}: ${error}`);
      });
    } else {
      console.log('✅ No JavaScript errors detected');
    }

    // Step 10: Final comprehensive screenshot
    console.log('📸 Step 10: Taking final comprehensive screenshot...');
    
    await page.screenshot({ 
      path: 'test-results/07-final-state.png', 
      fullPage: true 
    });

    // Step 11: Generate audit report data
    console.log('📊 Step 11: Generating audit report data...');
    
    const auditData = {
      timestamp: new Date().toISOString(),
      clientId: CLIENT_ID,
      pageTitle: await page.title(),
      url: page.url(),
      viewport: await page.viewportSize(),
      activitySectionsCount: activityCount,
      interactiveElementsCount: buttonCount,
      jsErrors: consoleErrors,
      issues: {
        duplicateActivitySections: activityCount > 1,
        brokenInteractiveElements: brokenElements > 0,
        hasJsErrors: consoleErrors.length > 0
      }
    };
    
    console.log('📋 Audit Data:', JSON.stringify(auditData, null, 2));
    
    // Final validation - ensure we can still navigate
    const backButton = page.locator('button:has-text("Back"), a:has-text("Back")');
    if (await backButton.count() > 0) {
      console.log('✅ Back navigation available');
    } else {
      console.log('⚠️ Back navigation not found');
    }
  });

  test('should test tab accessibility and keyboard navigation', async ({ page }) => {
    // Login first
    await loginAsInternal(page);
    await page.goto(`/clients/${CLIENT_ID}`);
    await page.waitForLoadState('networkidle');
    
    console.log('♿ Testing accessibility and keyboard navigation...');
    
    // Test keyboard navigation through tabs
    const firstTab = page.locator('button:has-text("Overview"), [role="tab"]').first();
    
    if (await firstTab.count() > 0) {
      await firstTab.focus();
      
      // Test Tab key navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      
      await page.screenshot({ 
        path: 'test-results/08-keyboard-navigation.png', 
        fullPage: true 
      });
      
      console.log('✅ Keyboard navigation test completed');
    }
  });

  test('should identify layout and spacing issues', async ({ page }) => {
    // Login first
    await loginAsInternal(page);
    await page.goto(`/clients/${CLIENT_ID}`);
    await page.waitForLoadState('networkidle');
    
    console.log('📏 Testing layout and spacing issues...');
    
    // Check for overlapping elements
    const allElements = page.locator('div, section, article, header, footer, nav, main');
    const elementCount = await allElements.count();
    
    console.log(`Analyzing ${elementCount} layout elements for spacing issues...`);
    
    // Take measurements of key sections
    const measurements = [];
    
    const keySelectors = [
      'h1', // Client name
      'h3:has-text("Quick Actions")', // Quick Actions
      'h3:has-text("Recent Activity")', // Activity section
      '[role="tablist"], .tabs', // Tab navigation
    ];
    
    for (const selector of keySelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const bbox = await element.boundingBox();
        measurements.push({
          selector,
          boundingBox: bbox
        });
      }
    }
    
    console.log('Layout measurements:', JSON.stringify(measurements, null, 2));
    
    // Take a screenshot with measurement highlights
    await page.screenshot({ 
      path: 'test-results/09-layout-analysis.png', 
      fullPage: true 
    });
  });
});

test.afterAll(async () => {
  console.log('\n📋 CLIENT DETAIL PAGE AUDIT COMPLETE');
  console.log('==========================================');
  console.log('Screenshots and detailed logs saved to test-results/');
  console.log('Key areas tested:');
  console.log('✓ Tab navigation functionality');
  console.log('✓ Activity timeline duplicate detection');
  console.log('✓ Responsive design');
  console.log('✓ Interactive elements');
  console.log('✓ JavaScript error detection');
  console.log('✓ Accessibility testing');
  console.log('✓ Layout and spacing analysis');
});