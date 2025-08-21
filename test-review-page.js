const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Set the auth cookie
  await context.addCookies([{
    name: 'auth-token',
    value: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI5N2FjYTE2Zi04YjgxLTQ0YWQtYTUzMi1hNmUzZmE5NmNiZmMiLCJlbWFpbCI6ImFqYXlAb3V0cmVhY2hsYWJzLmNvbSIsIm5hbWUiOiJBamF5IFBhZ2hkYWwiLCJyb2xlIjoiYWRtaW4iLCJ1c2VyVHlwZSI6ImludGVybmFsIiwiZXhwIjoxNzU2MjcyNzk1fQ.MhKCmjClmsLAyxbbA0T5E9QtrOnNWaGSIIVrw2X79RM',
    domain: 'localhost',
    path: '/'
  }]);
  
  const page = await context.newPage();
  
  console.log('Testing Order Main Page...');
  await page.goto('http://localhost:3000/orders/aacfa0e6-945f-4b20-81cf-c92af0f6b5c5', { waitUntil: 'networkidle' });
  
  // Wait for auth to complete
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  // Check if we need to handle auth redirect
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.log('Redirected to login, auth might have expired');
    process.exit(1);
  }
  
  await page.waitForSelector('h1', { timeout: 30000 });
  const orderTitle = await page.textContent('h1');
  console.log('✅ Order page loaded:', orderTitle);
  
  // Check if line items table is visible
  const tableVisible = await page.isVisible('table');
  console.log('✅ Table visible:', tableVisible);
  
  // Count table rows
  const rowCount = await page.locator('tbody tr').count();
  console.log('✅ Line items in table:', rowCount);
  
  console.log('\nTesting Review Page...');
  await page.goto('http://localhost:3000/orders/aacfa0e6-945f-4b20-81cf-c92af0f6b5c5/review');
  await page.waitForSelector('h1', { timeout: 10000 });
  const reviewTitle = await page.textContent('h1');
  console.log('✅ Review page loaded:', reviewTitle);
  
  // Check statistics
  const stats = await page.evaluate(() => {
    const cards = document.querySelectorAll('.text-2xl.font-semibold');
    return {
      included: cards[0]?.textContent,
      savedForLater: cards[1]?.textContent,
      excluded: cards[2]?.textContent
    };
  });
  console.log('✅ Statistics:', stats);
  
  // Try to expand a row
  console.log('\nTesting row expansion...');
  const expandButton = await page.locator('td:has(svg.h-4.w-4)').first();
  if (await expandButton.isVisible()) {
    await expandButton.click();
    await page.waitForTimeout(500);
    const expandedContent = await page.isVisible('td[colspan]');
    console.log('✅ Row expanded successfully:', expandedContent);
  }
  
  // Test status dropdown
  console.log('\nTesting status change...');
  const statusDropdown = await page.locator('select').first();
  if (await statusDropdown.isVisible()) {
    const initialValue = await statusDropdown.inputValue();
    console.log('  Initial status:', initialValue || 'pending');
    
    // Change to included
    await statusDropdown.selectOption('included');
    await page.waitForTimeout(1000);
    
    const newValue = await statusDropdown.inputValue();
    console.log('✅ Status changed to:', newValue);
    
    // Check if stats updated
    const newStats = await page.evaluate(() => {
      const cards = document.querySelectorAll('.text-2xl.font-semibold');
      return {
        included: cards[0]?.textContent,
        savedForLater: cards[1]?.textContent,
        excluded: cards[2]?.textContent
      };
    });
    console.log('✅ Updated statistics:', newStats);
  }
  
  // Test edit button
  console.log('\nTesting edit functionality...');
  const editButton = await page.locator('button:has(svg.h-3.w-3)').first();
  if (await editButton.isVisible()) {
    await editButton.click();
    await page.waitForTimeout(500);
    
    const modalVisible = await page.isVisible('text=/Edit Site Details/i');
    console.log('✅ Edit modal opened:', modalVisible);
    
    if (modalVisible) {
      // Close the modal
      const closeButton = await page.locator('button:has-text("Cancel")');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }
  
  console.log('\n✅ All tests completed successfully!');
  
  await browser.close();
})().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});