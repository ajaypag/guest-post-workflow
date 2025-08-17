const { chromium } = require('playwright');

async function testPublisherEndpoints() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== TESTING PUBLISHER ENDPOINTS AFTER SCHEMA FIX ===\n');
  
  // Login as publisher
  console.log('1. Logging in as publisher...');
  await page.goto('http://localhost:3001/publisher/login');
  await page.fill('input[type="email"]', 'testpublisher@example.com');
  await page.fill('input[type="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  // Test dashboard stats endpoint
  console.log('2. Testing dashboard stats endpoint...');
  const statsResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/publisher/dashboard/stats');
      const data = await res.json();
      return { status: res.status, data };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('   Stats response:', statsResponse.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
  if (statsResponse.error) console.log('   Error:', statsResponse.error);
  
  // Test orders endpoint
  console.log('3. Testing orders endpoint...');
  const ordersResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/publisher/orders');
      const data = await res.json();
      return { status: res.status, data };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('   Orders response:', ordersResponse.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
  if (ordersResponse.error) console.log('   Error:', ordersResponse.error);
  
  // Test websites endpoint
  console.log('4. Testing websites endpoint...');
  const websitesResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/publisher/websites');
      const data = await res.json();
      return { status: res.status, data };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('   Websites response:', websitesResponse.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
  if (websitesResponse.error) console.log('   Error:', websitesResponse.error);
  
  // Navigate to websites page to test UI
  console.log('5. Testing websites page UI...');
  await page.goto('http://localhost:3001/publisher/websites');
  await page.waitForTimeout(2000);
  const hasTable = await page.isVisible('table');
  console.log('   Websites table visible:', hasTable ? '✅ YES' : '❌ NO');
  
  console.log('\n=== SUMMARY ===');
  const allPassed = 
    statsResponse.status === 200 && 
    ordersResponse.status === 200 && 
    websitesResponse.status === 200 &&
    hasTable;
  
  console.log(allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
  
  await browser.close();
}

testPublisherEndpoints().catch(console.error);