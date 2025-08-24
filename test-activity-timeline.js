const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testActivityTimeline() {
  let browser;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console logs and errors
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      console.log(`[BROWSER CONSOLE - ${msg.type()}]`, msg.text());
    });
    
    page.on('pageerror', error => {
      errors.push(error.toString());
      console.error('[BROWSER ERROR]', error);
    });
    
    page.on('requestfailed', request => {
      console.error('[REQUEST FAILED]', request.url(), request.failure().errorText);
    });
    
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: '/tmp/1-login-page.png',
      fullPage: true 
    });
    console.log('Screenshot 1: Login page saved');
    
    // Fill in login credentials (try admin user first)
    await page.type('#email', 'admin@example.com');
    await page.type('#password', 'admin123'); // Default admin password
    
    console.log('Clicking sign in...');
    await page.click('[type="submit"]');
    
    // Wait for either navigation or error
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      console.log('✅ Navigation successful after login');
    } catch (navError) {
      console.log('⚠️  Navigation timeout, checking current URL...');
      console.log('Current URL:', page.url());
      
      // Take screenshot to see what happened
      await page.screenshot({ 
        path: '/tmp/login-attempt-result.png',
        fullPage: true 
      });
      
      // If still on login page, login failed
      if (page.url().includes('/login')) {
        console.log('❌ Still on login page - login failed');
        // Continue with test anyway to check API directly
      } else {
        console.log('✅ URL changed, assuming login worked');
      }
    }
    
    // Take screenshot after login
    await page.screenshot({ 
      path: '/tmp/2-after-login.png',
      fullPage: true 
    });
    console.log('Screenshot 2: After login saved');
    
    console.log('Navigating to client detail page...');
    await page.goto('http://localhost:3000/clients/da659bb0-8614-4e0d-9997-ede114a30a13', { 
      waitUntil: 'networkidle0' 
    });
    
    // Take screenshot of client detail page
    await page.screenshot({ 
      path: '/tmp/3-client-detail-page.png',
      fullPage: true 
    });
    console.log('Screenshot 3: Client detail page saved');
    
    // Wait for activity timeline to load
    console.log('Waiting for activity timeline...');
    try {
      await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
      
      // Check for activity timeline section
      const activityTimelineElements = await page.$$eval('h3', elements => 
        elements.filter(h3 => h3.textContent.includes('Recent Activity')).length
      );
      
      console.log(`Found ${activityTimelineElements} "Recent Activity" sections`);
      
      if (activityTimelineElements > 1) {
        console.warn('⚠️  WARNING: Found duplicate "Recent Activity" sections!');
      } else if (activityTimelineElements === 1) {
        console.log('✅ Found exactly one "Recent Activity" section');
      } else {
        console.error('❌ No "Recent Activity" section found!');
      }
      
      // Wait a bit more for any dynamic content
      await page.waitForTimeout(3000);
      
      // Take screenshot of activity timeline section
      await page.screenshot({ 
        path: '/tmp/4-activity-timeline-focused.png',
        fullPage: true 
      });
      console.log('Screenshot 4: Activity timeline focused saved');
      
      // Check if activity timeline has loaded data
      const activityItems = await page.$$eval('.space-y-4 > div', elements => elements.length);
      console.log(`Found ${activityItems} activity items`);
      
      // Check for loading spinner or error states
      const loadingSpinner = await page.$('.animate-spin');
      const errorIcon = await page.$('[data-lucide="alert-circle"]');
      
      if (loadingSpinner) {
        console.log('⏳ Activity timeline is still loading...');
      } else if (errorIcon) {
        console.log('⚠️  Activity timeline showing error state (using sample data)');
      } else {
        console.log('✅ Activity timeline loaded successfully');
      }
      
      // Test the API endpoint directly
      console.log('Testing API endpoint directly...');
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/clients/da659bb0-8614-4e0d-9997-ede114a30a13/activity?limit=7');
          const status = res.status;
          const data = await res.json();
          return { status, data };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 200) {
        console.log('✅ API endpoint working correctly');
        console.log(`📊 Activities returned: ${response.data.activities?.length || 0}`);
      } else {
        console.error('❌ API endpoint failed:', response.status);
      }
      
    } catch (timeoutError) {
      console.error('❌ Timeout waiting for activity timeline to load');
    }
    
    // Final comprehensive screenshot
    await page.screenshot({ 
      path: '/tmp/5-final-state.png',
      fullPage: true 
    });
    console.log('Screenshot 5: Final state saved');
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      testResults: {
        loginSuccessful: !page.url().includes('/login'),
        clientPageLoaded: page.url().includes('/clients/da659bb0-8614-4e0d-9997-ede114a30a13'),
        activityTimelineSections: activityTimelineElements,
        duplicateSectionsFound: activityTimelineElements > 1,
        apiResponse: response,
        consoleMessages: consoleMessages,
        errors: errors
      }
    };
    
    fs.writeFileSync('/tmp/activity-timeline-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📋 Test Report saved to /tmp/activity-timeline-test-report.json');
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`✅ Login: ${report.testResults.loginSuccessful ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Client Page: ${report.testResults.clientPageLoaded ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Activity Timeline Sections: ${report.testResults.activityTimelineSections} found`);
    console.log(`✅ Duplicate Sections: ${report.testResults.duplicateSectionsFound ? 'FOUND (ISSUE)' : 'NONE (GOOD)'}`);
    console.log(`✅ API Endpoint: ${report.testResults.apiResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Console Errors: ${errors.length} errors logged`);
    
    if (errors.length === 0 && !report.testResults.duplicateSectionsFound && report.testResults.apiResponse.status === 200) {
      console.log('\n🎉 ALL TESTS PASSED! Activity timeline is working correctly.');
    } else {
      console.log('\n⚠️  Some issues found. Check the screenshots and report for details.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Run the test
testActivityTimeline().catch(console.error);