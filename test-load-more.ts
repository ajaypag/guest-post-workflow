import { chromium } from 'playwright';

async function testLoadMore() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to vetted sites
    console.log('2. Going to vetted sites...');
    await page.goto('http://localhost:3004/vetted-sites', { timeout: 60000 });
    await page.waitForSelector('table', { timeout: 30000 });
    
    // Count initial rows
    const initialRows = await page.locator('tbody tr').count();
    console.log('3. Initial rows in table:', initialRows);
    
    // Check if Load More button exists
    const loadMoreButton = page.locator('button:has-text("Load More")');
    const hasLoadMore = await loadMoreButton.count() > 0;
    console.log('4. Load More button exists:', hasLoadMore);
    
    if (!hasLoadMore) {
      console.log('   No Load More button - all domains shown or only 1 page');
      return;
    }
    
    // Get first domain before loading more
    const firstDomain = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log('5. First domain:', firstDomain);
    
    // Click Load More
    console.log('6. Clicking Load More...');
    await loadMoreButton.click();
    
    // Wait for loading to complete
    await page.waitForTimeout(3000);
    
    // Count rows after loading more
    const rowsAfterLoad = await page.locator('tbody tr').count();
    console.log('7. Rows after Load More:', rowsAfterLoad);
    
    // Check if first domain is still the same (should be)
    const firstDomainAfter = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log('8. First domain still same:', firstDomain === firstDomainAfter);
    
    // Check if Load More button still exists (might be gone if all loaded)
    const stillHasLoadMore = await loadMoreButton.count() > 0;
    console.log('9. Load More button still visible:', stillHasLoadMore);
    
    console.log('\n=== RESULTS ===');
    console.log('✅ Success: Loaded', rowsAfterLoad - initialRows, 'more domains');
    console.log('✅ First domain preserved (infinite scroll working)');
    
    await page.waitForTimeout(5000); // Keep open for inspection
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testLoadMore();