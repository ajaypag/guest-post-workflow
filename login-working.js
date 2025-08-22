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

    // Find and click Sign In link using XPath
    console.log('Looking for Sign In link...');
    const [signInLink] = await page.$x("//a[contains(text(), 'Sign In')]");
    if (signInLink) {
      console.log('Found Sign In link, clicking...');
      await signInLink.click();
    } else {
      // Try other methods
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const signIn = links.find(link => link.textContent.includes('Sign In') || link.textContent.includes('Sign in'));
        if (signIn) signIn.click();
      });
    }
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    console.log('Current URL after clicking Sign In:', page.url());
    
    // Take screenshot of the current page
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/after-signin-click.png',
      fullPage: false
    });
    console.log('Post-signin-click screenshot saved');

    // Try to find and fill email field
    console.log('Looking for email field...');
    try {
      // Wait for any input field to appear
      await page.waitForSelector('input', { timeout: 5000 });
      
      // Try to type in email field
      const emailField = await page.$('input[type="email"]') || 
                        await page.$('input[name="email"]') || 
                        await page.$('input[type="text"]');
      
      if (emailField) {
        await emailField.type('ajay@outreachlabs.com');
        console.log('Email entered');
      }
      
      // Try to type in password field
      const passwordField = await page.$('input[type="password"]') || 
                           await page.$('input[name="password"]');
      
      if (passwordField) {
        await passwordField.type('FA64!I$nrbCauS^d');
        console.log('Password entered');
      }
      
      // Find and click submit button
      const submitButton = await page.$('button[type="submit"]') || 
                          await page.$('input[type="submit"]');
      
      if (submitButton) {
        console.log('Clicking submit button...');
        await submitButton.click();
        
        // Wait for navigation
        await page.waitForTimeout(5000);
        
        console.log('Login completed, current URL:', page.url());
        
        // Take final screenshot
        await page.screenshot({
          path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png',
          fullPage: false
        });
        console.log('✓ Logged in screenshot saved successfully!');
        
        // Check page content for user info
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.includes('ajay@outreachlabs.com') || pageText.includes('Ajay')) {
          console.log('✓ SUCCESS: User information found on page!');
        }
      }
    } catch (e) {
      console.log('Could not find login form, page might require different authentication flow');
      
      // Take screenshot of current state
      await page.screenshot({
        path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/current-state.png',
        fullPage: false
      });
      console.log('Current state screenshot saved');
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