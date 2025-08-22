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
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
      console.log('Console Error:', msg.text().substring(0, 100));
    }
  });

  try {
    console.log('Waiting 10 seconds for rate limit to clear...');
    await page.waitForTimeout(10000);
    
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Attempting login...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    if (currentUrl.includes('login')) {
      console.log('⚠️ Still on login page, checking for error...');
      const errorText = await page.textContent('.text-red-500, .text-red-600, [class*="error"]').catch(() => null);
      if (errorText) {
        console.log('Login error:', errorText);
      }
    } else {
      console.log('✅ Login successful!');
    }

    console.log('3. Navigating directly to vetted-sites...');
    await page.goto('http://localhost:3000/vetted-sites?page=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check current page
    const pageTitle = await page.textContent('h1').catch(() => 'No title');
    console.log('Page title:', pageTitle);
    
    if (pageTitle.includes('Vetted Sites')) {
      console.log('✅ On Vetted Sites page');
      
      // Check stats
      const stats = await page.evaluate(() => {
        const statElements = document.querySelectorAll('.text-center');
        const stats = [];
        statElements.forEach(el => {
          const value = el.querySelector('.font-semibold')?.textContent;
          const label = el.querySelector('.text-gray-500')?.textContent;
          if (value && label) {
            stats.push(`${label}: ${value}`);
          }
        });
        return stats;
      });
      console.log('Stats:', stats.join(', ') || 'No stats found');
      
      // Check for table rows
      const tableRows = await page.$$('tbody tr');
      console.log('Table rows:', tableRows.length);
      
      // Check for no data message
      const noDataMsg = await page.textContent('text=No domains found').catch(() => null);
      if (noDataMsg) {
        console.log('⚠️ "No domains found" message is displayed');
        
        // Check what filters are active
        const activeFilters = await page.evaluate(() => {
          const filters = [];
          // Check quality checkboxes
          const qualityChecks = document.querySelectorAll('input[type="checkbox"]:checked');
          qualityChecks.forEach(cb => {
            const label = cb.parentElement?.textContent?.trim();
            if (label) filters.push(`Quality: ${label}`);
          });
          return filters;
        });
        console.log('Active filters:', activeFilters.join(', ') || 'None');
        
        // Check if High Quality and Good Quality options exist
        const qualityOptions = await page.evaluate(() => {
          const options = [];
          const labels = document.querySelectorAll('label');
          labels.forEach(label => {
            const text = label.textContent?.trim();
            if (text && (text.includes('Quality') || text.includes('Marginal') || text.includes('Pending'))) {
              options.push(text);
            }
          });
          return options;
        });
        console.log('Available quality options:', qualityOptions.join(', '));
      } else {
        console.log('✅ Data is displayed!');
        const firstRow = await page.textContent('tbody tr:first-child').catch(() => 'No data');
        console.log('First row preview:', firstRow.substring(0, 100));
      }
      
      // Take screenshot
      await page.screenshot({ path: 'vetted-sites-current-state.png', fullPage: true });
      console.log('📸 Screenshot saved as vetted-sites-current-state.png');
      
    } else {
      console.log('❌ Not on Vetted Sites page');
      await page.screenshot({ path: 'vetted-sites-wrong-page.png', fullPage: true });
    }

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'vetted-sites-error-state.png', fullPage: true });
  }

  await browser.close();
})();