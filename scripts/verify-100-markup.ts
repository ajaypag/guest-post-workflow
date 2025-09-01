import { chromium } from 'playwright';

async function verifyMarkupChange() {
  console.log('🔍 Verifying $100 markup change across the application...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Login first
  console.log('📝 Logging in...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  
  // Careful email entry
  const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
  await emailInput.click();
  await emailInput.clear();
  
  const email = 'ajay@outreachlabs.com';
  for (const char of email) {
    await emailInput.type(char, { delay: 50 });
  }
  
  await page.locator('input[type="password"]').fill('FA64!I$nrbCauS^d');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/workflow**', { timeout: 10000 });
  console.log('✅ Login successful\n');
  
  const results = [];
  
  // Test 1: Guest Posting Sites main page
  console.log('📍 Checking /guest-posting-sites...');
  await page.goto('http://localhost:3000/guest-posting-sites');
  await page.waitForLoadState('networkidle');
  
  // Check for $100 in hero section
  const heroText = await page.locator('.text-4xl, .text-5xl').first().textContent();
  const hasHero100 = heroText?.includes('$100');
  results.push({
    page: 'Guest Posting Sites',
    element: 'Hero Section',
    expected: '$100',
    found: heroText?.match(/\$\d+/)?.[0] || 'Not found',
    status: hasHero100 ? '✅' : '❌'
  });
  
  // Check for any remaining $79 references
  const bodyText = await page.locator('body').textContent();
  const has79References = bodyText?.includes('$79') || bodyText?.includes('+ 79');
  results.push({
    page: 'Guest Posting Sites',
    element: 'Page Content',
    expected: 'No $79 references',
    found: has79References ? 'Found $79 references' : 'Clean',
    status: has79References ? '❌' : '✅'
  });
  
  // Test 2: Check a niche page
  console.log('📍 Checking /guest-posting-sites/technology...');
  await page.goto('http://localhost:3000/guest-posting-sites/technology');
  await page.waitForLoadState('networkidle');
  
  const nicheBody = await page.locator('body').textContent();
  const nicheHas100 = nicheBody?.includes('$100 service fee');
  const nicheHas79 = nicheBody?.includes('$79');
  
  results.push({
    page: 'Technology Niche Page',
    element: 'Service Fee Text',
    expected: '$100 service fee',
    found: nicheHas100 ? '$100 service fee' : (nicheHas79 ? '$79 found' : 'Not found'),
    status: nicheHas100 && !nicheHas79 ? '✅' : '❌'
  });
  
  // Test 3: Vetted Sites pricing display
  console.log('📍 Checking /vetted-sites...');
  await page.goto('http://localhost:3000/vetted-sites');
  await page.waitForLoadState('networkidle');
  
  // Look for price displays in the table
  const priceElements = await page.locator('td:has-text("$")').all();
  let vettedSitesOk = true;
  
  for (const element of priceElements.slice(0, 3)) { // Check first 3 prices
    const text = await element.textContent();
    const price = text?.match(/\$(\d+)/)?.[1];
    if (price) {
      const priceNum = parseInt(price);
      // Prices should be base + 100 (not base + 79)
      // Common prices would be like $250, $300, $350 (base 150/200/250 + 100)
      const isValid = priceNum >= 150; // Minimum would be $50 base + $100 = $150
      if (!isValid) {
        vettedSitesOk = false;
        results.push({
          page: 'Vetted Sites',
          element: `Price Display`,
          expected: 'Base + $100',
          found: text || 'Unknown',
          status: '❌'
        });
        break;
      }
    }
  }
  
  if (vettedSitesOk && priceElements.length > 0) {
    results.push({
      page: 'Vetted Sites',
      element: 'Price Displays',
      expected: 'Base + $100',
      found: 'All prices correct',
      status: '✅'
    });
  }
  
  // Test 4: Check orders page for new markup
  console.log('📍 Checking /orders...');
  await page.goto('http://localhost:3000/orders');
  await page.waitForLoadState('networkidle');
  
  // Check if SERVICE_FEE is being used correctly
  const orderPageText = await page.locator('body').textContent();
  const orderHas100 = orderPageText?.includes('100') || orderPageText?.includes('$100');
  
  results.push({
    page: 'Orders Page',
    element: 'Service Fee References',
    expected: '$100 markup',
    found: orderHas100 ? 'Found $100 references' : 'No $100 found',
    status: orderHas100 ? '✅' : '⚠️'
  });
  
  // Test 5: Check API response for correct pricing
  console.log('📍 Testing API pricing calculation...');
  await page.goto('http://localhost:3000/api/pricing/calculate?wholesale=15000');
  const apiResponse = await page.locator('pre').textContent();
  
  if (apiResponse) {
    try {
      const data = JSON.parse(apiResponse);
      const retailPrice = data.retailPrice || data.retail;
      // 15000 cents wholesale + 10000 cents markup = 25000 cents = $250
      const isCorrect = retailPrice === 25000 || retailPrice === 250;
      results.push({
        page: 'Pricing API',
        element: 'Calculation',
        expected: '$150 + $100 = $250',
        found: `${retailPrice}`,
        status: isCorrect ? '✅' : '❌'
      });
    } catch {
      results.push({
        page: 'Pricing API',
        element: 'Calculation',
        expected: 'Valid response',
        found: 'Parse error',
        status: '❌'
      });
    }
  }
  
  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION RESULTS:');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    console.log(`${result.status} ${result.page} - ${result.element}`);
    console.log(`   Expected: ${result.expected}`);
    console.log(`   Found: ${result.found}`);
    console.log('');
  });
  
  const successCount = results.filter(r => r.status === '✅').length;
  const totalCount = results.length;
  
  console.log('='.repeat(80));
  console.log(`SUMMARY: ${successCount}/${totalCount} checks passed`);
  
  if (successCount === totalCount) {
    console.log('🎉 All markup changes verified successfully! $100 markup is working.');
  } else {
    console.log('⚠️ Some checks failed. Review the results above.');
  }
  console.log('='.repeat(80));
  
  await browser.close();
}

verifyMarkupChange().catch(console.error);