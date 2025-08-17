const { chromium } = require('playwright');

async function testAPIDirectly() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login first
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Get cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token-publisher');
    
    if (authCookie) {
      console.log('Auth cookie found');
      
      // Make API request
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/publisher/websites');
        const data = await res.json();
        return { status: res.status, data };
      });
      
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testAPIDirectly().catch(console.error);
