const puppeteer = require('puppeteer');

async function testAccountDashboard() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Login as external user
    console.log('1. Logging in as abelino@factbites.com...');
    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="email"]', 'abelino@factbites.com');
    await page.type('input[name="password"]', 'zKz2OQgCKN!4yZI4');
    
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for login
    
    console.log('2. Manually navigating to /account/dashboard...');
    await page.goto('http://localhost:3003/account/dashboard', { waitUntil: 'networkidle2' });
    
    const dashboardUrl = page.url();
    console.log('3. Current URL:', dashboardUrl);
    
    if (dashboardUrl.includes('/account/dashboard')) {
      console.log('✅ SUCCESS: Account dashboard accessible');
      
      const pageData = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasContent: bodyText.length > 100,
          bodyPreview: bodyText.substring(0, 200)
        };
      });
      
      console.log('4. Dashboard content:', pageData);
    } else if (dashboardUrl.includes('/login')) {
      console.log('❌ FAILED: Redirected to login (not authenticated)');
    } else {
      console.log('❌ FAILED: Unexpected redirect to:', dashboardUrl);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testAccountDashboard();
