const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set up console log capture
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Logging in as admin...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
    console.log('✅ Logged in, now at:', page.url());

    // Wait a bit for session to stabilize
    await page.waitForTimeout(2000);

    console.log('3. Navigating to vetted-sites page...');
    await page.goto('http://localhost:3000/vetted-sites?page=1');
    await page.waitForLoadState('networkidle');
    
    // Check current URL
    console.log('Current URL:', page.url());
    
    // Wait for the page title to appear
    await page.waitForSelector('h1', { timeout: 5000 });
    const pageTitle = await page.textContent('h1');
    console.log('Page title:', pageTitle);

    // If we see "Vetted Sites" title, the page loaded correctly
    if (pageTitle && pageTitle.includes('Vetted Sites')) {
      console.log('✅ Vetted Sites page loaded successfully!');
      
      // Check for data
      const tableRows = await page.$$('tbody tr');
      console.log(`Found ${tableRows.length} table rows`);
      
      // If no rows, check for "No domains found" message
      const noDataMessage = await page.textContent('text=No domains found');
      if (noDataMessage) {
        console.log('⚠️ Page shows "No domains found" - checking why...');
        
        // Get stats
        const stats = await page.evaluate(() => {
          const qualified = document.querySelector('[class*="font-semibold"][class*="text-gray-900"]')?.textContent;
          const available = document.querySelector('[class*="font-semibold"][class*="text-green-600"]')?.textContent;
          const inUse = document.querySelector('[class*="font-semibold"][class*="text-yellow-600"]')?.textContent;
          return { qualified, available, inUse };
        });
        console.log('Stats on page:', stats);
      } else if (tableRows.length > 0) {
        console.log('✅ Data is displayed in the table!');
        
        // Get first row data
        const firstRowData = await tableRows[0].textContent();
        console.log('First row sample:', firstRowData.substring(0, 100));
      }
      
      // Take screenshot
      await page.screenshot({ path: 'vetted-sites-final.png', fullPage: true });
      console.log('📸 Screenshot saved as vetted-sites-final.png');
      
    } else {
      console.log('❌ Not on Vetted Sites page. Current page title:', pageTitle);
      await page.screenshot({ path: 'vetted-sites-wrong-page.png', fullPage: true });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'vetted-sites-error.png', fullPage: true });
  }

  // Keep browser open for inspection
  console.log('\n🔍 Browser will stay open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();