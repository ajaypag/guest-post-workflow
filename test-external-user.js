const puppeteer = require('puppeteer');

async function testExternalUser() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Login as external user
    console.log('1. Logging in as abelino@factbites.com (external user)...');
    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="email"]', 'abelino@factbites.com');
    await page.type('input[name="password"]', 'zKz2OQgCKN!4yZI4');
    
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.click('button[type="submit"]');
    await navigationPromise;
    
    const afterLoginUrl = page.url();
    console.log('2. After login URL:', afterLoginUrl);
    
    // Check if external user is redirected to account dashboard
    if (afterLoginUrl.includes('/account/dashboard')) {
      console.log('✅ SUCCESS: External user redirected to /account/dashboard');
      
      // Get page content to verify it's the account dashboard
      const pageData = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasAccountInfo: bodyText.includes('Account') || bodyText.includes('account'),
          hasDashboard: bodyText.includes('Dashboard') || bodyText.includes('dashboard'),
          hasOrders: bodyText.includes('Order') || bodyText.includes('order'),
          bodyLength: bodyText.length
        };
      });
      
      console.log('3. Account dashboard content:', pageData);
    } else if (afterLoginUrl === 'http://localhost:3003/' || afterLoginUrl === 'http://localhost:3003') {
      console.log('⚠️  External user went to root dashboard (should go to /account/dashboard)');
    } else {
      console.log('❌ FAILED: Unexpected redirect to:', afterLoginUrl);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testExternalUser();
