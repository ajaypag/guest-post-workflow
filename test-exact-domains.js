const { chromium } = require('playwright');

async function testExactDomainsFromURL() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing Exact Domains from Vetted Sites URL...\n');
    
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('   ✅ Admin login completed');
    
    // Step 2: Get API data from exact URL
    console.log('2️⃣ Getting API data from exact URL...');
    const response = await page.request.get('http://localhost:3004/api/vetted-sites?clientId=49edc373-dd78-49c7-9e02-6f55f23d3f57&accountId=76162e0d-27d8-4e39-8ed6-fd609e37099a&page=1');
    const data = await response.json();
    
    if (data.domains && data.domains.length > 0) {
      console.log(`   API returned ${data.domains.length} domains`);
      
      // Get the domain names showing N/A
      const domainsWithNullPrices = data.domains.filter(d => !d.guestPostCost || d.guestPostCost === null);
      const domainsWithValidPrices = data.domains.filter(d => d.guestPostCost && d.guestPostCost !== null);
      
      console.log(`\n📊 API Results:`);
      console.log(`   - Domains with NULL guestPostCost: ${domainsWithNullPrices.length}`);
      console.log(`   - Domains with valid guestPostCost: ${domainsWithValidPrices.length}`);
      
      if (domainsWithNullPrices.length > 0) {
        console.log(`\n❌ Domains showing N/A prices:`);
        domainsWithNullPrices.slice(0, 10).forEach((domain, i) => {
          console.log(`   ${i + 1}. ${domain.domain} - guestPostCost: ${domain.guestPostCost}`);
        });
      }
      
      if (domainsWithValidPrices.length > 0) {
        console.log(`\n✅ Domains with valid prices:`);
        domainsWithValidPrices.slice(0, 5).forEach((domain, i) => {
          console.log(`   ${i + 1}. ${domain.domain} - guestPostCost: ${domain.guestPostCost}`);
        });
      }
      
      // Extract all domain names for database check
      const allDomainNames = data.domains.map(d => d.domain);
      console.log(`\n🔍 Will check these ${allDomainNames.length} domains in database...`);
      
      // Write domains to a temp file so we can check them in the database
      require('fs').writeFileSync('temp-domains.txt', allDomainNames.join('\n'));
      console.log('   Domain list written to temp-domains.txt');
      
    } else {
      console.log('   ❌ No domains returned from API');
    }
    
    await browser.close();
    console.log('\n✨ Test complete - now checking database...');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await browser.close();
  }
}

testExactDomainsFromURL();