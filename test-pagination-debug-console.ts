import { chromium } from 'playwright';

async function testWithConsole() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('handlePageChange') || text.includes('Updating URL') || text.includes('Fetched data')) {
      consoleLogs.push(text);
      console.log('Console:', text);
    }
  });
  
  try {
    // Login
    await page.goto('http://localhost:3004/login');
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Go to vetted sites
    await page.goto('http://localhost:3004/vetted-sites');
    await page.waitForTimeout(5000);
    
    // Check current URL
    console.log('Initial URL:', page.url());
    
    // Click page 2
    console.log('\nClicking page 2...');
    const page2Button = await page.locator('button:has-text("2")').first();
    await page2Button.click();
    
    // Wait for potential update
    await page.waitForTimeout(3000);
    
    console.log('URL after click:', page.url());
    console.log('\nConsole logs captured:');
    consoleLogs.forEach(log => console.log('  -', log));
    
    // Check if data actually updated
    const showingText = await page.locator('text=/Showing page/').textContent();
    console.log('Pagination text:', showingText);
    
    // Check API calls
    console.log('\nChecking network activity...');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testWithConsole();