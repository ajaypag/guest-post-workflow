import { chromium, Browser, Page } from 'playwright';

async function simpleBrowserTest() {
  console.log('🧪 Simple browser test to check login page...');
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Launch browser in visible mode
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000, // Slow down for easier viewing
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    // Set longer timeout
    page.setDefaultTimeout(15000);
    
    console.log('🌐 Navigating to localhost:3003...');
    await page.goto('http://localhost:3003');
    await page.waitForTimeout(2000);
    
    console.log('📄 Page title:', await page.title());
    console.log('🔗 Current URL:', page.url());
    
    // Check if we're redirected to login
    if (page.url().includes('/login')) {
      console.log('✅ Redirected to login page');
    } else {
      console.log('🔄 Navigating to /login manually...');
      await page.goto('http://localhost:3003/login');
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/simple_browser_test.png' });
    console.log('📸 Screenshot saved: /tmp/simple_browser_test.png');
    
    // Show page content
    const bodyText = await page.locator('body').textContent();
    console.log('📄 Page body text length:', bodyText?.length || 0);
    if (bodyText) {
      console.log('📄 First 200 chars:', bodyText.substring(0, 200));
    }
    
    // Check for any forms
    const forms = await page.locator('form').count();
    console.log('📋 Forms found:', forms);
    
    // Check for any inputs
    const inputs = await page.locator('input').count();
    console.log('📋 Inputs found:', inputs);
    
    // Check for any buttons
    const buttons = await page.locator('button').count();
    console.log('🔘 Buttons found:', buttons);
    
    // Wait for manual inspection
    console.log('👀 Browser will stay open for 20 seconds for manual inspection...');
    console.log('   - Check if the login form is visible');
    console.log('   - Check if there are any JavaScript errors');
    console.log('   - Try manually logging in with: ajay@outreachlabs.com / FA64!I$nrbCauS^d');
    
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (page) {
      await page.screenshot({ path: '/tmp/simple_browser_error.png' });
      console.log('📸 Error screenshot saved: /tmp/simple_browser_error.png');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  simpleBrowserTest().catch(console.error);
}