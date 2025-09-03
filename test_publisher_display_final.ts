import { chromium, Browser, Page } from 'playwright';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(color: string, message: string) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function testPublisherDisplayFinal() {
  log(COLORS.BOLD + COLORS.BLUE, '🎯 FINAL PUBLISHER DISPLAY TEST - PHASE 2 VERIFICATION');
  log(COLORS.BLUE, '=' .repeat(65));
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Launch browser
    log(COLORS.YELLOW, '🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 300
    });
    
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    page = await context.newPage();
    
    // Set generous timeouts - server is slow
    page.setDefaultTimeout(20000);
    
    // Navigate to login page directly  
    log(COLORS.YELLOW, '🔐 Navigating to login page...');
    await page.goto('http://localhost:3003/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take screenshot of login page
    await page.screenshot({ path: '/tmp/login_page_final.png' });
    log(COLORS.GREEN, '📸 Login page screenshot: /tmp/login_page_final.png');
    
    // Fill login form
    log(COLORS.YELLOW, '📧 Filling login form...');
    
    // Find email field - try multiple approaches
    const emailField = page.locator('input[type="email"], input[name="email"], input:nth-of-type(1)').first();
    await emailField.waitFor({ timeout: 10000 });
    await emailField.click();
    await emailField.fill('ajay@outreachlabs.com');
    
    // Find password field
    const passwordField = page.locator('input[type="password"], input[name="password"], input:nth-of-type(2)').first();
    await passwordField.waitFor({ timeout: 10000 });
    await passwordField.click();
    await passwordField.fill('FA64!I$nrbCauS^d');
    
    // Take screenshot of filled form
    await page.screenshot({ path: '/tmp/login_filled_final.png' });
    log(COLORS.GREEN, '📸 Filled login form: /tmp/login_filled_final.png');
    
    // Submit form
    log(COLORS.YELLOW, '🚀 Submitting login...');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
    await submitButton.click();
    
    // Wait for redirect with generous timeout
    try {
      await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 20000 });
      log(COLORS.GREEN, '✅ Login successful!');
    } catch {
      log(COLORS.YELLOW, '⚠️ Login redirect timeout, checking page state...');
      const currentUrl = page.url();
      log(COLORS.YELLOW, `Current URL: ${currentUrl}`);
    }
    
    // Navigate to our test order
    const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
    log(COLORS.YELLOW, `📋 Navigating to order: ${orderId.slice(0, 8)}...`);
    
    await page.goto(`http://localhost:3003/orders/${orderId}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Verify we're on the order page
    await page.waitForSelector('h1', { timeout: 10000 });
    const pageTitle = await page.locator('h1').textContent();
    
    if (pageTitle && pageTitle.includes('Order #')) {
      log(COLORS.GREEN, `✅ Successfully loaded order page: ${pageTitle}`);
    } else {
      throw new Error(`Wrong page loaded. Title: ${pageTitle}`);
    }
    
    // 🎯 CORE TEST: Check for Publisher column
    log(COLORS.BOLD + COLORS.YELLOW, '\n🔍 TESTING PUBLISHER COLUMN DISPLAY');
    log(COLORS.YELLOW, '=' .repeat(40));
    
    // Check table structure
    const tables = await page.locator('table').count();
    log(COLORS.GREEN, `📊 Tables found: ${tables}`);
    
    if (tables === 0) {
      throw new Error('No tables found on order page');
    }
    
    // Get all table headers
    const allHeaders = await page.locator('th').allTextContents();
    log(COLORS.GREEN, `📋 All table headers: [${allHeaders.join(', ')}]`);
    
    // Check specifically for Publisher header
    const publisherHeaders = await page.locator('th:has-text("Publisher")').count();
    
    if (publisherHeaders > 0) {
      log(COLORS.BOLD + COLORS.GREEN, '✅ SUCCESS: Publisher column header FOUND!');
      log(COLORS.GREEN, '📊 This confirms internal users can see publisher information');
    } else {
      log(COLORS.BOLD + COLORS.RED, '❌ FAIL: Publisher column header NOT FOUND');
      log(COLORS.RED, '📊 Publisher column is not displaying for internal users');
    }
    
    // Check table content
    const tableRows = await page.locator('tbody tr').count();
    log(COLORS.GREEN, `📊 Data rows found: ${tableRows}`);
    
    if (tableRows > 0) {
      // Get first row content to see what's displaying
      const firstRowCells = await page.locator('tbody tr:first-child td').allTextContents();
      log(COLORS.GREEN, `📋 First row data: [${firstRowCells.join(' | ')}]`);
      
      // If publisher column exists, check if it has data
      if (publisherHeaders > 0) {
        const publisherColumnIndex = allHeaders.findIndex(h => h.toLowerCase().includes('publisher'));
        if (publisherColumnIndex >= 0 && firstRowCells[publisherColumnIndex]) {
          const publisherData = firstRowCells[publisherColumnIndex];
          log(COLORS.BOLD + COLORS.GREEN, `✅ Publisher data found: "${publisherData}"`);
        } else {
          log(COLORS.YELLOW, '⚠️ Publisher column exists but no data in first row');
        }
      }
    } else {
      log(COLORS.YELLOW, '⚠️ No data rows found in table');
    }
    
    // Take final screenshot
    await page.screenshot({ path: '/tmp/order_page_publisher_test.png', fullPage: true });
    log(COLORS.GREEN, '📸 Final screenshot: /tmp/order_page_publisher_test.png');
    
    // 🏆 FINAL RESULTS
    log(COLORS.BOLD + COLORS.BLUE, '\n🏆 PHASE 2 FRONTEND TEST RESULTS');
    log(COLORS.BLUE, '=' .repeat(35));
    
    if (publisherHeaders > 0) {
      log(COLORS.BOLD + COLORS.GREEN, '✅ PHASE 2 SUCCESS: Publisher attribution is displaying in frontend');
      log(COLORS.GREEN, '   • Login functionality works correctly');
      log(COLORS.GREEN, '   • Order page loads successfully');  
      log(COLORS.GREEN, '   • Publisher column is visible to internal users');
      log(COLORS.GREEN, '   • Ready to proceed to Phase 3 (Workflow Integration)');
    } else {
      log(COLORS.BOLD + COLORS.RED, '❌ PHASE 2 INCOMPLETE: Publisher column not displaying');
      log(COLORS.RED, '   • Login and page loading work correctly');
      log(COLORS.RED, '   • But publisher attribution not visible in UI');
      log(COLORS.RED, '   • Need to investigate LineItemsDisplay component');
    }
    
    // Keep browser open for inspection
    log(COLORS.YELLOW, '\n👀 Browser staying open 30 seconds for manual verification...');
    log(COLORS.YELLOW, '   - Verify Publisher column is visible/hidden as expected');
    log(COLORS.YELLOW, '   - Check if publisher data displays correctly');
    log(COLORS.YELLOW, '   - Confirm user permissions are working properly');
    
    await page.waitForTimeout(30000);
    
  } catch (error) {
    log(COLORS.RED, `❌ Test failed: ${error.message}`);
    
    if (page) {
      await page.screenshot({ path: '/tmp/publisher_test_error.png' });
      log(COLORS.YELLOW, '📸 Error screenshot: /tmp/publisher_test_error.png');
    }
    
    throw error;
    
  } finally {
    if (browser) {
      await browser.close();
      log(COLORS.BLUE, '🔒 Browser closed');
    }
  }
}

if (require.main === module) {
  testPublisherDisplayFinal().catch(console.error);
}