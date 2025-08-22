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

    // Wait for form to load
    await delay(2000);
    
    console.log('Filling in credentials...');
    
    // Clear and type email
    await page.click('input[type="email"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('ajay@outreachlabs.com');
    
    // Clear and type password
    await page.click('input[type="password"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('FA64!I$nrbCauS^d');
    
    // Take screenshot before submit
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/before-submit.png',
      fullPage: false
    });
    console.log('Pre-submit screenshot saved');
    
    // Click the Sign in button
    console.log('Clicking Sign in button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error message
    console.log('Waiting for login to process...');
    
    // Try multiple approaches to detect successful login
    await Promise.race([
      // Wait for URL change
      page.waitForFunction(
        () => !window.location.href.includes('/login'),
        { timeout: 10000 }
      ).catch(() => {}),
      // Wait for specific element that appears after login
      page.waitForSelector('.dashboard, [data-dashboard], #dashboard', { timeout: 10000 }).catch(() => {}),
      // Just wait a fixed time
      delay(8000)
    ]);
    
    // Additional wait to ensure page is loaded
    await delay(2000);
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    // Take screenshot after login attempt
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png',
      fullPage: false
    });
    console.log('✓ Post-login screenshot saved!');
    
    // Check for successful login indicators
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    if (finalUrl !== 'http://localhost:4001/login') {
      console.log('✅ SUCCESS: Redirected from login page!');
    }
    
    if (pageContent.includes('ajay@outreachlabs.com') || 
        pageContent.includes('Dashboard') ||
        pageContent.includes('Workflows') ||
        pageContent.includes('Orders')) {
      console.log('✅ SUCCESS: User content found on page!');
    }
    
    // Check for error messages
    if (pageContent.includes('Invalid') || pageContent.includes('incorrect')) {
      console.log('❌ Login failed - error message detected');
    }
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);

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