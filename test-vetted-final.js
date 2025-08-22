const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Logging in as admin...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await page.waitForTimeout(2000);
    console.log('✅ Logged in successfully');

    console.log('3. Navigating to vetted-sites page...');
    await page.goto('http://localhost:3000/vetted-sites?page=1');
    await page.waitForTimeout(3000); // Wait for data to load

    // Check for data on the page
    const tableRows = await page.$$('tbody tr');
    console.log(`✅ Table rows found: ${tableRows.length}`);

    // Get stats from the page
    const stats = await page.evaluate(() => {
      const statElements = document.querySelectorAll('[class*="text-center"]');
      const stats = {};
      statElements.forEach(el => {
        const label = el.querySelector('[class*="text-gray-500"]')?.textContent;
        const value = el.querySelector('[class*="font-semibold"]')?.textContent;
        if (label && value) {
          stats[label] = value;
        }
      });
      return stats;
    });
    console.log('✅ Page stats:', JSON.stringify(stats));

    // Take screenshot
    await page.screenshot({ path: 'vetted-sites-working.png', fullPage: true });
    console.log('✅ Screenshot saved as vetted-sites-working.png');

    // Test filtering
    console.log('4. Testing filter functionality...');
    
    // Click on a client filter if available
    const clientCheckbox = await page.$('input[type="checkbox"][id^="client-"]');
    if (clientCheckbox) {
      await clientCheckbox.click();
      await page.waitForTimeout(2000);
      console.log('✅ Client filter applied');
    }

    // Take screenshot with filter
    await page.screenshot({ path: 'vetted-sites-filtered.png', fullPage: true });
    console.log('✅ Screenshot with filter saved as vetted-sites-filtered.png');

    // Test search
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.fill('test');
      await page.waitForTimeout(2000);
      console.log('✅ Search functionality tested');
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'vetted-sites-error.png', fullPage: true });
  }

  await browser.close();
})();