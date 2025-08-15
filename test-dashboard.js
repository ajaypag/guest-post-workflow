const puppeteer = require('puppeteer');

async function testDashboard() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Login
    console.log('1. Logging in as ajay@outreachlabs.com...');
    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="email"]', 'ajay@outreachlabs.com');
    await page.type('input[name="password"]', 'FA64!I$nrbCauS^d');
    
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.click('button[type="submit"]');
    await navigationPromise;
    
    const afterLoginUrl = page.url();
    console.log('2. After login URL:', afterLoginUrl);
    
    // Check if we're at the root dashboard
    if (afterLoginUrl === 'http://localhost:3003/' || afterLoginUrl === 'http://localhost:3003') {
      console.log('✅ SUCCESS: Internal user redirected to root dashboard');
      
      // Get page content to verify it's the dashboard
      const pageData = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasWorkflows: bodyText.includes('Workflow') || bodyText.includes('workflow'),
          hasQuickActions: bodyText.includes('Quick Actions') || bodyText.includes('New'),
          hasProjects: bodyText.includes('Project') || bodyText.includes('project'),
          bodyLength: bodyText.length
        };
      });
      
      console.log('3. Dashboard content:', pageData);
    } else {
      console.log('❌ FAILED: Unexpected redirect to:', afterLoginUrl);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testDashboard();
