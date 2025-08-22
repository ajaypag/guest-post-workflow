const { chromium } = require('playwright');

(async () => {
  console.log('⏰ Waiting 60 seconds for rate limit to clear...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  const browser = await chromium.launch({ 
    headless: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Logging in...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const afterLoginUrl = page.url();
    console.log('URL after login:', afterLoginUrl);
    
    if (!afterLoginUrl.includes('login')) {
      console.log('✅ Login successful!');
      
      console.log('3. Navigating to vetted-sites...');
      await page.goto('http://localhost:3000/vetted-sites');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Check page title
      const pageTitle = await page.textContent('h1');
      console.log('Page title:', pageTitle);
      
      if (pageTitle && pageTitle.includes('Vetted Sites')) {
        console.log('✅ Vetted Sites page loaded!');
        
        // Get comprehensive page data
        const pageData = await page.evaluate(() => {
          // Get stats
          const stats = {};
          document.querySelectorAll('.text-center').forEach(el => {
            const value = el.querySelector('.font-semibold')?.textContent;
            const label = el.querySelector('.text-gray-500')?.textContent;
            if (value && label) {
              stats[label] = value;
            }
          });
          
          // Get table rows count
          const tableRows = document.querySelectorAll('tbody tr').length;
          
          // Check for no data message
          const noDataMessage = document.body.textContent.includes('No domains found');
          
          // Get quality filter options
          const qualityOptions = [];
          document.querySelectorAll('label').forEach(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            if (checkbox && label.textContent.match(/Quality|Marginal|Pending|Disqualified/)) {
              qualityOptions.push({
                label: label.textContent.trim(),
                checked: checkbox.checked
              });
            }
          });
          
          return {
            stats,
            tableRows,
            hasNoDataMessage: noDataMessage,
            qualityOptions
          };
        });
        
        console.log('\n📊 PAGE DATA:');
        console.log('Stats:', JSON.stringify(pageData.stats));
        console.log('Table rows:', pageData.tableRows);
        console.log('Shows "No domains found":', pageData.hasNoDataMessage);
        console.log('Quality filter options:');
        pageData.qualityOptions.forEach(opt => {
          console.log(`  - ${opt.label}: ${opt.checked ? '✓ Checked' : '○ Unchecked'}`);
        });
        
        // If no data, try to fix filters
        if (pageData.hasNoDataMessage && pageData.tableRows === 0) {
          console.log('\n🔧 Attempting to fix filters...');
          
          // Check the Good Quality and High Quality checkboxes
          const highQuality = await page.$('label:has-text("High Quality") input[type="checkbox"]');
          const goodQuality = await page.$('label:has-text("Good Quality") input[type="checkbox"]');
          
          if (highQuality) {
            await highQuality.check();
            console.log('✓ Checked High Quality');
          }
          if (goodQuality) {
            await goodQuality.check();
            console.log('✓ Checked Good Quality');
          }
          
          // Click Apply Filters button
          const applyButton = await page.$('button:has-text("Apply Filters")');
          if (applyButton) {
            await applyButton.click();
            console.log('✓ Clicked Apply Filters');
            await page.waitForTimeout(3000);
            
            // Check again
            const newTableRows = await page.$$('tbody tr');
            console.log(`\n📊 After applying filters: ${newTableRows.length} rows`);
            
            if (newTableRows.length > 0) {
              const firstRow = await newTableRows[0].textContent();
              console.log('First row preview:', firstRow.substring(0, 150));
            }
          }
        }
        
        // Take final screenshot
        await page.screenshot({ path: 'vetted-sites-final-state.png', fullPage: true });
        console.log('\n📸 Screenshot saved as vetted-sites-final-state.png');
      }
    } else {
      console.log('❌ Login failed - still rate limited');
      const errorMsg = await page.textContent('.text-red-500, .text-red-600');
      console.log('Error:', errorMsg);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
})();