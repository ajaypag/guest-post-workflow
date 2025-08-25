import { chromium } from 'playwright';

async function testPaginationComplete() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForTimeout(5000);
    
    // Navigate directly using URL since redirect might not work
    console.log('Navigating to vetted sites...');
    await page.goto('http://localhost:3004/vetted-sites');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check if table exists
    const tableExists = await page.locator('table').count() > 0;
    if (!tableExists) {
      console.log('Table not found, checking page content...');
      const bodyText = await page.locator('body').textContent();
      console.log('Page content:', bodyText?.substring(0, 200));
      throw new Error('Table not found on page');
    }
    
    console.log('=== INITIAL STATE (PAGE 1) ===');
    
    // Check page 1 button state
    const page1Button = await page.locator('button:has-text("1")').first();
    const page2Button = await page.locator('button:has-text("2")').first();
    
    const page1InitialClasses = await page1Button.getAttribute('class') || '';
    const page2InitialClasses = await page2Button.getAttribute('class') || '';
    
    const page1InitialActive = page1InitialClasses.includes('bg-blue-600');
    const page2InitialActive = page2InitialClasses.includes('bg-blue-600');
    
    console.log('Page 1 button is blue:', page1InitialActive);
    console.log('Page 2 button is blue:', page2InitialActive);
    
    // Get first domain name
    const firstDomainPage1 = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log('First domain on page 1:', firstDomainPage1);
    
    // Click page 2
    console.log('\n=== CLICKING PAGE 2 ===');
    await page2Button.click();
    
    // Wait for data to update
    await page.waitForTimeout(3000);
    
    // Check button states after clicking page 2
    const page1AfterClasses = await page1Button.getAttribute('class') || '';
    const page2AfterClasses = await page2Button.getAttribute('class') || '';
    
    const page1AfterActive = page1AfterClasses.includes('bg-blue-600');
    const page2AfterActive = page2AfterClasses.includes('bg-blue-600');
    
    console.log('Page 1 button is blue:', page1AfterActive);
    console.log('Page 2 button is blue:', page2AfterActive);
    
    // Get first domain name on page 2
    const firstDomainPage2 = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log('First domain on page 2:', firstDomainPage2);
    
    // Check URL
    const urlPage2 = page.url();
    console.log('URL contains page=2:', urlPage2.includes('page=2'));
    
    // Click back to page 1
    console.log('\n=== CLICKING BACK TO PAGE 1 ===');
    await page1Button.click();
    
    await page.waitForTimeout(3000);
    
    // Final check
    const page1FinalClasses = await page1Button.getAttribute('class') || '';
    const page2FinalClasses = await page2Button.getAttribute('class') || '';
    
    const page1FinalActive = page1FinalClasses.includes('bg-blue-600');
    const page2FinalActive = page2FinalClasses.includes('bg-blue-600');
    
    console.log('Page 1 button is blue:', page1FinalActive);
    console.log('Page 2 button is blue:', page2FinalActive);
    
    const firstDomainBack = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log('First domain after returning:', firstDomainBack);
    
    // RESULTS
    console.log('\n=== TEST RESULTS ===');
    
    const test1 = page1InitialActive && !page2InitialActive;
    const test2 = !page1AfterActive && page2AfterActive;
    const test3 = firstDomainPage1 !== firstDomainPage2;
    const test4 = page1FinalActive && !page2FinalActive;
    const test5 = firstDomainBack === firstDomainPage1;
    
    console.log('Test 1 - Page 1 starts active:', test1 ? '✅ PASS' : '❌ FAIL');
    console.log('Test 2 - Page 2 becomes active when clicked:', test2 ? '✅ PASS' : '❌ FAIL');
    console.log('Test 3 - Content changes between pages:', test3 ? '✅ PASS' : '❌ FAIL');
    console.log('Test 4 - Page 1 becomes active when clicked back:', test4 ? '✅ PASS' : '❌ FAIL');
    console.log('Test 5 - Original content restored:', test5 ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = test1 && test2 && test3 && test4 && test5;
    console.log('\nOVERALL:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
    
  } catch (error) {
    console.error('Test error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testPaginationComplete().then(success => {
  process.exit(success ? 0 : 1);
});