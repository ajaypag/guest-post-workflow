// Test full publisher flow with authentication
const puppeteer = require('puppeteer');

async function testPublisherFullFlow() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to false to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Testing Full Publisher Portal Flow');
  console.log('===================================\n');
  
  const results = {
    login: { status: 'pending', details: '' },
    dashboard: { status: 'pending', details: '' },
    websites: { status: 'pending', details: '' },
    addWebsite: { status: 'pending', details: '' },
    offerings: { status: 'pending', details: '' },
    pricingRules: { status: 'pending', details: '' }
  };
  
  try {
    // 1. Login
    console.log('1. Testing Login...');
    await page.goto('http://localhost:3000/publisher/login');
    
    // Fill in login form
    await page.type('input[type="email"]', 'test@publisher.com');
    await page.type('input[type="password"]', 'testpublisher123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    
    const currentUrl = page.url();
    if (currentUrl.includes('/publisher') && !currentUrl.includes('/login')) {
      results.login.status = '✅';
      results.login.details = 'Successfully logged in';
      console.log('   ✅ Login successful');
    } else {
      // Check for error message
      const errorText = await page.$eval('.text-red-600', el => el.textContent).catch(() => null);
      results.login.status = '❌';
      results.login.details = errorText || 'Login failed';
      console.log(`   ❌ Login failed: ${errorText || 'Unknown error'}`);
    }
    
    // 2. Dashboard
    if (results.login.status === '✅') {
      console.log('\n2. Testing Dashboard...');
      const dashboardTitle = await page.title();
      const hasStats = await page.$('.grid') !== null;
      
      if (hasStats) {
        results.dashboard.status = '✅';
        results.dashboard.details = 'Dashboard loads with stats';
        console.log('   ✅ Dashboard working');
      } else {
        results.dashboard.status = '⚠️';
        results.dashboard.details = 'Dashboard loads but no stats';
        console.log('   ⚠️ Dashboard loads but missing elements');
      }
      
      // 3. Websites Page
      console.log('\n3. Testing Websites Page...');
      await page.goto('http://localhost:3000/publisher/websites');
      await new Promise(r => setTimeout(r, 2000));
      
      const websitesUrl = page.url();
      if (!websitesUrl.includes('/login')) {
        const hasWebsitesList = await page.$('table, .grid') !== null;
        const hasAddButton = await page.$('button, a[href*="claim"], a[href*="add"]') !== null;
        
        results.websites.status = hasWebsitesList ? '✅' : '⚠️';
        results.websites.details = `List: ${hasWebsitesList ? 'Yes' : 'No'}, Add button: ${hasAddButton ? 'Yes' : 'No'}`;
        console.log(`   ${hasWebsitesList ? '✅' : '⚠️'} Websites page loads`);
        console.log(`      - Has list: ${hasWebsitesList}`);
        console.log(`      - Has add button: ${hasAddButton}`);
      } else {
        results.websites.status = '❌';
        results.websites.details = 'Redirected to login';
        console.log('   ❌ Redirected to login');
      }
      
      // 4. Add Website Flow
      console.log('\n4. Testing Add Website Flow...');
      await page.goto('http://localhost:3000/publisher/websites/claim');
      await new Promise(r => setTimeout(r, 2000));
      
      const claimUrl = page.url();
      if (!claimUrl.includes('/login')) {
        const hasSearchField = await page.$('input[type="text"], input[type="search"]') !== null;
        const hasSearchButton = await page.$('button[type="submit"]') !== null;
        
        results.addWebsite.status = hasSearchField ? '✅' : '❌';
        results.addWebsite.details = `Search field: ${hasSearchField ? 'Yes' : 'No'}, Button: ${hasSearchButton ? 'Yes' : 'No'}`;
        console.log(`   ${hasSearchField ? '✅' : '❌'} Add website page loads`);
        console.log(`      - Has search field: ${hasSearchField}`);
        console.log(`      - Has search button: ${hasSearchButton}`);
        
        if (hasSearchField) {
          // Try searching for a domain
          await page.type('input[type="text"], input[type="search"]', 'testblog.com');
          if (hasSearchButton) {
            await page.click('button[type="submit"]');
            await new Promise(r => setTimeout(r, 2000));
            console.log('      - Search submitted');
          }
        }
      } else {
        results.addWebsite.status = '❌';
        results.addWebsite.details = 'Redirected to login';
        console.log('   ❌ Redirected to login');
      }
      
      // 5. Offerings Page
      console.log('\n5. Testing Offerings Page...');
      await page.goto('http://localhost:3000/publisher/offerings');
      await new Promise(r => setTimeout(r, 2000));
      
      const offeringsUrl = page.url();
      if (!offeringsUrl.includes('/login')) {
        // Check for error or content
        const hasError = await page.$('.text-red-600, pre') !== null;
        const hasContent = await page.$('table, .grid, main') !== null;
        
        if (hasError) {
          const errorText = await page.$eval('pre', el => el.textContent).catch(() => 'Unknown error');
          results.offerings.status = '❌';
          results.offerings.details = errorText.substring(0, 100);
          console.log('   ❌ Offerings page error:', errorText.substring(0, 100));
        } else if (hasContent) {
          results.offerings.status = '✅';
          results.offerings.details = 'Page loads successfully';
          console.log('   ✅ Offerings page working');
        } else {
          results.offerings.status = '⚠️';
          results.offerings.details = 'Page loads but empty';
          console.log('   ⚠️ Offerings page empty');
        }
      } else {
        results.offerings.status = '❌';
        results.offerings.details = 'Redirected to login';
        console.log('   ❌ Redirected to login');
      }
      
      // 6. Pricing Rules (if offerings work)
      if (results.offerings.status === '✅') {
        console.log('\n6. Testing Pricing Rules...');
        const hasNewButton = await page.$('a[href*="new"], button:has-text("Add")') !== null;
        
        if (hasNewButton) {
          await page.goto('http://localhost:3000/publisher/offerings/new');
          await new Promise(r => setTimeout(r, 2000));
          
          const hasPricingBuilder = await page.$('form, .pricing-builder') !== null;
          results.pricingRules.status = hasPricingBuilder ? '✅' : '❌';
          results.pricingRules.details = hasPricingBuilder ? 'Pricing builder available' : 'No pricing builder found';
          console.log(`   ${hasPricingBuilder ? '✅' : '❌'} Pricing rules builder`);
        } else {
          results.pricingRules.status = '⚠️';
          results.pricingRules.details = 'No add button found';
          console.log('   ⚠️ No add offering button found');
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
  } finally {
    console.log('\n\n=== SUMMARY ===');
    console.log('Login:', results.login.status, '-', results.login.details);
    console.log('Dashboard:', results.dashboard.status, '-', results.dashboard.details);
    console.log('Websites:', results.websites.status, '-', results.websites.details);
    console.log('Add Website:', results.addWebsite.status, '-', results.addWebsite.details);
    console.log('Offerings:', results.offerings.status, '-', results.offerings.details);
    console.log('Pricing Rules:', results.pricingRules.status, '-', results.pricingRules.details);
    
    console.log('\n\nPress Ctrl+C to close the browser...');
    // Keep browser open for manual inspection
    await new Promise(() => {});
  }
}

testPublisherFullFlow();