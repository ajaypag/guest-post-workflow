const puppeteer = require('puppeteer');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  let browser;
  try {
    // Launch browser
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate directly to local login page
    console.log('Navigating directly to local login page...');
    await page.goto('http://localhost:4001/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Current URL:', page.url());
    
    // Take screenshot of the login page
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/login-page-direct.png',
      fullPage: false
    });
    console.log('Login page screenshot saved');

    // Wait for form elements to load
    await delay(2000);
    
    // Try to find email and password fields
    console.log('Looking for login form fields...');
    
    // Get all inputs on the page
    const inputs = await page.evaluate(() => {
      const inputElements = document.querySelectorAll('input');
      return Array.from(inputElements).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder
      }));
    });
    
    console.log('Found inputs:', inputs);
    
    // Try to fill form if fields exist
    const emailInput = await page.$('input[type="email"], input[name="email"], input[type="text"]:not([type="password"])');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    
    if (emailInput && passwordInput) {
      console.log('Found login fields, filling credentials...');
      
      await emailInput.click();
      await page.keyboard.type('ajay@outreachlabs.com');
      
      await passwordInput.click();
      await page.keyboard.type('FA64!I$nrbCauS^d');
      
      // Look for submit button
      const submitButton = await page.$('button[type="submit"], input[type="submit"], button');
      
      if (submitButton) {
        console.log('Clicking submit button...');
        
        // Click and wait for navigation
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
            console.log('Navigation timeout, continuing...');
          }),
          submitButton.click()
        ]);
        
        // Additional wait
        await delay(3000);
        
        console.log('After login URL:', page.url());
        
        // Take screenshot after login
        await page.screenshot({
          path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png',
          fullPage: false
        });
        console.log('✓ Logged in screenshot saved!');
        
        // Check for user info
        const pageContent = await page.evaluate(() => document.body.innerText);
        if (pageContent.includes('ajay@outreachlabs.com') || pageContent.includes('Dashboard')) {
          console.log('✓ LOGIN SUCCESSFUL!');
        }
      }
    } else {
      console.log('Login form not found at /login, checking page content...');
      
      // Get page content for debugging
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);
      
      // Check page text
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Page contains:', pageText.substring(0, 200));
      
      // Save current state
      await page.screenshot({
        path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/current-page.png',
        fullPage: false
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    
    if (browser) {
      const pages = await browser.pages();
      if (pages.length > 0) {
        const currentUrl = pages[0].url();
        console.log('Error occurred at URL:', currentUrl);
        
        await pages[0].screenshot({
          path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/error-screenshot.png',
          fullPage: false
        });
        console.log('Error screenshot saved');
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();