import { chromium } from 'playwright';

async function testPaginationVisual() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to login page
    console.log('Logging in...');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(5000);
    
    // Navigate to vetted sites
    console.log('Going to vetted sites...');
    await page.goto('http://localhost:3004/vetted-sites', { waitUntil: 'networkidle' });
    await page.waitForSelector('table', { timeout: 30000 });
    
    // Check initial pagination state
    console.log('\n=== INITIAL STATE ===');
    const page1Button = page.locator('button').filter({ hasText: /^1$/ }).first();
    const page2Button = page.locator('button').filter({ hasText: /^2$/ }).first();
    
    // Check which button is active (has blue background)
    const page1Classes = await page1Button.getAttribute('class') || '';
    const page2Classes = await page2Button.getAttribute('class') || '';
    
    console.log('Page 1 button classes:', page1Classes);
    console.log('Page 1 is active:', page1Classes.includes('bg-blue-600'));
    console.log('Page 2 button classes:', page2Classes);
    console.log('Page 2 is active:', page2Classes.includes('bg-blue-600'));
    
    // Get first row content to verify data changes
    const firstRowBefore = await page.locator('tbody tr').first().textContent();
    console.log('First row content:', firstRowBefore?.substring(0, 50) + '...');
    
    // Click page 2
    console.log('\n=== CLICKING PAGE 2 ===');
    await page2Button.click();
    await page.waitForTimeout(2000);
    
    // Check pagination state after clicking
    const page1ClassesAfter = await page1Button.getAttribute('class') || '';
    const page2ClassesAfter = await page2Button.getAttribute('class') || '';
    
    console.log('Page 1 button classes after:', page1ClassesAfter);
    console.log('Page 1 is active:', page1ClassesAfter.includes('bg-blue-600'));
    console.log('Page 2 button classes after:', page2ClassesAfter);
    console.log('Page 2 is active:', page2ClassesAfter.includes('bg-blue-600'));
    
    // Check URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    console.log('URL contains page=2:', currentUrl.includes('page=2'));
    
    // Get first row content after pagination
    const firstRowAfter = await page.locator('tbody tr').first().textContent();
    console.log('First row content after:', firstRowAfter?.substring(0, 50) + '...');
    console.log('Content changed:', firstRowBefore !== firstRowAfter);
    
    // Test clicking back to page 1
    console.log('\n=== CLICKING BACK TO PAGE 1 ===');
    await page1Button.click();
    await page.waitForTimeout(2000);
    
    const page1ClassesFinal = await page1Button.getAttribute('class') || '';
    const page2ClassesFinal = await page2Button.getAttribute('class') || '';
    
    console.log('Page 1 is active:', page1ClassesFinal.includes('bg-blue-600'));
    console.log('Page 2 is active:', page2ClassesFinal.includes('bg-blue-600'));
    console.log('URL:', page.url());
    
    // Summary
    console.log('\n=== TEST RESULTS ===');
    if (page2ClassesAfter.includes('bg-blue-600') && !page1ClassesAfter.includes('bg-blue-600')) {
      console.log('✅ Page 2 button became active when clicked');
    } else {
      console.log('❌ Page 2 button did NOT become active when clicked');
    }
    
    if (page1ClassesFinal.includes('bg-blue-600') && !page2ClassesFinal.includes('bg-blue-600')) {
      console.log('✅ Page 1 button became active when clicked back');
    } else {
      console.log('❌ Page 1 button did NOT become active when clicked back');
    }
    
    if (firstRowBefore !== firstRowAfter) {
      console.log('✅ Table content changed when navigating pages');
    } else {
      console.log('❌ Table content did NOT change');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    console.log('\nBrowser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testPaginationVisual();