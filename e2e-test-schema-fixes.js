const { chromium } = require('playwright');

async function runE2ETests() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  console.log('=== E2E TESTING AFTER SCHEMA CONSOLIDATION ===\n');
  console.log('Testing all critical paths that could break in production...\n');
  
  const results = {
    passed: [],
    failed: [],
    errors: []
  };

  // =================================================================
  // TEST 1: Publisher Login Flow
  // =================================================================
  console.log('TEST 1: Publisher Login Flow');
  try {
    const page = await context.newPage();
    await page.goto('http://localhost:3001/publisher/login');
    
    // Check login page loads
    const loginTitle = await page.isVisible('text="Publisher Portal"');
    if (!loginTitle) throw new Error('Login page not loading');
    
    // Attempt login
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL('**/publisher/dashboard', { timeout: 5000 });
    
    console.log('  ✅ Publisher login successful');
    results.passed.push('Publisher Login');
    await page.close();
  } catch (error) {
    console.log('  ❌ Publisher login failed:', error.message);
    results.failed.push('Publisher Login');
    results.errors.push({ test: 'Publisher Login', error: error.message });
  }

  // =================================================================
  // TEST 2: Publisher Dashboard Stats API
  // =================================================================
  console.log('\nTEST 2: Dashboard Stats API');
  try {
    const page = await context.newPage();
    
    // Login first
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Test stats API
    const statsResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/dashboard/stats');
      return { 
        status: res.status, 
        ok: res.ok,
        data: await res.json() 
      };
    });
    
    if (statsResponse.status !== 200) {
      throw new Error(`Stats API returned ${statsResponse.status}: ${JSON.stringify(statsResponse.data)}`);
    }
    
    console.log('  ✅ Dashboard stats API working');
    console.log(`    - Total websites: ${statsResponse.data.totalWebsites}`);
    console.log(`    - Active offerings: ${statsResponse.data.activeOfferings}`);
    results.passed.push('Dashboard Stats API');
    await page.close();
  } catch (error) {
    console.log('  ❌ Dashboard stats API failed:', error.message);
    results.failed.push('Dashboard Stats API');
    results.errors.push({ test: 'Dashboard Stats API', error: error.message });
  }

  // =================================================================
  // TEST 3: Publisher Orders View
  // =================================================================
  console.log('\nTEST 3: Publisher Orders View');
  try {
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Test orders API
    const ordersResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/orders');
      return { 
        status: res.status,
        data: await res.json() 
      };
    });
    
    if (ordersResponse.status !== 200) {
      throw new Error(`Orders API returned ${ordersResponse.status}`);
    }
    
    // Navigate to orders page
    await page.goto('http://localhost:3001/publisher/orders');
    await page.waitForTimeout(2000);
    
    // Check if orders table renders
    const hasOrdersSection = await page.isVisible('text="Orders"');
    if (!hasOrdersSection) throw new Error('Orders page not rendering');
    
    console.log('  ✅ Publisher orders working');
    console.log(`    - Orders found: ${ordersResponse.data.orders?.length || 0}`);
    results.passed.push('Publisher Orders');
    await page.close();
  } catch (error) {
    console.log('  ❌ Publisher orders failed:', error.message);
    results.failed.push('Publisher Orders');
    results.errors.push({ test: 'Publisher Orders', error: error.message });
  }

  // =================================================================
  // TEST 4: Publisher Website Management
  // =================================================================
  console.log('\nTEST 4: Publisher Website Management');
  try {
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Test websites API
    const websitesResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/websites');
      return { 
        status: res.status,
        data: await res.json() 
      };
    });
    
    if (websitesResponse.status !== 200) {
      throw new Error(`Websites API returned ${websitesResponse.status}`);
    }
    
    // Navigate to websites page
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(2000);
    
    // Check if table renders
    const hasTable = await page.isVisible('table');
    if (!hasTable) throw new Error('Websites table not rendering');
    
    console.log('  ✅ Publisher websites working');
    console.log(`    - Websites found: ${websitesResponse.data.websites?.length || 0}`);
    results.passed.push('Publisher Websites');
    await page.close();
  } catch (error) {
    console.log('  ❌ Publisher websites failed:', error.message);
    results.failed.push('Publisher Websites');
    results.errors.push({ test: 'Publisher Websites', error: error.message });
  }

  // =================================================================
  // TEST 5: Internal Publisher Available API
  // =================================================================
  console.log('\nTEST 5: Internal Publisher Available API');
  try {
    const page = await context.newPage();
    
    // Login as internal user
    await page.goto('http://localhost:3001/login');
    await page.fill('input[name="email"]', 'test@linkio.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Test available publishers API
    const availableResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publishers/available');
      return { 
        status: res.status,
        data: await res.json() 
      };
    });
    
    if (availableResponse.status !== 200) {
      throw new Error(`Available publishers API returned ${availableResponse.status}`);
    }
    
    console.log('  ✅ Internal publisher available API working');
    console.log(`    - Available publishers: ${availableResponse.data.publishers?.length || 0}`);
    results.passed.push('Internal Publisher API');
    await page.close();
  } catch (error) {
    console.log('  ❌ Internal publisher API failed:', error.message);
    results.failed.push('Internal Publisher API');
    results.errors.push({ test: 'Internal Publisher API', error: error.message });
  }

  // =================================================================
  // TEST 6: Publisher Offerings Service
  // =================================================================
  console.log('\nTEST 6: Publisher Offerings Service');
  try {
    const page = await context.newPage();
    
    // Login as internal
    await page.goto('http://localhost:3001/login');
    await page.fill('input[name="email"]', 'test@linkio.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Test offerings API
    const offeringsResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/offerings');
      return { 
        status: res.status,
        data: await res.json() 
      };
    });
    
    // It's OK if this returns 401 for internal user, just checking it doesn't crash
    if (offeringsResponse.status === 500) {
      throw new Error('Offerings API crashed with 500 error');
    }
    
    console.log('  ✅ Publisher offerings service not crashing');
    results.passed.push('Publisher Offerings Service');
    await page.close();
  } catch (error) {
    console.log('  ❌ Publisher offerings service failed:', error.message);
    results.failed.push('Publisher Offerings Service');
    results.errors.push({ test: 'Publisher Offerings Service', error: error.message });
  }

  // =================================================================
  // TEST 7: Add New Website Flow
  // =================================================================
  console.log('\nTEST 7: Add New Website Flow');
  try {
    const page = await context.newPage();
    
    // Login as publisher
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to add website page
    await page.goto('http://localhost:3001/publisher/websites/new');
    await page.waitForTimeout(2000);
    
    // Check form loads
    const hasForm = await page.isVisible('form');
    if (!hasForm) throw new Error('Add website form not loading');
    
    // Fill form with test data
    const testDomain = `test${Date.now()}.com`;
    await page.fill('input[name="domain"]', testDomain);
    await page.fill('input[name="name"]', 'Test Website');
    await page.selectOption('select[name="category"]', 'Technology');
    
    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check if redirected to websites list
    const currentUrl = page.url();
    if (!currentUrl.includes('/publisher/websites')) {
      throw new Error('Did not redirect after adding website');
    }
    
    console.log('  ✅ Add website flow working');
    console.log(`    - Test domain: ${testDomain}`);
    results.passed.push('Add Website Flow');
    await page.close();
  } catch (error) {
    console.log('  ❌ Add website flow failed:', error.message);
    results.failed.push('Add Website Flow');
    results.errors.push({ test: 'Add Website Flow', error: error.message });
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('\n' + '='.repeat(60));
  console.log('E2E TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.passed.length > 0) {
    console.log('\nPassed Tests:');
    results.passed.forEach(test => console.log(`  ✅ ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\nFailed Tests:');
    results.failed.forEach(test => console.log(`  ❌ ${test}`));
    
    console.log('\nError Details:');
    results.errors.forEach(({ test, error }) => {
      console.log(`  ${test}: ${error}`);
    });
  }
  
  const allPassed = results.failed.length === 0;
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 ALL E2E TESTS PASSED! Safe to deploy to production.');
  } else {
    console.log('⚠️  SOME TESTS FAILED! Fix issues before deploying.');
  }
  console.log('='.repeat(60));
  
  await browser.close();
  process.exit(allPassed ? 0 : 1);
}

runE2ETests().catch(console.error);