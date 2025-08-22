const puppeteer = require('puppeteer');

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

    // First, navigate to home page
    console.log('Navigating to home page...');
    await page.goto('http://localhost:4001', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Take screenshot of home page
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/home-screenshot.png',
      fullPage: false
    });
    console.log('Home page screenshot saved');

    // Look for any login link or button
    console.log('Looking for login elements...');
    
    // Try different selectors for login
    const loginSelectors = [
      'a[href*="signin"]',
      'a[href*="login"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'a:has-text("Sign in")',
      'a:has-text("Login")'
    ];

    let loginFound = false;
    for (const selector of loginSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found login element with selector: ${selector}`);
          await element.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
          loginFound = true;
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }

    // If we're on a login page now, try to login
    if (loginFound || page.url().includes('signin') || page.url().includes('login')) {
      console.log('On login page, attempting to fill credentials...');
      
      // Wait for form fields
      await page.waitForSelector('input[type="email"], input[name="email"], input[type="text"]', { timeout: 5000 });
      
      // Find and fill email field
      const emailField = await page.$('input[type="email"], input[name="email"]') || await page.$('input[type="text"]');
      if (emailField) {
        await emailField.type('ajay@outreachlabs.com');
      }
      
      // Find and fill password field
      const passwordField = await page.$('input[type="password"], input[name="password"]');
      if (passwordField) {
        await passwordField.type('FA64!I$nrbCauS^d');
      }
      
      // Click submit
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        console.log('Clicking submit...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
          submitButton.click()
        ]);
      }
    } else {
      console.log('No login page found, checking if already logged in or if app has different auth flow');
    }

    // Wait a bit for any final loads
    await page.waitForTimeout(3000);

    // Take final screenshot
    const screenshotPath = '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });

    console.log(`Final screenshot saved to: ${screenshotPath}`);
    console.log(`Current URL: ${page.url()}`);
    
    // Get page title and any user info if visible
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Try to find user email or name on page
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('ajay@outreachlabs.com')) {
      console.log('✓ User email found on page - login successful!');
    }

  } catch (error) {
    console.error('Error:', error);
    
    if (browser) {
      const pages = await browser.pages();
      if (pages.length > 0) {
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