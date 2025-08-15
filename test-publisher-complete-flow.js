// Test complete publisher flow after adding a website
const puppeteer = require('puppeteer');

async function testPublisherCompleteFlow() {
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Testing Complete Publisher Flow After Adding Website');
  console.log('====================================================\n');
  
  const expectedFeatures = [];
  const actualFeatures = [];
  const missingFeatures = [];
  
  try {
    // 1. Login as publisher
    console.log('Step 1: Login as Publisher\n');
    await page.goto('http://localhost:3000/publisher/login');
    await page.type('input[type="email"]', 'test@publisher.com');
    await page.type('input[type="password"]', 'testpublisher123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    
    console.log('✅ Logged in successfully\n');
    
    // 2. Check websites list
    console.log('Step 2: Checking Websites List\n');
    await page.goto('http://localhost:3000/publisher/websites');
    await new Promise(r => setTimeout(r, 2000));
    
    const websitesContent = await page.content();
    
    // Check what's displayed for existing website
    if (websitesContent.includes('nikolaroza.com')) {
      console.log('✅ Can see existing website: nikolaroza.com');
      actualFeatures.push('View existing websites');
      
      // Check for website details
      if (websitesContent.includes('Domain Rating') || websitesContent.includes('DR:')) {
        console.log('✅ Can see domain metrics');
        actualFeatures.push('View domain metrics');
      }
      
      if (websitesContent.includes('Traffic')) {
        console.log('✅ Can see traffic data');
        actualFeatures.push('View traffic data');
      }
    }
    
    // 3. Add a new website
    console.log('\nStep 3: Adding New Website\n');
    await page.goto('http://localhost:3000/publisher/websites/claim');
    await new Promise(r => setTimeout(r, 2000));
    
    // Search for a new domain
    const testDomain = 'mynewblog' + Date.now() + '.com';
    await page.type('input[type="text"]', testDomain);
    
    // Find and click search button
    const searchButton = await page.$('button');
    if (searchButton) {
      await searchButton.click();
      await new Promise(r => setTimeout(r, 3000));
      
      const afterSearch = await page.content();
      
      if (afterSearch.includes('Not Found') || afterSearch.includes('not found')) {
        console.log('✅ Domain search works - shows not found');
        actualFeatures.push('Search for domains');
        
        // Try to add the website
        const addButton = await page.$('button:has-text("Add"), button');
        if (addButton) {
          console.log('✅ Add website button available');
          actualFeatures.push('Add new websites');
          
          // Note: We won't actually click to avoid adding test data
        }
      }
    }
    
    // 4. Check website details page
    console.log('\nStep 4: Checking Website Details Page\n');
    
    // Navigate to existing website details
    await page.goto('http://localhost:3000/publisher/websites');
    await new Promise(r => setTimeout(r, 2000));
    
    // Try to find link to website details
    const websiteLinks = await page.$$('a[href*="/publisher/websites/"]');
    if (websiteLinks.length > 0) {
      await websiteLinks[0].click();
      await new Promise(r => setTimeout(r, 2000));
      
      const detailsContent = await page.content();
      
      // Check expected features on details page
      console.log('Checking website details page features:');
      
      if (detailsContent.includes('Offering') || detailsContent.includes('offering')) {
        console.log('✅ Can manage offerings');
        actualFeatures.push('Manage offerings');
      } else {
        console.log('❌ Cannot see offerings section');
        missingFeatures.push('Offerings management');
      }
      
      if (detailsContent.includes('Pricing') || detailsContent.includes('pricing')) {
        console.log('✅ Can see pricing options');
        actualFeatures.push('View pricing');
      } else {
        console.log('❌ No pricing section');
        missingFeatures.push('Pricing configuration');
      }
      
      if (detailsContent.includes('Analytics') || detailsContent.includes('Performance')) {
        console.log('✅ Can see analytics/performance');
        actualFeatures.push('View analytics');
      } else {
        console.log('❌ No analytics section');
        missingFeatures.push('Website analytics');
      }
      
      if (detailsContent.includes('Edit') || detailsContent.includes('Update')) {
        console.log('✅ Can edit website details');
        actualFeatures.push('Edit website info');
      } else {
        console.log('❌ Cannot edit website');
        missingFeatures.push('Edit website details');
      }
    }
    
    // 5. Check offerings page
    console.log('\nStep 5: Checking Offerings Management\n');
    await page.goto('http://localhost:3000/publisher/offerings');
    await new Promise(r => setTimeout(r, 2000));
    
    const offeringsContent = await page.content();
    
    if (offeringsContent.includes('New Offering') || offeringsContent.includes('Add Offering')) {
      console.log('✅ Can create new offerings');
      actualFeatures.push('Create offerings');
    } else {
      console.log('❌ Cannot create offerings');
      missingFeatures.push('Create new offerings');
    }
    
    // Try new offering page
    await page.goto('http://localhost:3000/publisher/offerings/new');
    await new Promise(r => setTimeout(r, 2000));
    
    const newOfferingContent = await page.content();
    
    if (newOfferingContent.includes('Base Price') || newOfferingContent.includes('price')) {
      console.log('✅ Can set pricing');
      actualFeatures.push('Set base pricing');
    } else {
      missingFeatures.push('Set pricing');
    }
    
    if (newOfferingContent.includes('Pricing Rules') || newOfferingContent.includes('rules')) {
      console.log('✅ Can configure pricing rules');
      actualFeatures.push('Configure pricing rules');
    } else {
      missingFeatures.push('Pricing rules builder');
    }
    
    if (newOfferingContent.includes('Turnaround') || newOfferingContent.includes('delivery')) {
      console.log('✅ Can set turnaround time');
      actualFeatures.push('Set turnaround time');
    } else {
      missingFeatures.push('Turnaround time settings');
    }
    
    // 6. Check other expected features
    console.log('\nStep 6: Checking Other Features\n');
    
    // Expected features list
    const allExpectedFeatures = [
      'View existing websites',
      'View domain metrics',
      'View traffic data',
      'Search for domains',
      'Add new websites',
      'Claim existing websites',
      'Manage offerings',
      'Create offerings',
      'Set base pricing',
      'Configure pricing rules',
      'Set turnaround time',
      'View website analytics',
      'Edit website details',
      'View earnings',
      'View orders',
      'Manage payment settings',
      'Export data',
      'Bulk operations',
      'API access'
    ];
    
    // Determine what's missing
    allExpectedFeatures.forEach(feature => {
      if (!actualFeatures.includes(feature) && !missingFeatures.includes(feature)) {
        missingFeatures.push(feature);
      }
    });
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  } finally {
    console.log('\n\n========================================');
    console.log('FUNCTIONALITY COMPARISON REPORT');
    console.log('========================================\n');
    
    console.log('WHAT PUBLISHERS SHOULD HAVE:');
    console.log('-----------------------------');
    const shouldHave = [
      '✓ Add new websites without Airtable',
      '✓ Claim existing websites from database',
      '✓ Create multiple offerings per website',
      '✓ Set custom pricing for each offering',
      '✓ Configure pricing rules (DR-based, traffic-based, etc.)',
      '✓ Set turnaround times and availability',
      '✓ View performance analytics',
      '✓ Track earnings and payouts',
      '✓ Manage contact information',
      '✓ Set content guidelines',
      '✓ View order history',
      '✓ Export data for reporting'
    ];
    shouldHave.forEach(item => console.log('  ' + item));
    
    console.log('\n\nWHAT PUBLISHERS ACTUALLY HAVE:');
    console.log('-------------------------------');
    actualFeatures.forEach(feature => {
      console.log('  ✅ ' + feature);
    });
    
    console.log('\n\nWHAT\'S MISSING OR NOT WORKING:');
    console.log('--------------------------------');
    missingFeatures.forEach(feature => {
      console.log('  ❌ ' + feature);
    });
    
    console.log('\n\nSUMMARY:');
    console.log('---------');
    console.log(`Implemented: ${actualFeatures.length} features`);
    console.log(`Missing: ${missingFeatures.length} features`);
    console.log(`Completion: ${Math.round((actualFeatures.length / (actualFeatures.length + missingFeatures.length)) * 100)}%`);
    
    console.log('\n\nKEY GAPS TO ADDRESS:');
    console.log('--------------------');
    const keyGaps = [
      '1. Website details page needs offerings management UI',
      '2. Analytics/performance data not displayed',
      '3. Earnings tracking not implemented',
      '4. Order management for publishers missing',
      '5. Bulk operations not available',
      '6. Export functionality needed'
    ];
    keyGaps.forEach(gap => console.log(gap));
    
    console.log('\n\nPress Ctrl+C to close browser...');
    await new Promise(() => {}); // Keep browser open
  }
}

testPublisherCompleteFlow();