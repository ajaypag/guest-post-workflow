const { chromium } = require('playwright');

async function testPricingFix() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing Pricing Fix on Vetted Sites...\n');
    
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('   ✅ Admin login completed');
    
    // Step 2: Go to exact URL from conversation
    console.log('2️⃣ Navigating to vetted sites with filters...');
    const url = 'http://localhost:3004/vetted-sites?clientId=49edc373-dd78-49c7-9e02-6f55f23d3f57&accountId=76162e0d-27d8-4e39-8ed6-fd609e37099a&page=1';
    await page.goto(url);
    await page.waitForTimeout(5000);
    
    // Step 3: Get API data directly to check pricing
    console.log('3️⃣ Checking API pricing data...');
    const response = await page.request.get('http://localhost:3004/api/vetted-sites?clientId=49edc373-dd78-49c7-9e02-6f55f23d3f57&accountId=76162e0d-27d8-4e39-8ed6-fd609e37099a&page=1');
    const data = await response.json();
    
    if (data.domains && data.domains.length > 0) {
      console.log(`   API returned ${data.domains.length} domains`);
      
      // Check first 10 domains for pricing
      const sampleDomains = data.domains.slice(0, 10);
      console.log('\n📊 PRICING ANALYSIS:');
      
      let pricesWithValue = 0;
      let pricesZero = 0;
      
      sampleDomains.forEach((domain, i) => {
        const price = domain.price || 0;
        const wholesale = domain.wholesalePrice || 0;
        const guestPostCost = domain.guestPostCost;
        
        console.log(`   ${i + 1}. ${domain.domain}`);
        console.log(`      - Retail Price: $${price}`);
        console.log(`      - Wholesale Price: $${wholesale}`);  
        console.log(`      - Raw guestPostCost: ${guestPostCost}`);
        console.log(`      - Markup: $${price - wholesale} (should be $79)`);
        
        if (price > 0) pricesWithValue++;
        else pricesZero++;
        
        console.log('      ---');
      });
      
      console.log(`\n📈 SUMMARY:`);
      console.log(`   - Domains with valid prices: ${pricesWithValue}`);
      console.log(`   - Domains with $0 prices: ${pricesZero}`);
      console.log(`   - Success rate: ${Math.round((pricesWithValue / sampleDomains.length) * 100)}%`);
      
      // Test a few specific domains we know have pricing
      const testDomains = ['traveltweaks.com', 'goodmenproject.com', 'mindstick.com'];
      console.log(`\n🎯 TESTING KNOWN DOMAINS:`);
      
      testDomains.forEach(testDomain => {
        const found = data.domains.find(d => d.domain === testDomain);
        if (found) {
          console.log(`   ${testDomain}: $${found.price} (wholesale: $${found.wholesalePrice})`);
        } else {
          console.log(`   ${testDomain}: NOT FOUND in results`);
        }
      });
      
    } else {
      console.log('   ❌ No domains returned from API');
    }
    
    // Step 4: Check UI display
    console.log('\n4️⃣ Checking UI price display...');
    
    // Wait for table to load and check for N/A values
    await page.waitForTimeout(2000);
    const naCount = await page.locator('text=N/A').count();
    const priceElements = await page.locator('[data-testid*="price"], .price, td:contains("$")').count();
    
    console.log(`   Found ${naCount} "N/A" values in UI`);
    console.log(`   Found ${priceElements} price elements in UI`);
    
    if (naCount === 0) {
      console.log('   ✅ SUCCESS: No more N/A prices in UI!');
    } else {
      console.log('   ⚠️  Still seeing N/A prices in UI');
    }
    
    console.log('\n✨ Pricing fix test complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  await browser.close();
}

testPricingFix();