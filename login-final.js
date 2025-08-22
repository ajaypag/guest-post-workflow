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

    // Navigate to home page
    console.log('Navigating to home page...');
    await page.goto('http://localhost:4001', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Click on "Sign In" link in the navigation
    console.log('Clicking Sign In link...');
    await page.click('a:has-text("Sign In"), a[href*="login"], button:has-text("Sign In")');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    console.log('Current URL after clicking Sign In:', page.url());
    
    // Take screenshot of the login page
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/login-page.png',
      fullPage: false
    });
    console.log('Login page screenshot saved');

    // Try to fill in credentials with various possible selectors
    console.log('Attempting to fill credentials...');
    
    // Try email field
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[id="email"]',
      '#email'
    ];
    
    let emailFilled = false;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.type(selector, 'ajay@outreachlabs.com');
        console.log(`Email filled using selector: ${selector}`);
        emailFilled = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    // Try password field
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[id="password"]',
      '#password'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.type(selector, 'FA64!I$nrbCauS^d');
        console.log(`Password filled using selector: ${selector}`);
        passwordFilled = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (emailFilled && passwordFilled) {
      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'button:has-text("Submit")'
      ];
      
      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`Clicking submit button with selector: ${selector}`);
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
              button.click()
            ]);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      // Wait for login to complete
      await page.waitForTimeout(5000);
      
      console.log('Login completed, current URL:', page.url());
      
      // Take final screenshot
      await page.screenshot({
        path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png',
        fullPage: false
      });
      console.log('Logged in screenshot saved');
      
      // Check if user email appears on page
      const pageContent = await page.content();
      if (pageContent.includes('ajay@outreachlabs.com')) {
        console.log('✓ SUCCESS: User email found on page - login successful!');
      }
      
    } else {
      console.log('Could not find login form fields');
      // Still take a screenshot to see what's on the page
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