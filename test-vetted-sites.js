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

  // Set up request/response logging
  page.on('response', response => {
    if (response.url().includes('/api/vetted-sites')) {
      console.log('📡 API Response:', response.url(), response.status());
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
    
    // Wait for redirect after login (could be / or /dashboard)
    await page.waitForURL((url) => {
      return url.pathname === '/' || url.pathname === '/dashboard' || url.pathname === '/internal';
    }, { timeout: 10000 });
    console.log('✅ Logged in successfully');

    console.log('3. Navigating to vetted-sites page...');
    await page.goto('http://localhost:3000/vetted-sites?page=1');
    await page.waitForLoadState('networkidle');

    // Capture the API response
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/vetted-sites?page=1&limit=50&status=high_quality,good_quality&view=all');
        const data = await response.json();
        return {
          status: response.status,
          data: data
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('4. API Response:', JSON.stringify(apiResponse, null, 2));

    // Check for data on the page
    const tableRows = await page.$$('tbody tr');
    console.log(`5. Table rows found: ${tableRows.length}`);

    // Check for "No domains found" message
    const noDataMessage = await page.textContent('text=No domains found');
    if (noDataMessage) {
      console.log('⚠️ "No domains found" message is displayed');
    }

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
    console.log('6. Page stats:', stats);

    // Take screenshot
    await page.screenshot({ path: 'vetted-sites-initial.png', fullPage: true });
    console.log('📸 Screenshot saved as vetted-sites-initial.png');

    // Check browser console for errors
    const consoleErrors = await page.evaluate(() => {
      const errors = [];
      // This will be empty unless we captured them earlier
      return errors;
    });

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'vetted-sites-error.png', fullPage: true });
  }

  await browser.close();
})();