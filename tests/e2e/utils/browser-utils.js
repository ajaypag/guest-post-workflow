/**
 * Browser Utilities for E2E Testing
 * Puppeteer browser management and automation helpers
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let browser = null;
let config = {
  headless: true,
  viewport: { width: 1280, height: 720 },
  screenshotDir: path.join(__dirname, '../reports/screenshots')
};

/**
 * Initialize and configure browser instance
 * @param {Object} testConfig - Test configuration options
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
async function setupBrowser(testConfig = {}) {
  config = { ...config, ...testConfig };
  
  console.log(`🌐 Setting up browser (headless: ${config.headless})...`);
  
  try {
    browser = await puppeteer.launch({
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      defaultViewport: config.viewport
    });
    
    console.log('✅ Browser initialized successfully');
    return browser;
    
  } catch (error) {
    console.error('❌ Failed to initialize browser:', error.message);
    throw error;
  }
}

/**
 * Get the current browser instance
 * @returns {Browser} Current browser instance
 */
function getBrowser() {
  if (!browser) {
    throw new Error('Browser not initialized. Call setupBrowser() first.');
  }
  return browser;
}

/**
 * Create a new browser page with standard configuration
 * @returns {Promise<Page>} Configured page instance
 */
async function createPage() {
  const browserInstance = getBrowser();
  const page = await browserInstance.newPage();
  
  // Set viewport
  await page.setViewport(config.viewport);
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Configure page settings
  await page.setDefaultNavigationTimeout(30000);
  await page.setDefaultTimeout(10000);
  
  // Enable request interception for debugging
  if (process.env.VERBOSE) {
    await page.setRequestInterception(true);
    
    page.on('request', (req) => {
      if (req.url().includes('/api/')) {
        console.log(`🌐 API Request: ${req.method()} ${req.url()}`);
      }
      req.continue();
    });
    
    page.on('response', (res) => {
      if (res.url().includes('/api/')) {
        console.log(`📡 API Response: ${res.status()} ${res.url()}`);
      }
    });
  }
  
  return page;
}

/**
 * Capture screenshot with timestamp and description
 * @param {Page} page - Puppeteer page instance
 * @param {string} name - Screenshot name/description
 * @param {Object} options - Screenshot options
 * @returns {Promise<string>} Screenshot file path
 */
async function captureScreenshot(page, name, options = {}) {
  try {
    // Ensure screenshot directory exists
    if (!fs.existsSync(config.screenshotDir)) {
      fs.mkdirSync(config.screenshotDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${name}.png`;
    const filepath = path.join(config.screenshotDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      ...options
    });
    
    if (process.env.VERBOSE) {
      console.log(`📸 Screenshot saved: ${filename}`);
    }
    
    return filepath;
    
  } catch (error) {
    console.error(`❌ Failed to capture screenshot ${name}:`, error.message);
    return null;
  }
}

/**
 * Wait for element with enhanced error reporting
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {Object} options - Wait options
 * @returns {Promise<ElementHandle>} Element handle
 */
async function waitForElement(page, selector, options = {}) {
  const defaultOptions = {
    timeout: 10000,
    visible: true
  };
  
  const waitOptions = { ...defaultOptions, ...options };
  
  try {
    const element = await page.waitForSelector(selector, waitOptions);
    return element;
  } catch (error) {
    // Capture screenshot on failure
    await captureScreenshot(page, `element-wait-failed-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
    
    console.error(`❌ Failed to find element: ${selector}`);
    throw new Error(`Element not found: ${selector} (timeout: ${waitOptions.timeout}ms)`);
  }
}

/**
 * Safe click with wait and error handling
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {Object} options - Click options
 * @returns {Promise<boolean>} Success status
 */
async function safeClick(page, selector, options = {}) {
  try {
    await waitForElement(page, selector, { timeout: options.timeout || 10000 });
    await page.click(selector);
    return true;
  } catch (error) {
    console.error(`❌ Failed to click element: ${selector}`);
    await captureScreenshot(page, `click-failed-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
    return false;
  }
}

/**
 * Safe type with wait and clear
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {string} text - Text to type
 * @param {Object} options - Type options
 * @returns {Promise<boolean>} Success status
 */
async function safeType(page, selector, text, options = {}) {
  try {
    await waitForElement(page, selector, { timeout: options.timeout || 10000 });
    
    // Clear existing text
    await page.click(selector, { clickCount: 3 });
    
    // Type new text
    await page.type(selector, text, { delay: options.delay || 50 });
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to type in element: ${selector}`);
    await captureScreenshot(page, `type-failed-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
    return false;
  }
}

/**
 * Wait for navigation with timeout
 * @param {Page} page - Puppeteer page instance
 * @param {Object} options - Navigation options
 * @returns {Promise<Response>} Navigation response
 */
async function waitForNavigation(page, options = {}) {
  const defaultOptions = {
    waitUntil: 'networkidle2',
    timeout: 30000
  };
  
  return page.waitForNavigation({ ...defaultOptions, ...options });
}

/**
 * Get page console errors and warnings
 * @param {Page} page - Puppeteer page instance
 * @returns {Array} Console messages
 */
function getConsoleMessages(page) {
  const messages = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      messages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  return messages;
}

/**
 * Check if element exists without waiting
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @returns {Promise<boolean>} Element existence
 */
async function elementExists(page, selector) {
  try {
    const element = await page.$(selector);
    return !!element;
  } catch (error) {
    return false;
  }
}

/**
 * Get element text content safely
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @returns {Promise<string|null>} Element text content
 */
async function getElementText(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) return null;
    
    const text = await page.evaluate(el => el.textContent, element);
    return text;
  } catch (error) {
    console.error(`❌ Failed to get text from element: ${selector}`);
    return null;
  }
}

/**
 * Close browser and cleanup resources
 * @returns {Promise<void>}
 */
async function closeBrowser() {
  if (browser) {
    console.log('🧹 Closing browser...');
    await browser.close();
    browser = null;
    console.log('✅ Browser closed');
  }
}

/**
 * Create a new incognito context for isolated testing
 * @returns {Promise<BrowserContext>} Incognito browser context
 */
async function createIncognitoContext() {
  const browserInstance = getBrowser();
  const context = await browserInstance.createIncognitoBrowserContext();
  return context;
}

module.exports = {
  setupBrowser,
  getBrowser,
  createPage,
  captureScreenshot,
  waitForElement,
  safeClick,
  safeType,
  waitForNavigation,
  getConsoleMessages,
  elementExists,
  getElementText,
  closeBrowser,
  createIncognitoContext
};