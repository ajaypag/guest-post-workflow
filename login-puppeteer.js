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

    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:4001/auth/signin', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for and fill email field
    console.log('Waiting for login form...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    console.log('Filling in credentials...');
    await page.type('input[type="email"], input[name="email"]', 'ajay@outreachlabs.com');
    await page.type('input[type="password"], input[name="password"]', 'FA64!I$nrbCauS^d');

    // Click submit button
    console.log('Clicking submit button...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    // Wait a bit for any redirects or page loads
    await page.waitForTimeout(3000);

    // Take screenshot
    const screenshotPath = '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/bug-fixing/logged-in-screenshot.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });

    console.log(`Screenshot saved to: ${screenshotPath}`);
    console.log(`Current URL: ${page.url()}`);
    
    // Get page title for verification
    const title = await page.title();
    console.log(`Page title: ${title}`);

  } catch (error) {
    console.error('Error during login:', error);
    
    if (browser) {
      const page = (await browser.pages())[0];
      if (page) {
        await page.screenshot({
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