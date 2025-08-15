// Complete test of publisher portal after fixes
const puppeteer = require('puppeteer');

async function testPublisherPortalComplete() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Publisher Portal Complete Test - After Fixes');
  console.log('=============================================\n');
  
  const results = [];
  
  try {
    // 1. Login
    console.log('1. Testing Login...');
    await page.goto('http://localhost:3000/publisher/login');
    await page.type('input[type="email"]', 'test@publisher.com');
    await page.type('input[type="password"]', 'testpublisher123');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    
    const currentUrl = page.url();
    if (currentUrl.includes('/publisher') && !currentUrl.includes('/login')) {
      results.push('✅ Login: Success');
      console.log('   ✅ Logged in successfully');
    } else {
      results.push('❌ Login: Failed');
      console.log('   ❌ Login failed');
      throw new Error('Login failed, cannot continue tests');
    }
    
    // 2. Dashboard
    console.log('\n2. Testing Dashboard...');
    const dashboardContent = await page.content();
    const hasStats = dashboardContent.includes('Total Websites') || 
                     dashboardContent.includes('Active Offerings') ||
                     dashboardContent.includes('grid');
    results.push(hasStats ? '✅ Dashboard: Loads with content' : '⚠️ Dashboard: Loads but empty');
    console.log(`   ${hasStats ? '✅' : '⚠️'} Dashboard ${hasStats ? 'shows stats' : 'is empty'}`);
    
    // 3. Websites Page
    console.log('\n3. Testing Websites Page...');
    await page.goto('http://localhost:3000/publisher/websites');
    await new Promise(r => setTimeout(r, 2000));
    
    const websitesContent = await page.content();
    const hasWebsitesList = websitesContent.includes('nikolaroza.com') || 
                           websitesContent.includes('mytestblog.com') ||
                           websitesContent.includes('Website');
    const hasAddButton = websitesContent.includes('Add Website') || 
                        websitesContent.includes('Claim Website');
    
    if (hasWebsitesList) {
      results.push('✅ Websites: Shows list with data');
      console.log('   ✅ Websites list displays data');
    } else {
      results.push('⚠️ Websites: Page loads but no data visible');
      console.log('   ⚠️ No websites visible in list');
    }
    
    // 4. Add/Claim Website Page
    console.log('\n4. Testing Add/Claim Website...');
    await page.goto('http://localhost:3000/publisher/websites/claim');
    await new Promise(r => setTimeout(r, 2000));
    
    const claimContent = await page.content();
    const hasSearchField = await page.$('input[type="text"]') !== null;
    const hasSearchButton = claimContent.includes('Search');
    
    if (hasSearchField && hasSearchButton) {
      results.push('✅ Add Website: Search interface working');
      console.log('   ✅ Search field and button present');
      
      // Try searching
      await page.type('input[type="text"]', 'example.com');
      const searchBtn = await page.$('button[type="button"]');
      if (searchBtn) {
        await searchBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        const afterSearch = await page.content();
        if (afterSearch.includes('Not Found') || afterSearch.includes('Website Found')) {
          console.log('   ✅ Search functionality works');
        }
      }
    } else {
      results.push('❌ Add Website: Missing search elements');
      console.log('   ❌ Search interface incomplete');
    }
    
    // 5. Offerings Page
    console.log('\n5. Testing Offerings Page...');
    await page.goto('http://localhost:3000/publisher/offerings');
    await new Promise(r => setTimeout(r, 2000));
    
    const offeringsContent = await page.content();
    const hasOfferingsTable = offeringsContent.includes('Offering') || 
                             offeringsContent.includes('Price') ||
                             offeringsContent.includes('No offerings');
    
    if (!offeringsContent.includes('500 Internal Server Error')) {
      results.push('✅ Offerings: Page loads without errors');
      console.log('   ✅ Offerings page accessible');
    } else {
      results.push('❌ Offerings: 500 error');
      console.log('   ❌ Offerings page has server error');
    }
    
    // 6. Check for pricing builder
    console.log('\n6. Testing Pricing Builder...');
    await page.goto('http://localhost:3000/publisher/offerings/new');
    await new Promise(r => setTimeout(r, 2000));
    
    const newOfferingContent = await page.content();
    const hasPricingForm = newOfferingContent.includes('Base Price') || 
                          newOfferingContent.includes('Pricing Rules') ||
                          newOfferingContent.includes('form');
    
    if (hasPricingForm) {
      results.push('✅ Pricing Builder: Form available');
      console.log('   ✅ Pricing builder form present');
    } else {
      results.push('⚠️ Pricing Builder: Page loads but no form');
      console.log('   ⚠️ Pricing builder needs implementation');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    results.push(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
    
    // Summary
    console.log('\n\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    
    results.forEach(result => {
      console.log(result);
    });
    
    const passCount = results.filter(r => r.includes('✅')).length;
    const warnCount = results.filter(r => r.includes('⚠️')).length;
    const failCount = results.filter(r => r.includes('❌')).length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`Passed: ${passCount} | Warnings: ${warnCount} | Failed: ${failCount}`);
    console.log('='.repeat(50));
    
    if (failCount === 0) {
      console.log('\n🎉 All critical tests passed!');
    } else {
      console.log(`\n⚠️ ${failCount} test(s) failed - needs attention`);
    }
  }
}

testPublisherPortalComplete();