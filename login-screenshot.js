const { chromium } = require('playwright');

(async () => {
  // Launch browser
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:4001/auth/signin', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for login form to be visible
    await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 10000 });
    
    // Fill in login credentials
    console.log('Filling in credentials...');
    await page.fill('input[name="email"], input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"], input[type="password"]', 'FA64!I$nrbCauS^d');
    
    // Click login button
    console.log('Clicking submit button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    console.log('Waiting for login to complete...');
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
      console.log('Dashboard URL not found, checking for any redirect...');
    });
    
    // Additional wait to ensure page is fully loaded
    await page.waitForTimeout(3000);
    
    // Take screenshot
    const screenshotPath = '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: false 
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
    console.log(`Current URL: ${page.url()}`);
    
  } catch (error) {
    console.error('Error during login:', error);
    
    // Take error screenshot
    await page.screenshot({ 
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/error-screenshot.png',
      fullPage: false 
    });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
})();