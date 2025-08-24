/**
 * Manual Test: Client Detail Page Duplicate Activity Timeline Fix
 * 
 * This test verifies that the duplicate activity timeline sections have been fixed
 * and the page functions correctly after the Next.js 15 async params fix.
 * 
 * Target URL: http://localhost:3000/clients/aca65919-c0f9-49d0-888b-2c488f7580dc
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
const CLIENT_URL = `http://localhost:3000/clients/${CLIENT_ID}`;
const TEST_RESULTS_DIR = './test-results';

// Ensure test results directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

async function runClientDetailFixTest() {
  let browser;
  let testResults = {
    timestamp: new Date().toISOString(),
    testName: 'Client Detail Page - Duplicate Activity Timeline Fix',
    targetUrl: CLIENT_URL,
    results: {},
    screenshots: [],
    consoleErrors: [],
    verdict: 'PENDING'
  };

  try {
    console.log('🚀 Starting Client Detail Page Fix Verification Test...');
    console.log(`📍 Target URL: ${CLIENT_URL}`);
    console.log('⏰ Test started at:', new Date().toISOString());
    
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1200, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        consoleErrors.push(errorText);
        console.log('🔍 Console error:', errorText);
      }
    });

    // Monitor network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('🚨 Network error:', response.status(), response.url());
      }
    });

    console.log('\n📝 TEST STEP 1: Login Process');
    
    // Step 1: Navigate to login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Take screenshot of login page
    await page.screenshot({
      path: path.join(TEST_RESULTS_DIR, 'fix-verification-01-login-page.png'),
      fullPage: true
    });
    testResults.screenshots.push('fix-verification-01-login-page.png');
    
    console.log('✅ Login page loaded');

    // Step 2: Login with internal user
    await page.type('input[type="email"]', 'ajay@outreachlabs.com');
    await page.click('button[type="submit"]');
    
    // Wait for login redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    console.log('✅ Login successful');

    console.log('\n📝 TEST STEP 2: Navigate to Client Detail Page');
    
    // Step 3: Navigate to client detail page
    await page.goto(CLIENT_URL, { waitUntil: 'networkidle2' });
    
    console.log('✅ Client detail page navigation completed');

    // Take screenshot of initial page load
    await page.screenshot({
      path: path.join(TEST_RESULTS_DIR, 'fix-verification-02-page-loaded.png'),
      fullPage: true
    });
    testResults.screenshots.push('fix-verification-02-page-loaded.png');

    console.log('\n📝 TEST STEP 3: Verify Page Loaded Successfully');
    
    // Step 4: Verify page loaded without 500 error
    const pageTitle = await page.$eval('h1', el => el.textContent?.trim());
    testResults.results.pageTitle = pageTitle;
    
    if (pageTitle) {
      console.log(`✅ Page title found: ${pageTitle}`);
    } else {
      throw new Error('❌ No page title found - page may have failed to load');
    }

    console.log('\n📝 TEST STEP 4: Check for Duplicate Activity Timeline Sections');
    
    // Step 5: Count "Recent Activity" sections
    const activitySections = await page.$$eval('*', els => {
      return els.filter(el => 
        el.textContent && el.textContent.includes('Recent Activity')
      ).length;
    });
    
    testResults.results.activitySectionsFound = activitySections;
    
    if (activitySections === 1) {
      console.log(`✅ FIXED: Found exactly ${activitySections} "Recent Activity" section`);
      testResults.results.duplicateActivityFix = 'PASSED';
    } else {
      console.log(`❌ ISSUE: Found ${activitySections} "Recent Activity" sections (expected: 1)`);
      testResults.results.duplicateActivityFix = 'FAILED';
    }

    console.log('\n📝 TEST STEP 5: Verify Layout Structure');
    
    // Step 6: Check Quick Actions and Activity Timeline positioning
    const quickActionsExists = await page.$('text="Quick Actions"') !== null;
    const activityTimelineExists = await page.$('text="Recent Activity"') !== null;
    
    testResults.results.quickActionsPresent = quickActionsExists;
    testResults.results.activityTimelinePresent = activityTimelineExists;
    
    if (quickActionsExists) {
      console.log('✅ Quick Actions section found');
    }
    
    if (activityTimelineExists) {
      console.log('✅ Activity Timeline section found');
    }

    // Take screenshot highlighting the activity timeline
    await page.screenshot({
      path: path.join(TEST_RESULTS_DIR, 'fix-verification-03-activity-timeline.png'),
      fullPage: true
    });
    testResults.screenshots.push('fix-verification-03-activity-timeline.png');

    console.log('\n📝 TEST STEP 6: Test Tab Navigation');
    
    // Step 7: Test tab navigation
    const tabs = ['Overview', 'Target Pages', 'Orders & Projects', 'Brand & Content', 'Settings'];
    const tabResults = {};
    
    for (const tabName of tabs) {
      try {
        const tabSelector = `button:has-text("${tabName}"), a:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`;
        const tabExists = await page.$(tabSelector) !== null;
        
        if (tabExists) {
          await page.click(tabSelector);
          await page.waitForTimeout(1000);
          
          // Count activity sections in this tab
          const activityInTab = await page.$$eval('*', els => {
            return els.filter(el => 
              el.textContent && el.textContent.includes('Recent Activity')
            ).length;
          });
          
          tabResults[tabName] = {
            accessible: true,
            activitySections: activityInTab
          };
          
          // Take screenshot of each tab
          await page.screenshot({
            path: path.join(TEST_RESULTS_DIR, `fix-verification-04-tab-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`),
            fullPage: true
          });
          testResults.screenshots.push(`fix-verification-04-tab-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);
          
          if (tabName === 'Overview' && activityInTab === 1) {
            console.log(`✅ ${tabName} tab: Correct number of activity sections (${activityInTab})`);
          } else if (tabName !== 'Overview' && activityInTab <= 1) {
            console.log(`✅ ${tabName} tab: No duplicate activity sections (${activityInTab})`);
          } else {
            console.log(`⚠️  ${tabName} tab: Unexpected activity sections count (${activityInTab})`);
          }
        } else {
          tabResults[tabName] = {
            accessible: false,
            activitySections: 0
          };
          console.log(`ℹ️  ${tabName} tab: Not found or not accessible`);
        }
      } catch (error) {
        console.log(`⚠️  Error testing ${tabName} tab:`, error.message);
        tabResults[tabName] = {
          accessible: false,
          error: error.message
        };
      }
    }
    
    testResults.results.tabNavigation = tabResults;

    console.log('\n📝 TEST STEP 7: Test Responsive Design');
    
    // Step 8: Test responsive behavior
    await page.setViewport({ width: 768, height: 1024 }); // Tablet
    await page.waitForTimeout(500);
    
    await page.screenshot({
      path: path.join(TEST_RESULTS_DIR, 'fix-verification-05-tablet-view.png'),
      fullPage: true
    });
    testResults.screenshots.push('fix-verification-05-tablet-view.png');
    
    const tabletActivityCount = await page.$$eval('*', els => {
      return els.filter(el => 
        el.textContent && el.textContent.includes('Recent Activity')
      ).length;
    });
    
    await page.setViewport({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(500);
    
    await page.screenshot({
      path: path.join(TEST_RESULTS_DIR, 'fix-verification-06-mobile-view.png'),
      fullPage: true
    });
    testResults.screenshots.push('fix-verification-06-mobile-view.png');
    
    const mobileActivityCount = await page.$$eval('*', els => {
      return els.filter(el => 
        el.textContent && el.textContent.includes('Recent Activity')
      ).length;
    });
    
    testResults.results.responsive = {
      tablet: { activitySections: tabletActivityCount },
      mobile: { activitySections: mobileActivityCount }
    };
    
    console.log(`✅ Tablet view: ${tabletActivityCount} activity section(s)`);
    console.log(`✅ Mobile view: ${mobileActivityCount} activity section(s)`);

    console.log('\n📝 TEST STEP 8: Final Verification');
    
    // Step 9: Return to desktop view and take final screenshot
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(CLIENT_URL, { waitUntil: 'networkidle2' });
    
    await page.screenshot({
      path: path.join(TEST_RESULTS_DIR, 'fix-verification-07-final-verification.png'),
      fullPage: true
    });
    testResults.screenshots.push('fix-verification-07-final-verification.png');

    // Store console errors
    testResults.consoleErrors = consoleErrors;
    
    // Determine overall test verdict
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('chunk') &&
      !error.includes('warning') &&
      !error.includes('404')
    );
    
    const activitySectionTestPassed = activitySections === 1;
    const noCriticalErrors = criticalErrors.length === 0;
    const pageLoaded = !!pageTitle;
    
    if (activitySectionTestPassed && noCriticalErrors && pageLoaded) {
      testResults.verdict = 'ALL TESTS PASSED';
      console.log('\n🎉 ALL TESTS PASSED! Duplicate activity timeline issue has been successfully resolved.');
    } else {
      testResults.verdict = 'SOME ISSUES FOUND';
      console.log('\n⚠️  Some issues were found during testing.');
    }

    console.log('\n📊 TEST SUMMARY:');
    console.log(`   📄 Page loaded: ${pageLoaded ? 'YES' : 'NO'}`);
    console.log(`   🎯 Activity sections: ${activitySections} (expected: 1)`);
    console.log(`   🖥️  Quick Actions present: ${quickActionsExists ? 'YES' : 'NO'}`);
    console.log(`   📱 Responsive: Tablet(${tabletActivityCount}), Mobile(${mobileActivityCount})`);
    console.log(`   ⚠️  Console errors: ${consoleErrors.length} total, ${criticalErrors.length} critical`);
    console.log(`   🏆 Overall verdict: ${testResults.verdict}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    testResults.verdict = 'TEST FAILED';
    testResults.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
    
    // Write detailed test report
    const reportPath = path.join(TEST_RESULTS_DIR, 'client-detail-fix-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    console.log(`\n📋 Detailed test report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: ${TEST_RESULTS_DIR}/`);
    console.log('⏰ Test completed at:', new Date().toISOString());
    
    return testResults;
  }
}

// Run the test
if (require.main === module) {
  runClientDetailFixTest()
    .then(results => {
      console.log('\n' + '='.repeat(80));
      console.log('🏁 CLIENT DETAIL PAGE FIX VERIFICATION COMPLETE');
      console.log('='.repeat(80));
      
      if (results.verdict === 'ALL TESTS PASSED') {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runClientDetailFixTest };