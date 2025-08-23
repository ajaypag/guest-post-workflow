const puppeteer = require('puppeteer');

async function captureOfferingEditPageAuthenticated() {
  let browser;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport size for consistent screenshots
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1 
    });

    console.log('Step 1: Going to login page...');
    await page.goto('http://localhost:3002/login', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('Login page loaded');

    // Fill in admin credentials
    console.log('Step 2: Filling in admin credentials...');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');

    // Submit login
    console.log('Step 3: Submitting login...');
    await page.click('button[type="submit"]'); // Assuming the Sign In button is a submit button

    // Wait for redirect/login completion
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      console.log('Login completed, navigated to:', page.url());
    } catch (e) {
      console.log('No navigation after login, current URL:', page.url());
    }

    // Now navigate to the target page
    const targetUrl = 'http://localhost:3002/internal/publishers/ed8ecb7d-db1c-46bb-96a0-23150a39aaf1/offerings/f51db3c1-93da-4594-86cb-16a9e6102a37/edit';
    
    console.log('Step 4: Navigating to target page...');
    const response = await page.goto(targetUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    console.log(`Response status: ${response.status()}`);
    console.log(`Final URL: ${page.url()}`);

    // Check if we were still redirected to login
    if (page.url().includes('/login')) {
      console.log('❌ Still redirected to login - authentication may have failed');
      
      // Take a screenshot of login page
      await page.screenshot({
        path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/login-failure-screenshot.png',
        fullPage: true,
        type: 'png'
      });
      
      return;
    }

    // Wait for the page content to load
    console.log('Step 5: Waiting for page content...');
    try {
      await page.waitForSelector('h1', { timeout: 10000 });
      console.log('✅ Page loaded successfully');
    } catch (e) {
      console.log('⚠️  H1 not found within timeout, proceeding anyway');
    }

    // Take the main screenshot
    console.log('Step 6: Taking screenshot...');
    const screenshotPath = '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/offering-edit-authenticated-screenshot.png';
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });

    console.log(`✅ Screenshot saved to: ${screenshotPath}`);

    // Get page information
    const pageTitle = await page.title();
    console.log(`Page Title: ${pageTitle}`);

    // Check for error states
    const hasError = await page.$('.text-red-800, .text-red-600');
    const hasLoader = await page.$('.animate-spin');
    
    if (hasError) {
      console.log('⚠️  Error message detected on page');
    }
    if (hasLoader) {
      console.log('⏳ Loading spinner still visible');
    }

    // Get form data to understand current state
    const pageInfo = await page.evaluate(() => {
      const getInputValue = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.value : null;
      };

      const getText = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() : null;
      };

      return {
        title: getText('h1'),
        hasForm: !!document.querySelector('form'),
        inputCount: document.querySelectorAll('input').length,
        offeringName: getInputValue('input[placeholder*="Premium Guest Post"]') || getInputValue('input[name="offeringName"]'),
        basePrice: getInputValue('input[type="number"][step="0.01"]'),
        turnaroundDays: getInputValue('input[min="1"]'),
        hasErrorMessages: !!document.querySelector('.text-red-800, .text-red-600'),
        hasSuccessMessages: !!document.querySelector('.text-green-800, .text-green-600'),
        currentUrl: window.location.href
      };
    });

    console.log('Page information:', JSON.stringify(pageInfo, null, 2));

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    
    if (error.name === 'TimeoutError') {
      console.error('Timeout occurred. Make sure the development server is running and the page can load.');
    }
    
    // Take an error screenshot
    try {
      await page.screenshot({
        path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/error-screenshot.png',
        fullPage: true,
        type: 'png'
      });
      console.log('Error screenshot saved');
    } catch (e) {
      console.log('Could not save error screenshot');
    }
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the function
captureOfferingEditPageAuthenticated()
  .then(() => {
    console.log('✅ Screenshot capture completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Screenshot capture failed:', error.message);
    process.exit(1);
  });