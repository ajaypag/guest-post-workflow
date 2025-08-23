import { chromium } from 'playwright';

async function testPaginationWithProperAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Login and wait for navigation
    console.log('1. Logging in...');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Click and wait for navigation
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard' }),
      page.click('button[type="submit"]')
    ]).catch(async () => {
      // If not redirected to dashboard, wait a bit
      await page.waitForTimeout(3000);
    });
    
    // Verify we're logged in
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token');
    if (!authCookie) {
      console.log('❌ No auth cookie found after login');
      return false;
    }
    console.log('✅ Auth cookie set');
    
    // Step 2: Navigate to vetted sites
    console.log('2. Going to vetted sites...');
    await page.goto('http://localhost:3004/vetted-sites');
    
    // Wait for content to load
    await page.waitForSelector('table', { timeout: 15000 });
    console.log('✅ Table loaded');
    
    // Step 3: Check initial state
    const page1Btn = page.locator('button:has-text("1")').first();
    const page2Btn = page.locator('button:has-text("2")').first();
    
    const page1InitialClass = await page1Btn.getAttribute('class') || '';
    console.log('3. Page 1 initially active:', page1InitialClass.includes('bg-blue-600'));
    
    // Get initial content
    const firstRowInitial = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log('4. First domain initially:', firstRowInitial);
    
    // Step 4: Click page 2
    console.log('5. Clicking page 2...');
    await page2Btn.click();
    await page.waitForTimeout(2000);
    
    // Check results
    const urlAfter = page.url();
    console.log('6. URL after click:', urlAfter);
    console.log('   Has page=2:', urlAfter.includes('page=2'));
    
    const page1AfterClass = await page1Btn.getAttribute('class') || '';
    const page2AfterClass = await page2Btn.getAttribute('class') || '';
    
    const page1Active = page1AfterClass.includes('bg-blue-600');
    const page2Active = page2AfterClass.includes('bg-blue-600');
    
    console.log('7. Button states after click:');
    console.log('   Page 1 active:', page1Active);
    console.log('   Page 2 active:', page2Active);
    
    const firstRowAfter = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log('8. First domain after click:', firstRowAfter);
    console.log('   Content changed:', firstRowInitial !== firstRowAfter);
    
    // Test results
    console.log('\n=== PAGINATION TEST RESULTS ===');
    const success = urlAfter.includes('page=2') && page2Active && !page1Active && firstRowInitial !== firstRowAfter;
    
    if (success) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('- URL updates correctly');
      console.log('- Page 2 button becomes active');
      console.log('- Page 1 button becomes inactive');
      console.log('- Table content changes');
    } else {
      console.log('❌ SOME TESTS FAILED');
      if (!urlAfter.includes('page=2')) console.log('- URL did not update');
      if (!page2Active) console.log('- Page 2 button not active');
      if (page1Active) console.log('- Page 1 button still active');
      if (firstRowInitial === firstRowAfter) console.log('- Content did not change');
    }
    
    await page.waitForTimeout(5000); // Keep open to verify visually
    return success;
    
  } catch (error) {
    console.error('Test error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testPaginationWithProperAuth().then(success => {
  process.exit(success ? 0 : 1);
});