const { chromium } = require('playwright');

async function testPublisherPortal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔧 Testing Publisher Portal...');
  
  try {
    // Test 1: Login page loads
    console.log('1. Testing login page load...');
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.waitForSelector('#password', { timeout: 10000 });
    console.log('✅ Login page loaded with form elements');
    
    // Test 2: Login with test credentials
    console.log('2. Testing login functionality...');
    await page.fill('#email', 'test.publisher@example.com');
    await page.fill('#password', 'TestPassword123!');
    
    // Listen for console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Listen for network responses
    page.on('response', response => {
      if (response.url().includes('/api/auth/publisher/login')) {
        console.log(`Login API response: ${response.status()}`);
      }
    });
    
    await page.click('button[type="submit"]');
    
    // Wait longer and check for any error messages on the page
    await page.waitForTimeout(5000);
    
    // Check for error messages on the form
    const errorMessage = await page.locator('.text-red-700, .text-red-600, [class*="error"]').textContent().catch(() => null);
    if (errorMessage) {
      console.log(`Form error: ${errorMessage}`);
    }
    
    // Check if we're redirected to dashboard
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('/publisher') && !currentUrl.includes('/login')) {
      console.log('✅ Login successful - redirected to publisher area');
    } else {
      console.log('❌ Login may have failed - still on login page or error');
      
      // Try to go to publisher dashboard directly to test auth
      console.log('   Trying to access dashboard directly...');
      await page.goto('http://localhost:3001/publisher');
      await page.waitForTimeout(2000);
      const dashboardUrl = page.url();
      console.log(`   Dashboard URL: ${dashboardUrl}`);
      
      if (dashboardUrl.includes('/publisher') && !dashboardUrl.includes('/login')) {
        console.log('✅ Authentication worked - could access dashboard directly');
      } else {
        console.log('❌ Authentication failed - redirected back to login');
      }
    }
    
    // Test 3: Check for navigation
    console.log('3. Testing navigation elements...');
    
    // Let's first see what's actually on the page
    const pageContent = await page.content();
    const hasNav = pageContent.includes('<nav');
    const hasDashboard = pageContent.includes('Dashboard');
    const hasWebsites = pageContent.includes('Websites');
    const hasOfferings = pageContent.includes('Offerings');
    
    console.log(`   - Page contains <nav> tag: ${hasNav ? '✅' : '❌'}`);
    console.log(`   - Page contains 'Dashboard': ${hasDashboard ? '✅' : '❌'}`);
    console.log(`   - Page contains 'Websites': ${hasWebsites ? '✅' : '❌'}`);
    console.log(`   - Page contains 'Offerings': ${hasOfferings ? '✅' : '❌'}`);
    
    // Try to find h1 tags to see what page we're on
    const h1Elements = await page.locator('h1').allTextContents();
    console.log(`   - H1 elements: ${h1Elements.join(', ')}`);
    
    try {
      await page.waitForSelector('nav', { timeout: 5000 });
      const navExists = await page.locator('nav').count() > 0;
      if (navExists) {
        console.log('✅ Navigation element found');
        
        // Check for specific nav links
        const dashboardLink = await page.locator('a:has-text("Dashboard")').count();
        const websitesLink = await page.locator('a:has-text("My Websites")').count();
        const offeringsLink = await page.locator('a:has-text("Offerings")').count();
        
        console.log(`   - Dashboard link: ${dashboardLink > 0 ? '✅' : '❌'}`);
        console.log(`   - Websites link: ${websitesLink > 0 ? '✅' : '❌'}`);
        console.log(`   - Offerings link: ${offeringsLink > 0 ? '✅' : '❌'}`);
      } else {
        console.log('❌ Navigation element not found');
      }
    } catch (e) {
      console.log('❌ Navigation not found within timeout');
      
      // Let's check if there are any elements that might be navigation
      const allLinks = await page.locator('a').allTextContents();
      console.log(`   - All links on page: ${allLinks.slice(0, 10).join(', ')}`);
    }
    
    // Test 4: Test direct navigation to pages
    console.log('4. Testing direct page access...');
    
    const pagesToTest = [
      { name: 'Offerings', url: '/publisher/offerings' },
      { name: 'Websites', url: '/publisher/websites' },
      { name: 'Dashboard', url: '/publisher' }
    ];
    
    for (const pageTest of pagesToTest) {
      console.log(`   Testing ${pageTest.name} page...`);
      try {
        await page.goto(`http://localhost:3001${pageTest.url}`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const h1Elements = await page.locator('h1').allTextContents();
        console.log(`   - URL: ${currentUrl}`);
        console.log(`   - H1 content: ${h1Elements.join(', ')}`);
        
        if (currentUrl === `http://localhost:3001${pageTest.url}`) {
          console.log(`   ✅ ${pageTest.name} page loads correctly`);
        } else {
          console.log(`   ❌ ${pageTest.name} page redirected elsewhere`);
        }
      } catch (e) {
        console.log(`   ❌ Error accessing ${pageTest.name}: ${e.message}`);
      }
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testPublisherPortal();