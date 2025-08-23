const puppeteer = require('puppeteer');

async function captureOfferingEditPage() {
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

    const url = 'http://localhost:3002/internal/publishers/ed8ecb7d-db1c-46bb-96a0-23150a39aaf1/offerings/f51db3c1-93da-4594-86cb-16a9e6102a37/edit';
    
    console.log(`Navigating to: ${url}`);
    
    // Navigate to the page with a longer timeout
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    // Wait for the form to be loaded (look for a key element)
    console.log('Waiting for page to load...');
    await page.waitForSelector('h1', { timeout: 30000 });

    // Additional wait to ensure all content is rendered
    await page.waitForTimeout(2000);

    // Take a full page screenshot
    console.log('Taking screenshot...');
    const screenshotPath = '/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/offering-edit-screenshot.png';
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });

    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Get page title and URL for verification
    const pageTitle = await page.title();
    const currentURL = page.url();
    
    console.log(`Page Title: ${pageTitle}`);
    console.log(`Current URL: ${currentURL}`);

    // Check for any error messages or loading states
    const hasError = await page.$('.text-red-800');
    const hasLoader = await page.$('.animate-spin');
    
    if (hasError) {
      console.log('⚠️  Error message detected on page');
    }
    if (hasLoader) {
      console.log('⏳ Loading spinner still visible');
    }

    // Get form data to understand current state
    const formData = await page.evaluate(() => {
      const getInputValue = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.value : 'Not found';
      };

      return {
        offeringName: getInputValue('input[placeholder*="Premium Guest Post"]'),
        basePrice: getInputValue('input[type="number"][step="0.01"]'),
        turnaroundDays: getInputValue('input[min="1"]'),
        status: document.querySelector('select')?.value || 'Not found'
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
captureOfferingEditPage()
  .then(() => {
    console.log('✅ Screenshot capture completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Screenshot capture failed:', error.message);
    process.exit(1);
  });