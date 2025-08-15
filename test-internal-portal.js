const puppeteer = require('puppeteer');

async function testInternalPortal() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // First login
    console.log('1. Logging in as ajay@outreachlabs.com...');
    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="email"]', 'ajay@outreachlabs.com');
    await page.type('input[name="password"]', 'FA64!I$nrbCauS^d');
    
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.click('button[type="submit"]');
    await navigationPromise;
    
    console.log('2. Login successful, redirected to:', page.url());
    
    // Now navigate to internal portal
    console.log('3. Navigating to internal portal...');
    await page.goto('http://localhost:3003/internal', { waitUntil: 'networkidle2' });
    
    const currentUrl = page.url();
    console.log('4. Current URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('❌ FAILED: Redirected to login');
    } else {
      console.log('✅ SUCCESS: Accessed internal portal');
      
      // Get page content
      const pageData = await page.evaluate(() => {
        const title = document.title;
        const h1Elements = Array.from(document.querySelectorAll('h1')).map(h => h.innerText);
        const h2Elements = Array.from(document.querySelectorAll('h2')).map(h => h.innerText);
        const bodyText = document.body.innerText;
        
        return {
          title,
          h1Elements,
          h2Elements,
          hasWebsites: bodyText.includes('Websites'),
          hasPublishers: bodyText.includes('Publishers'),
          hasDashboard: bodyText.includes('Dashboard') || bodyText.includes('Internal'),
          bodyLength: bodyText.length
        };
      });
      
      console.log('5. Page data:', pageData);
      
      // Test website management page
      console.log('6. Testing /internal/websites...');
      await page.goto('http://localhost:3003/internal/websites', { waitUntil: 'networkidle2' });
      
      const websitesPageData = await page.evaluate(() => {
        const title = document.title;
        const bodyText = document.body.innerText;
        return {
          title,
          hasWebsitesList: bodyText.includes('domain') || bodyText.includes('Domain'),
          bodyLength: bodyText.length
        };
      });
      
      console.log('7. Websites page data:', websitesPageData);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testInternalPortal();