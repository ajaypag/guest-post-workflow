import { chromium } from 'playwright';

async function debugClickTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
  });
  
  try {
    // Login
    console.log('\n=== LOGGING IN ===');
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Go to vetted sites
    console.log('\n=== NAVIGATING TO VETTED SITES ===');
    await page.goto('http://localhost:3004/vetted-sites');
    await page.waitForTimeout(5000);
    
    // Check if table exists
    const tableExists = await page.locator('table').count() > 0;
    if (!tableExists) {
      console.log('❌ No table found');
      return;
    }
    
    console.log('✅ Table found');
    
    // Find pagination buttons
    console.log('\n=== CHECKING PAGINATION BUTTONS ===');
    const buttons = await page.locator('button').allTextContents();
    console.log('All buttons:', buttons);
    
    // Try different selectors for page 2 button
    const selectors = [
      'button:has-text("2")',
      'button:text("2")',
      'button:text-is("2")',
      '.flex.items-center.space-x-1 button:nth-child(2)',
    ];
    
    for (const selector of selectors) {
      const btn = page.locator(selector).first();
      const exists = await btn.count() > 0;
      console.log(`Selector "${selector}": ${exists ? 'Found' : 'Not found'}`);
      
      if (exists) {
        const text = await btn.textContent();
        const classes = await btn.getAttribute('class');
        console.log(`  Text: "${text}"`);
        console.log(`  Classes: ${classes?.substring(0, 50)}...`);
        
        // Try clicking
        console.log('\n=== ATTEMPTING CLICK ===');
        console.log('URL before:', page.url());
        
        await btn.click();
        await page.waitForTimeout(3000);
        
        console.log('URL after:', page.url());
        break;
      }
    }
    
    console.log('\n=== KEEPING BROWSER OPEN FOR MANUAL TESTING ===');
    console.log('Try clicking page 2 manually and see if it works...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugClickTest();