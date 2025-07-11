const puppeteer = require('puppeteer');

async function testSimple() {
  console.log('Starting simple test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 200,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    // Wait a bit to see what loads
    await page.waitForTimeout(3000);
    
    console.log('2. Taking screenshot...');
    await page.screenshot({ path: 'login-page.png' });
    
    console.log('3. Logging in...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(5000);
    
    console.log('4. Taking screenshot after login...');
    await page.screenshot({ path: 'after-login.png' });
    
    // Check what's on the page
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page content:', pageText.substring(0, 500));
    
    // Look for any workflow-related buttons
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => btn.textContent.trim()).filter(text => text.includes('Workflow') || text.includes('Create'))
    );
    console.log('Found buttons:', buttons);
    
    // Look for any links that might lead to workflows
    const links = await page.$$eval('a', links => 
      links.map(link => link.textContent.trim()).filter(text => text.includes('Workflow') || text.includes('Create'))
    );
    console.log('Found links:', links);
    
    // Keep browser open for 10 seconds to see what's happening
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testSimple();