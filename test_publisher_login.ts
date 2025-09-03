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
    
    // Check for any error messages
    const errorSelectors = [
      '[role="alert"]', 
      '.text-red-600', 
      '.text-red-800',
      '.error-message',
      '[data-testid="error"]'
    ];
    
    for (const selector of errorSelectors) {
      const errorElement = await page.$(selector);
      if (errorElement) {
        const text = await errorElement.textContent();
        if (text && text.trim()) {
          console.log(`Error found (${selector}):`, text);
        }
      }
    }
    
    // Try to login with a test publisher
    if (loginForm) {
      console.log('Attempting login...');
      await page.fill('input[type="email"], input[name="email"]', 'orla@hellonuzzle.com');
      await page.fill('input[type="password"], input[name="password"]', 'test123');
      
      await page.waitForTimeout(1000);
      console.log('Clicking login button...');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      await page.waitForTimeout(3000);
      
      console.log('After login - Current URL:', page.url());
      
      // Check for any error messages after login attempt
      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const text = await errorElement.textContent();
          if (text && text.trim()) {
            console.log(`Post-login error found (${selector}):`, text);
          }
        }
      }
    }
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error testing login page:', error.message);
  } finally {
    await browser.close();
  }
}

testPublisherLogin().catch(console.error);