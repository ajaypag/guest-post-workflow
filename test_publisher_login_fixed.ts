import { chromium } from 'playwright';

async function testPublisherLogin() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to publisher login...');
    await page.goto('http://localhost:3001/publisher/login', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(2000);
    
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Check if login form exists
    const loginForm = await page.$('form');
    console.log('Login form exists:', !!loginForm);
    
    if (loginForm) {
      console.log('Attempting login with sophia@delightfullynotedblog.com...');
      await page.fill('input[type="email"], input[name="email"]', 'sophia@delightfullynotedblog.com');
      await page.fill('input[type="password"], input[name="password"]', '2yK4$^1*NeelDTgf');
      
      await page.waitForTimeout(1000);
      console.log('Clicking login button...');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      await page.waitForTimeout(5000);
      
      console.log('After login - Current URL:', page.url());
      
      // Check if we're redirected to dashboard
      if (page.url().includes('/publisher') && !page.url().includes('/login')) {
        console.log('✅ Login successful! Redirected to:', page.url());
        
        // Navigate to orders page to test the API
        console.log('Navigating to orders page...');
        await page.goto('http://localhost:3001/publisher/orders');
        await page.waitForTimeout(3000);
        
        console.log('Orders page URL:', page.url());
        
        // Check for loading state or content
        const loadingElement = await page.$('[data-testid="loading"], .animate-spin, text="Loading orders"');
        console.log('Loading element found:', !!loadingElement);
        
        // Check for error messages
        const errorElement = await page.$('.text-red-800, .text-red-600, [role="alert"]');
        if (errorElement) {
          const errorText = await errorElement.textContent();
          console.log('❌ Orders page error:', errorText);
        } else {
          console.log('✅ No obvious errors on orders page');
        }
        
        // Check for orders content
        const ordersContent = await page.$('.bg-white.rounded-lg.shadow-md, .orders-list, text="Total Orders"');
        console.log('Orders content found:', !!ordersContent);
        
      } else {
        console.log('❌ Login failed - still on login page');
        
        // Check for error messages
        const errorSelectors = [
          '[role="alert"]', 
          '.text-red-600', 
          '.text-red-800',
          '.error-message'
        ];
        
        for (const selector of errorSelectors) {
          const errorElement = await page.$(selector);
          if (errorElement) {
            const text = await errorElement.textContent();
            if (text && text.trim()) {
              console.log(`Login error (${selector}):`, text);
            }
          }
        }
      }
    }
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error testing login:', error.message);
  } finally {
    await browser.close();
  }
}

testPublisherLogin().catch(console.error);