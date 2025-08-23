const puppeteer = require('puppeteer');

async function captureOfferingEditPageWithAuth() {
  let browser;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless, false to see what's happening
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
      timeout: 60000 
    });

    // Wait for login page to load
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('Login page loaded');

    // Try to determine if we can programmatically login or if there's a test account
    // Let's first take a screenshot of the login page to see what we're working with
    await page.screenshot({
      path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/login-page-screenshot.png',
      fullPage: true,
      type: 'png'
    });
    console.log('Login page screenshot saved');

    // Check if there are any test credentials or demo login options
    const pageContent = await page.content();
    
    // Look for any hints about test accounts
    if (pageContent.includes('demo') || pageContent.includes('test') || pageContent.includes('admin@')) {
      console.log('Found potential test account indicators');
    }

    // For now, let's try to access the page directly and see what happens
    const targetUrl = 'http://localhost:3002/internal/publishers/ed8ecb7d-db1c-46bb-96a0-23150a39aaf1/offerings/f51db3c1-93da-4594-86cb-16a9e6102a37/edit';
    
    console.log(`Step 2: Attempting to navigate to target URL: ${targetUrl}`);
    const response = await page.goto(targetUrl, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    console.log(`Response status: ${response.status()}`);
    console.log(`Final URL: ${page.url()}`);

    // Check if we were redirected back to login
    if (page.url().includes('/login')) {
      console.log('❌ Redirected to login - authentication required');
      
      // Take a screenshot of what we see
      await page.screenshot({
        path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/auth-redirect-screenshot.png',
        fullPage: true,
        type: 'png'
      });
      
      console.log('Auth redirect screenshot saved');
      return;
    }

    // If we made it here, check if the page loaded properly
    const hasError = await page.$('.text-red-800');
    const hasLoader = await page.$('.animate-spin');
    const hasH1 = await page.$('h1');
    
    if (!hasH1) {
      console.log('❌ No h1 element found - page may not have loaded correctly');
      
      // Take a screenshot of what we got
      await page.screenshot({
        path: '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/error-page-screenshot.png',
        fullPage: true,
        type: 'png'
      });
      
      return;
    }

    if (hasError) {
      console.log('⚠️  Error message detected on page');
    }
    if (hasLoader) {
      console.log('⏳ Loading spinner still visible');
    }

    // Take the main screenshot
    console.log('Step 3: Taking screenshot...');
    const screenshotPath = '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/offering-edit-screenshot.png';
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });

    console.log(`✅ Screenshot saved to: ${screenshotPath}`);

    // Get page information
    const pageTitle = await page.title();
    console.log(`Page Title: ${pageTitle}`);

    // Get form data to understand current state
    const formData = await page.evaluate(() => {
      const getInputValue = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.value : 'Not found';
      };

      return {
        offeringName: getInputValue('input[placeholder*="Premium Guest Post"]') || getInputValue('input[name="offeringName"]'),
        basePrice: getInputValue('input[type="number"][step="0.01"]'),
        turnaroundDays: getInputValue('input[min="1"]'),
        hasForm: !!document.querySelector('form'),
        hasInputs: document.querySelectorAll('input').length
      };
    });

    console.log('Form data detected:', formData);

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    
    if (error.name === 'TimeoutError') {
      console.error('The page took too long to load. Make sure the development server is running at localhost:3002');
    }
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the function
captureOfferingEditPageWithAuth()
  .then(() => {
    console.log('✅ Screenshot capture process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Screenshot capture failed:', error.message);
    process.exit(1);
  });