import { chromium } from 'playwright';

async function finalPaginationTest() {
  const browser = await chromium.launch({ headless: true }); // Run headless for speed
  const page = await browser.newPage();
  
  // Capture console for debugging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Updating URL') || text.includes('Fetched data for page')) {
      console.log('Console:', text);
    }
  });
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Step 2: Navigate to vetted sites
    console.log('2. Navigating to vetted sites...');
    await page.goto('http://localhost:3004/vetted-sites');
    await page.waitForTimeout(5000);
    
    // Step 3: Verify table exists
    const hasTable = await page.locator('table').count() > 0;
    if (!hasTable) {
      console.log('❌ Table not found');
      const url = page.url();
      console.log('Current URL:', url);
      if (url.includes('login')) {
        console.log('Still on login page - auth failed');
      }
      return false;
    }
    
    console.log('3. Table found, checking initial state...');
    
    // Step 4: Check initial button states
    const page1Btn = page.locator('button').filter({ hasText: /^1$/ }).first();
    const page2Btn = page.locator('button').filter({ hasText: /^2$/ }).first();
    
    // Check if buttons exist
    const hasPage1 = await page1Btn.count() > 0;
    const hasPage2 = await page2Btn.count() > 0;
    
    if (!hasPage1 || !hasPage2) {
      console.log('❌ Pagination buttons not found');
      console.log('Has page 1 button:', hasPage1);
      console.log('Has page 2 button:', hasPage2);
      return false;
    }
    
    // Get initial states
    const page1InitialClass = await page1Btn.getAttribute('class') || '';
    const page1InitialActive = page1InitialClass.includes('bg-blue-600');
    
    console.log('4. Initial state - Page 1 active:', page1InitialActive);
    
    // Get first row content
    const firstRowInitial = await page.locator('tbody tr:first-child').textContent();
    console.log('5. First row content:', firstRowInitial?.substring(0, 30) + '...');
    
    // Step 5: Click page 2
    console.log('6. Clicking page 2...');
    await page2Btn.click();
    await page.waitForTimeout(3000);
    
    // Check URL changed
    const urlAfterClick = page.url();
    const urlHasPage2 = urlAfterClick.includes('page=2');
    console.log('7. URL has page=2:', urlHasPage2);
    
    // Check button states after click
    const page1AfterClass = await page1Btn.getAttribute('class') || '';
    const page2AfterClass = await page2Btn.getAttribute('class') || '';
    
    const page1AfterActive = page1AfterClass.includes('bg-blue-600');
    const page2AfterActive = page2AfterClass.includes('bg-blue-600');
    
    console.log('8. After click - Page 1 active:', page1AfterActive);
    console.log('   After click - Page 2 active:', page2AfterActive);
    
    // Check content changed
    const firstRowAfter = await page.locator('tbody tr:first-child').textContent();
    const contentChanged = firstRowInitial !== firstRowAfter;
    console.log('9. Content changed:', contentChanged);
    if (!contentChanged) {
      console.log('   Initial:', firstRowInitial?.substring(0, 50));
      console.log('   After:', firstRowAfter?.substring(0, 50));
    }
    
    // Step 6: Click back to page 1
    console.log('10. Clicking back to page 1...');
    await page1Btn.click();
    await page.waitForTimeout(3000);
    
    const page1FinalClass = await page1Btn.getAttribute('class') || '';
    const page1FinalActive = page1FinalClass.includes('bg-blue-600');
    
    console.log('11. Final - Page 1 active:', page1FinalActive);
    
    // Results
    console.log('\n=== RESULTS ===');
    const tests = {
      'URL updates to page=2': urlHasPage2,
      'Page 2 button becomes active': page2AfterActive,
      'Page 1 button becomes inactive': !page1AfterActive,
      'Content changes': contentChanged,
      'Page 1 re-activates on return': page1FinalActive,
    };
    
    let allPass = true;
    for (const [test, result] of Object.entries(tests)) {
      console.log(`${test}: ${result ? '✅' : '❌'}`);
      if (!result) allPass = false;
    }
    
    console.log(`\nOVERALL: ${allPass ? '✅ PASS' : '❌ FAIL'}`);
    return allPass;
    
  } catch (error) {
    console.error('Test error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

finalPaginationTest().then(success => {
  if (success) {
    console.log('\n✅ Pagination is working correctly!');
  } else {
    console.log('\n❌ Pagination needs more fixes');
  }
  process.exit(success ? 0 : 1);
});