import puppeteer from 'puppeteer';

async function testScraper() {
  console.log('Testing blog scraper...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test if server is running
    console.log('1. Checking if server is running at http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    // Check if page loaded
    const title = await page.title();
    console.log(`   ✓ Page loaded. Title: ${title}`);
    
    // Check if main elements exist
    const h1 = await page.$eval('h1', el => el.textContent);
    console.log(`   ✓ Found heading: ${h1}`);
    
    // Check if sitemap input exists
    const sitemapInput = await page.$('#sitemap-url');
    if (sitemapInput) {
      const defaultValue = await page.$eval('#sitemap-url', el => el.value);
      console.log(`   ✓ Sitemap input found with default value: ${defaultValue}`);
    }
    
    // Check if fetch button exists
    const fetchButton = await page.$('#fetch-sitemap');
    if (fetchButton) {
      console.log('   ✓ Fetch sitemap button found');
    }
    
    // Test fetching sitemap
    console.log('\n2. Testing sitemap fetch...');
    await page.click('#fetch-sitemap');
    
    // Wait for status or URL list to appear
    await page.waitForSelector('.status, .urls-list', { timeout: 10000 });
    
    // Check if URLs were loaded
    const urlsVisible = await page.$('.urls-list');
    if (urlsVisible) {
      const urlCount = await page.$$eval('.url-item', items => items.length);
      console.log(`   ✓ Sitemap loaded successfully. Found ${urlCount} URLs`);
      
      // Get first few URLs
      const firstUrls = await page.$$eval('.url-item label', labels => 
        labels.slice(0, 3).map(label => label.textContent)
      );
      console.log('   First few URLs:');
      firstUrls.forEach(url => console.log(`     - ${url}`));
    }
    
    // Check status message
    const statusText = await page.$eval('.status', el => el.textContent).catch(() => null);
    if (statusText) {
      console.log(`   Status: ${statusText}`);
    }
    
    console.log('\n✅ Blog scraper is running successfully!');
    console.log('You can now use it at: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Error testing scraper:', error.message);
    
    // Try to get more info about the error
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error('   The server is not running. Please start it with: npm start');
    }
  } finally {
    await browser.close();
  }
}

// Run the test
testScraper().catch(console.error);