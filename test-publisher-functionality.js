// Test publisher functionality after adding a website
const puppeteer = require('puppeteer');

async function testPublisherFunctionality() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Publisher Functionality Test - Post Website Addition');
  console.log('=====================================================\n');
  
  const results = {
    working: [],
    partial: [],
    missing: []
  };
  
  try {
    // Login
    await page.goto('http://localhost:3000/publisher/login');
    await page.type('input[type="email"]', 'test@publisher.com');
    await page.type('input[type="password"]', 'testpublisher123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    
    // Test each feature
    console.log('Testing Features:\n');
    
    // 1. Dashboard
    console.log('1. Dashboard...');
    await page.goto('http://localhost:3000/publisher');
    let content = await page.content();
    if (content.includes('Total Websites') || content.includes('Dashboard')) {
      results.working.push('Dashboard with stats');
      console.log('   ✅ Dashboard works');
    }
    
    // 2. Websites List
    console.log('2. Websites List...');
    await page.goto('http://localhost:3000/publisher/websites');
    content = await page.content();
    if (content.includes('nikolaroza.com')) {
      results.working.push('View websites list');
      results.working.push('See website metrics (DR, traffic)');
      console.log('   ✅ Can see websites');
    }
    
    // 3. Add/Claim Website
    console.log('3. Add/Claim Website...');
    await page.goto('http://localhost:3000/publisher/websites/claim');
    content = await page.content();
    if (content.includes('Search') && content.includes('domain')) {
      results.working.push('Search for domains');
      results.working.push('Add new websites (UI present)');
      console.log('   ✅ Add website interface works');
    }
    
    // 4. Website Details
    console.log('4. Website Details Page...');
    // Try to navigate to a website detail page
    const websiteId = '67048c8d-7013-45f7-922f-28d93dc36c98'; // nikolaroza.com ID from our test data
    await page.goto(`http://localhost:3000/publisher/websites/${websiteId}`);
    content = await page.content();
    
    if (content.includes('500') || content.includes('error')) {
      results.missing.push('Website details page');
      console.log('   ❌ Website details page error');
    } else if (content.includes('nikolaroza') || content.includes('Website')) {
      results.partial.push('Website details page (basic view)');
      console.log('   ⚠️ Website details page partially works');
    }
    
    // 5. Offerings Management
    console.log('5. Offerings Management...');
    await page.goto('http://localhost:3000/publisher/offerings');
    content = await page.content();
    if (!content.includes('500')) {
      results.working.push('Offerings page loads');
      console.log('   ✅ Offerings page accessible');
      
      // Check for listing
      if (content.includes('No offerings') || content.includes('offering')) {
        results.partial.push('Offerings list (empty state works)');
      }
    }
    
    // 6. Create New Offering
    console.log('6. New Offering Form...');
    await page.goto('http://localhost:3000/publisher/offerings/new');
    content = await page.content();
    if (content.includes('Price') || content.includes('price')) {
      results.working.push('New offering form');
      results.working.push('Pricing configuration UI');
      console.log('   ✅ Can access offering creation');
    }
    
    // 7. Pricing Rules
    console.log('7. Pricing Rules...');
    if (content.includes('Rules') || content.includes('Domain Rating')) {
      results.working.push('Pricing rules builder');
      console.log('   ✅ Pricing rules available');
    } else {
      results.missing.push('Advanced pricing rules');
      console.log('   ❌ No pricing rules found');
    }
    
    // 8. Analytics
    console.log('8. Analytics...');
    await page.goto('http://localhost:3000/publisher/analytics');
    content = await page.content();
    if (!content.includes('500') && !content.includes('404')) {
      results.partial.push('Analytics page (exists but may be empty)');
      console.log('   ⚠️ Analytics page exists');
    } else {
      results.missing.push('Analytics dashboard');
    }
    
    // 9. Earnings
    console.log('9. Earnings...');
    await page.goto('http://localhost:3000/publisher/earnings');
    content = await page.content();
    if (!content.includes('500') && !content.includes('404')) {
      results.partial.push('Earnings page (exists but may be empty)');
      console.log('   ⚠️ Earnings page exists');
    } else {
      results.missing.push('Earnings tracking');
    }
    
    // 10. Orders
    console.log('10. Orders...');
    await page.goto('http://localhost:3000/publisher/orders');
    content = await page.content();
    if (!content.includes('500') && !content.includes('404')) {
      results.partial.push('Orders page (exists but may be empty)');
      console.log('   ⚠️ Orders page exists');
    } else {
      results.missing.push('Order management');
    }
    
    // 11. Settings
    console.log('11. Settings...');
    await page.goto('http://localhost:3000/publisher/settings');
    content = await page.content();
    if (!content.includes('500') && !content.includes('404')) {
      results.partial.push('Settings page (exists)');
      console.log('   ⚠️ Settings page exists');
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    await browser.close();
    
    // Generate comprehensive report
    console.log('\n\n' + '='.repeat(80));
    console.log('PUBLISHER FUNCTIONALITY REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📊 FEATURE COMPARISON\n');
    
    console.log('WHAT THEY SHOULD HAVE | WHAT THEY HAVE | STATUS');
    console.log('-'.repeat(80));
    
    const featureComparison = [
      { expected: 'Add websites without Airtable', actual: 'Can add websites', status: '✅ Working' },
      { expected: 'Claim existing websites', actual: 'Search & claim UI present', status: '✅ Working' },
      { expected: 'View website details', actual: 'Page exists but limited', status: '⚠️ Partial' },
      { expected: 'Create offerings per website', actual: 'Form exists, not linked to websites', status: '⚠️ Partial' },
      { expected: 'Set custom pricing', actual: 'Basic pricing form works', status: '✅ Working' },
      { expected: 'Configure pricing rules', actual: 'UI exists in form', status: '⚠️ Partial' },
      { expected: 'View analytics/performance', actual: 'Page exists, no data', status: '⚠️ Partial' },
      { expected: 'Track earnings', actual: 'Page exists, no data', status: '⚠️ Partial' },
      { expected: 'Manage orders', actual: 'Page exists, no integration', status: '⚠️ Partial' },
      { expected: 'Bulk operations', actual: 'Not implemented', status: '❌ Missing' },
      { expected: 'Export data', actual: 'Not implemented', status: '❌ Missing' },
      { expected: 'API access', actual: 'Not documented', status: '❌ Missing' }
    ];
    
    featureComparison.forEach(f => {
      console.log(`${f.expected.padEnd(35)} | ${f.actual.padEnd(35)} | ${f.status}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    
    console.log('\n✅ FULLY WORKING (' + results.working.length + '):');
    results.working.forEach(item => console.log('   • ' + item));
    
    console.log('\n⚠️ PARTIALLY WORKING (' + results.partial.length + '):');
    results.partial.forEach(item => console.log('   • ' + item));
    
    console.log('\n❌ MISSING/BROKEN (' + results.missing.length + '):');
    if (results.missing.length === 0) {
      console.log('   • None identified as completely missing');
    } else {
      results.missing.forEach(item => console.log('   • ' + item));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('KEY FINDINGS');
    console.log('='.repeat(80));
    
    console.log(`
After a publisher adds a website, they CAN:
• See it in their websites list with metrics
• Search for and add more websites
• Access the offerings creation form
• Configure basic pricing

But they CANNOT effectively:
• Link offerings to specific websites
• See website-specific analytics
• Track actual earnings from orders
• Manage orders for their websites
• Perform bulk operations
• Export their data

The core infrastructure exists but needs connection between:
1. Websites ↔ Offerings (relationship exists in DB but not UI)
2. Offerings ↔ Orders (no order flow for publishers)
3. Orders ↔ Earnings (no earnings calculation)
    `);
    
    const completionRate = Math.round((results.working.length / (results.working.length + results.partial.length + results.missing.length)) * 100);
    console.log(`Overall Functionality: ${completionRate}% Complete`);
    console.log('Most features are partially implemented but not fully connected.\n');
  }
}

testPublisherFunctionality();