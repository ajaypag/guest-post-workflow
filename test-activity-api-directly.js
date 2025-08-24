const puppeteer = require('puppeteer');
const fs = require('fs');

async function testActivityAPIDirectly() {
  let browser;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: false,
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
    
    console.log('Testing API endpoint directly...');
    
    // Test the API endpoint directly by visiting it
    await page.goto('http://localhost:3000/api/clients/da659bb0-8614-4e0d-9997-ede114a30a13/activity?limit=7', { 
      waitUntil: 'networkidle0' 
    });
    
    // Take screenshot of API response
    await page.screenshot({ 
      path: '/tmp/api-response.png',
      fullPage: true 
    });
    
    // Get the response as text
    const responseText = await page.evaluate(() => document.body.innerText);
    console.log('API Response:', responseText);
    
    // Try to parse as JSON
    let apiData = null;
    try {
      apiData = JSON.parse(responseText);
      console.log('✅ API Response is valid JSON');
      console.log('Activities count:', apiData.activities?.length || 0);
      console.log('Total activities:', apiData.total || 0);
      console.log('Has more:', apiData.hasMore || false);
      
      if (apiData.activities && apiData.activities.length > 0) {
        console.log('Sample activity:', JSON.stringify(apiData.activities[0], null, 2));
      }
    } catch (parseError) {
      console.error('❌ Failed to parse API response as JSON:', parseError.message);
    }
    
    // Now try to test the client page without authentication
    console.log('\nTrying to access client page directly...');
    await page.goto('http://localhost:3000/clients/da659bb0-8614-4e0d-9997-ede114a30a13', { 
      waitUntil: 'networkidle0' 
    });
    
    // Take screenshot
    await page.screenshot({ 
      path: '/tmp/client-page-direct-access.png',
      fullPage: true 
    });
    
    // Check if we're redirected to login or if we can see the page
    const currentUrl = page.url();
    console.log('Current URL after direct access:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('🔒 Redirected to login - authentication required');
    } else {
      console.log('✅ Can access client page directly');
      
      // Check for activity timeline sections
      try {
        await page.waitForSelector('h3', { timeout: 5000 });
        
        const activitySections = await page.$$eval('h3', elements => 
          elements.filter(h3 => h3.textContent.includes('Recent Activity')).length
        );
        
        console.log(`Found ${activitySections} "Recent Activity" sections`);
        
        if (activitySections > 1) {
          console.warn('⚠️  WARNING: Found duplicate "Recent Activity" sections!');
        } else if (activitySections === 1) {
          console.log('✅ Found exactly one "Recent Activity" section');
        } else {
          console.error('❌ No "Recent Activity" section found!');
        }
        
      } catch (e) {
        console.log('⚠️  Could not find h3 elements on page');
      }
    }
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      apiTest: {
        responseReceived: apiData !== null,
        responseValid: apiData !== null,
        activitiesCount: apiData?.activities?.length || 0,
        totalActivities: apiData?.total || 0
      },
      clientPageTest: {
        redirectedToLogin: currentUrl.includes('/login'),
        canAccessDirectly: !currentUrl.includes('/login'),
        activitySections: currentUrl.includes('/login') ? 'N/A - Login Required' : 'Checked'
      },
      consoleMessages: consoleMessages,
      errors: errors
    };
    
    fs.writeFileSync('/tmp/activity-api-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📋 Test Report saved to /tmp/activity-api-test-report.json');
    
    // Summary
    console.log('\n=== API TEST SUMMARY ===');
    console.log(`✅ API Endpoint: ${report.apiTest.responseReceived ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ JSON Response: ${report.apiTest.responseValid ? 'VALID' : 'INVALID'}`);
    console.log(`✅ Activities Returned: ${report.apiTest.activitiesCount}`);
    console.log(`✅ Authentication: ${report.clientPageTest.redirectedToLogin ? 'REQUIRED' : 'NOT REQUIRED'}`);
    console.log(`✅ Console Errors: ${errors.length} errors logged`);
    
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
testActivityAPIDirectly().catch(console.error);