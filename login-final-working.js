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
    console.log('Navigating to login page...');
    await page.goto('http://localhost:4001/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for form to load
    await delay(2000);
    
    console.log('Clearing and filling credentials...');
    
    // Clear and fill email field
    const emailField = await page.$('input[type="email"]');
    await emailField.click({ clickCount: 3 }); // Triple click to select all
    await page.keyboard.type('ajay@outreachlabs.com');
    
    // Clear and fill password field
    const passwordField = await page.$('input[type="password"]');
    await passwordField.click({ clickCount: 3 }); // Triple click to select all
    await page.keyboard.type('FA64!I$nrbCauS^d');
    
    // Take screenshot before submit
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/before-submit.png',
      fullPage: false
    });
    console.log('Pre-submit screenshot saved');
    
    // Find and click the Sign in button
    console.log('Clicking Sign in button...');
    
    // Try clicking the button
    await page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]');
      if (button) {
        button.click();
        console.log('Button clicked via evaluate');
      }
    });
    
    // Wait for response
    console.log('Waiting for login response...');
    await delay(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Take final screenshot
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png',
      fullPage: false
    });
    console.log('✓ Final screenshot saved!');
    
    // Check page content
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check for success indicators
    if (currentUrl.includes('dashboard') || currentUrl.includes('workflows') || currentUrl.includes('orders')) {
      console.log('✅ LOGIN SUCCESSFUL - Redirected to:', currentUrl);
    } else if (currentUrl === 'http://localhost:4001/login') {
      console.log('⚠️ Still on login page');
      
      // Check for error messages
      if (pageText.includes('Invalid') || pageText.includes('incorrect') || pageText.includes('error')) {
        console.log('❌ Login error detected on page');
      }
    } else {
      console.log('✅ Redirected to:', currentUrl);
    }
    
    // Check for user-specific content
    if (pageText.includes('ajay@outreachlabs.com')) {
      console.log('✅ User email found on page!');
    }
    
    if (pageText.includes('Dashboard') || pageText.includes('Workflows') || pageText.includes('Orders')) {
      console.log('✅ Application content detected!');
    }
    
    // Display page title
    const title = await page.title();
    console.log('Page title:', title);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
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