const { chromium } = require('playwright');

async function testPriceNAIssue() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing Price N/A Issue on Vetted Sites...\n');
    
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); // Wait for login to process
    console.log('   ✅ Admin login completed (redirected to home)');
    
    // Step 2: Navigate to vetted sites with filters
    console.log('2️⃣ Navigating to vetted sites with filters...');
    const url = 'http://localhost:3004/vetted-sites?clientId=49edc373-dd78-49c7-9e02-6f55f23d3f57&accountId=76162e0d-27d8-4e39-8ed6-fd609e37099a&page=1';
    await page.goto(url);
    
    // Wait for table to load
    await page.waitForTimeout(5000);
    
    // Step 3: Check for price column and N/A values
    console.log('3️⃣ Checking price values...');
    
    // Look for price cells
    const priceCells = await page.locator('td:has-text("Price"), th:has-text("Price")').count();
    console.log(`   Found ${priceCells} price column headers`);
    
    // Look for N/A in price areas
    const naValues = await page.locator('text=N/A').count();
    console.log(`   Found ${naValues} "N/A" values on page`);
    
    // Get specific price column data
    const priceElements = await page.locator('[data-testid*="price"], .price, td:nth-child(4)').all();
    console.log(`   Found ${priceElements.length} potential price elements`);
    
    // Check first few price values
    for (let i = 0; i < Math.min(5, priceElements.length); i++) {
      const text = await priceElements[i].textContent();
      console.log(`   Price ${i + 1}: "${text}"`);
    }
    
    // Step 4: Check API response directly
    console.log('4️⃣ Checking API response...');
    const response = await page.request.get('http://localhost:3004/api/vetted-sites?clientId=49edc373-dd78-49c7-9e02-6f55f23d3f57');
    const data = await response.json();
    
    if (data.domains && data.domains.length > 0) {
      console.log(`   API returned ${data.domains.length} domains`);
      const firstDomain = data.domains[0];
      console.log('   First domain data:');
      console.log(`     - Domain: ${firstDomain.domain}`);
      console.log(`     - guestPostCost: ${firstDomain.guestPostCost}`);
      console.log(`     - linkInsertionPrice: ${firstDomain.linkInsertionPrice}`);
      
      // Check if guestPostCost values are null/missing
      const nullPrices = data.domains.filter(d => !d.guestPostCost || d.guestPostCost === null);
      const validPrices = data.domains.filter(d => d.guestPostCost && d.guestPostCost !== null);
      console.log(`   Domains with NULL guestPostCost: ${nullPrices.length}`);
      console.log(`   Domains with valid guestPostCost: ${validPrices.length}`);
      
      if (validPrices.length > 0) {
        console.log(`   Example valid price: ${validPrices[0].guestPostCost} for ${validPrices[0].domain}`);
      }
      if (nullPrices.length > 0) {
        console.log(`   Example NULL price domain: ${nullPrices[0].domain}`);
      }
    }
    
    // Step 5: Take screenshot
    await page.screenshot({ path: 'price-na-issue.png', fullPage: true });
    console.log('📸 Screenshot saved as price-na-issue.png');
    
    console.log('\n✨ Test complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'price-test-error.png', fullPage: true });
  }
  
  // Keep browser open for inspection
  console.log('\n👀 Browser will remain open for inspection...');
}

testPriceNAIssue();