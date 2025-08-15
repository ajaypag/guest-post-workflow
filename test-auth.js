const puppeteer = require('puppeteer');

async function testAuth() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable request interception to capture cookies
    await page.setRequestInterception(true);
    const cookies = [];
    
    page.on('request', request => {
      request.continue();
    });
    
    page.on('response', response => {
      const headers = response.headers();
      if (headers['set-cookie']) {
        console.log('Cookie set:', headers['set-cookie']);
      }
    });
    
    // Go to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Fill in credentials
    console.log('2. Entering credentials for ajay@outreachlabs.com...');
    await page.type('input[name="email"]', 'ajay@outreachlabs.com');
    await page.type('input[name="password"]', 'FA64!I$nrbCauS^d');
    
    // Submit form
    console.log('3. Submitting login form...');
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.click('button[type="submit"]');
    await navigationPromise;
    
    // Check where we got redirected
    const afterLoginUrl = page.url();
    console.log('4. After login URL:', afterLoginUrl);
    
    // Get all cookies after login
    const sessionCookies = await page.cookies();
    console.log('5. Session cookies:', sessionCookies.map(c => c.name));
    
    // Now test internal portal
    console.log('6. Navigating to /internal...');
    await page.goto('http://localhost:3000/internal', { waitUntil: 'networkidle2' });
    const internalUrl = page.url();
    console.log('7. Internal page URL:', internalUrl);
    
    // Check if we got redirected back to login (unauthorized)
    if (internalUrl.includes('/login')) {
      console.log('❌ FAILED: Redirected to login - not authorized as internal user');
      
      // Try to check what the session thinks
      const response = await page.goto('http://localhost:3000/api/auth/session');
      const sessionData = await response.json();
      console.log('Session data:', sessionData);
    } else {
      console.log('✅ SUCCESS: Accessed internal portal');
      
      // Get page content
      const pageContent = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        return {
          h1: h1 ? h1.innerText : null,
          h2: h2 ? h2.innerText : null,
          hasWebsiteStats: document.body.innerText.includes('Website'),
          hasPublisherStats: document.body.innerText.includes('Publisher')
        };
      });
      console.log('Page content:', pageContent);
    }
    
  } catch (error) {
    console.error('Error during auth test:', error);
  } finally {
    await browser.close();
  }
}

testAuth();