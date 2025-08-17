const { chromium } = require('playwright');

async function testBasicFlow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== BASIC PUBLISHER FLOW TEST ===\n');
  
  const results = [];
  
  // Test 1: Can load login page
  console.log('1. Loading login page...');
  try {
    await page.goto('http://localhost:3001/publisher/login', { timeout: 10000 });
    console.log('   ✅ Login page loaded');
    results.push({ test: 'Load Login', status: 'PASS' });
  } catch (e) {
    console.log('   ❌ Login page failed to load');
    results.push({ test: 'Load Login', status: 'FAIL', error: e.message });
  }
  
  // Test 2: Can login
  console.log('\n2. Testing login...');
  try {
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    console.log(`   Current URL: ${url}`);
    
    if (url.includes('dashboard')) {
      console.log('   ✅ Login successful - redirected to dashboard');
      results.push({ test: 'Login', status: 'PASS' });
    } else {
      console.log('   ⚠️ Login completed but stayed on:', url);
      results.push({ test: 'Login', status: 'PARTIAL', note: 'No redirect to dashboard' });
    }
  } catch (e) {
    console.log('   ❌ Login failed:', e.message);
    results.push({ test: 'Login', status: 'FAIL', error: e.message });
  }
  
  // Test 3: Can access websites page
  console.log('\n3. Testing websites page...');
  try {
    await page.goto('http://localhost:3001/publisher/websites', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const hasTable = await page.isVisible('table');
    const hasAddButton = await page.isVisible('text=/add.*website/i');
    
    console.log(`   Table visible: ${hasTable ? '✅' : '❌'}`);
    console.log(`   Add button visible: ${hasAddButton ? '✅' : '❌'}`);
    
    if (hasTable) {
      results.push({ test: 'Websites Page', status: 'PASS' });
    } else {
      results.push({ test: 'Websites Page', status: 'FAIL', error: 'No table found' });
    }
  } catch (e) {
    console.log('   ❌ Websites page failed:', e.message);
    results.push({ test: 'Websites Page', status: 'FAIL', error: e.message });
  }
  
  // Test 4: Can add website
  console.log('\n4. Testing add website...');
  try {
    await page.goto('http://localhost:3001/publisher/websites/new', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const hasForm = await page.isVisible('form');
    const hasDomainField = await page.isVisible('input[name="domain"]');
    
    console.log(`   Form visible: ${hasForm ? '✅' : '❌'}`);
    console.log(`   Domain field visible: ${hasDomainField ? '✅' : '❌'}`);
    
    if (hasForm && hasDomainField) {
      // Try to add a website
      const testDomain = `test${Date.now()}.com`;
      await page.fill('input[name="domain"]', testDomain);
      await page.fill('input[name="name"]', 'Test Site');
      
      // Try to select category if it exists
      const hasCategory = await page.isVisible('select[name="category"]');
      if (hasCategory) {
        await page.selectOption('select[name="category"]', { index: 1 });
      }
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      const url = page.url();
      if (!url.includes('/new')) {
        console.log('   ✅ Website added successfully');
        results.push({ test: 'Add Website', status: 'PASS' });
      } else {
        console.log('   ⚠️ Form submitted but stayed on same page');
        results.push({ test: 'Add Website', status: 'PARTIAL', note: 'No redirect after submit' });
      }
    } else {
      results.push({ test: 'Add Website', status: 'FAIL', error: 'Form not found' });
    }
  } catch (e) {
    console.log('   ❌ Add website failed:', e.message);
    results.push({ test: 'Add Website', status: 'FAIL', error: e.message });
  }
  
  // Test 5: Check API endpoints
  console.log('\n5. Testing API endpoints...');
  
  // Dashboard stats
  try {
    const statsResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/dashboard/stats');
      return { status: res.status, ok: res.ok };
    });
    
    console.log(`   Dashboard stats API: ${statsResponse.ok ? '✅' : '❌'} (${statsResponse.status})`);
    results.push({ 
      test: 'Dashboard API', 
      status: statsResponse.ok ? 'PASS' : 'FAIL',
      code: statsResponse.status 
    });
  } catch (e) {
    console.log('   ❌ Dashboard API error:', e.message);
    results.push({ test: 'Dashboard API', status: 'FAIL', error: e.message });
  }
  
  // Orders API
  try {
    const ordersResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/orders');
      return { status: res.status, ok: res.ok };
    });
    
    console.log(`   Orders API: ${ordersResponse.ok ? '✅' : '❌'} (${ordersResponse.status})`);
    results.push({ 
      test: 'Orders API', 
      status: ordersResponse.ok ? 'PASS' : 'FAIL',
      code: ordersResponse.status 
    });
  } catch (e) {
    console.log('   ❌ Orders API error:', e.message);
    results.push({ test: 'Orders API', status: 'FAIL', error: e.message });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const partial = results.filter(r => r.status === 'PARTIAL').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Partial: ${partial}`);
  
  console.log('\nDetails:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${r.test}: ${r.status} ${r.error ? `- ${r.error}` : ''} ${r.note ? `- ${r.note}` : ''}`);
  });
  
  await browser.close();
}

testBasicFlow().catch(console.error);