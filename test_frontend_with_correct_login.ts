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

async function testFrontendWithCorrectLogin() {
  log(COLORS.BOLD + COLORS.BLUE, '🧪 TESTING FRONTEND PUBLISHER DISPLAY WITH CORRECT LOGIN');
  log(COLORS.BLUE, '=' .repeat(60));
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Launch browser (visible for debugging)
    log(COLORS.YELLOW, '🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: false, // Keep visible for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 500 // Slow down for easier viewing
    });
    
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Set longer timeout
    page.setDefaultTimeout(10000);
    
    // Navigate to login page
    log(COLORS.YELLOW, '🔐 Navigating to /login page...');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: '/tmp/login_page_correct.png' });
    log(COLORS.GREEN, '📸 Login page screenshot saved: /tmp/login_page_correct.png');
    
    // Find and fill email field carefully
    log(COLORS.YELLOW, '📧 Looking for email input field...');
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]', 
      'input[placeholder*="email" i]',
      'input[id="email"]',
      '#email'
    ];
    
    let emailField = null;
    for (const selector of emailSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        emailField = page.locator(selector).first();
        log(COLORS.GREEN, `✅ Found email field with selector: ${selector}`);
        break;
      }
    }
    
    if (!emailField) {
      // List all input fields for debugging
      const allInputs = await page.locator('input').all();
      log(COLORS.YELLOW, `📋 Found ${allInputs.length} input fields:`);
      for (let i = 0; i < allInputs.length; i++) {
        const type = await allInputs[i].getAttribute('type') || 'text';
        const name = await allInputs[i].getAttribute('name') || '';
        const placeholder = await allInputs[i].getAttribute('placeholder') || '';
        const id = await allInputs[i].getAttribute('id') || '';
        log(COLORS.YELLOW, `   Input ${i + 1}: type="${type}", name="${name}", id="${id}", placeholder="${placeholder}"`);
      }
      
      // Try using the first text/email input as email field
      if (allInputs.length > 0) {
        log(COLORS.YELLOW, '🔧 Attempting to use first input as email field...');
        emailField = page.locator('input').first();
      } else {
        // Show page content for debugging
        const pageContent = await page.content();
        log(COLORS.YELLOW, '📄 Page content length:', pageContent.length);
        log(COLORS.YELLOW, '🔍 Page title:', await page.title());
        
        // Wait longer and try again
        log(COLORS.YELLOW, '⏳ Waiting 3 seconds and trying again...');
        await page.waitForTimeout(3000);
        
        const inputsAfterWait = await page.locator('input').count();
        log(COLORS.YELLOW, `📋 Inputs after wait: ${inputsAfterWait}`);
        
        if (inputsAfterWait === 0) {
          throw new Error('No input fields found on login page - page may not have loaded correctly');
        }
        
        emailField = page.locator('input').first();
      }
    }
    
    // Fill email field carefully
    log(COLORS.YELLOW, '📧 Filling email field...');
    await emailField.click();
    await emailField.fill('ajay@outreachlabs.com');
    
    // Find and fill password field
    log(COLORS.YELLOW, '🔒 Looking for password input field...');
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      '#password'
    ];
    
    let passwordField = null;
    for (const selector of passwordSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        passwordField = page.locator(selector).first();
        log(COLORS.GREEN, `✅ Found password field with selector: ${selector}`);
        break;
      }
    }
    
    if (!passwordField) {
      throw new Error('Could not find password input field');
    }
    
    // Fill password field carefully
    log(COLORS.YELLOW, '🔒 Filling password field...');
    await passwordField.click();
    await passwordField.fill('FA64!I$nrbCauS^d');
    
    // Find and click submit button
    log(COLORS.YELLOW, '🔘 Looking for submit button...');
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Log in")'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        submitButton = page.locator(selector).first();
        log(COLORS.GREEN, `✅ Found submit button with selector: ${selector}`);
        break;
      }
    }
    
    if (!submitButton) {
      throw new Error('Could not find submit button');
    }
    
    // Take screenshot before submitting
    await page.screenshot({ path: '/tmp/login_form_filled.png' });
    log(COLORS.GREEN, '📸 Filled form screenshot saved: /tmp/login_form_filled.png');
    
    // Submit the form
    log(COLORS.YELLOW, '🚀 Submitting login form...');
    await submitButton.click();
    
    // Wait for navigation or error
    try {
      await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });
      log(COLORS.GREEN, '✅ Login successful - redirected away from login page');
    } catch (error) {
      log(COLORS.YELLOW, '⚠️  Login redirect timeout, checking current page...');
      const currentUrl = page.url();
      log(COLORS.YELLOW, `Current URL: ${currentUrl}`);
      
      // Check for error messages
      const errorText = await page.locator('.error, .alert-error, [role="alert"]').textContent().catch(() => null);
      if (errorText) {
        log(COLORS.RED, `❌ Login error: ${errorText}`);
      }
    }
    
    // Navigate to our test order
    const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
    log(COLORS.YELLOW, `📋 Navigating to order page: ${orderId.slice(0, 8)}...`);
    await page.goto(`http://localhost:3003/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    
    // Check if we successfully reached the order page
    const pageTitle = await page.locator('h1').textContent().catch(() => null);
    if (pageTitle && pageTitle.includes('Order #')) {
      log(COLORS.GREEN, `✅ Successfully accessed order page: ${pageTitle}`);
    } else {
      log(COLORS.RED, '❌ Could not access order page');
      await page.screenshot({ path: '/tmp/order_access_failed.png' });
      return;
    }
    
    // NOW TEST THE PUBLISHER DISPLAY
    log(COLORS.BOLD + COLORS.YELLOW, '\n🔍 TESTING PUBLISHER DISPLAY FUNCTIONALITY');
    log(COLORS.YELLOW, '=' .repeat(50));
    
    // Check for LineItemsDisplay table
    const tables = await page.locator('table').count();
    log(COLORS.GREEN, `📊 Found ${tables} tables on the page`);
    
    if (tables === 0) {
      log(COLORS.RED, '❌ No tables found - line items may not be displaying');
      await page.screenshot({ path: '/tmp/no_tables_found.png' });
      return;
    }
    
    // Look for table headers
    const allHeaders = await page.locator('th').allTextContents();
    log(COLORS.GREEN, `📋 Table headers found: ${allHeaders.join(', ')}`);
    
    // Check specifically for Publisher header
    const publisherHeaderCount = await page.locator('th:has-text("Publisher")').count();
    if (publisherHeaderCount > 0) {
      log(COLORS.GREEN, '✅ Publisher column header found!');
    } else {
      log(COLORS.RED, '❌ Publisher column header NOT found');
      log(COLORS.YELLOW, '💡 This means the publisher column is not showing for internal users');
    }
    
    // Check for line items rows
    const lineItemRows = await page.locator('tbody tr').count();
    log(COLORS.GREEN, `📊 Found ${lineItemRows} line item rows`);
    
    if (lineItemRows > 0) {
      // Get content of first few rows to see what's displaying
      for (let i = 0; i < Math.min(lineItemRows, 2); i++) {
        const rowCells = await page.locator(`tbody tr:nth-child(${i + 1}) td`).allTextContents();
        log(COLORS.GREEN, `📋 Row ${i + 1} cells: ${rowCells.join(' | ')}`);
      }
    } else {
      log(COLORS.YELLOW, '⚠️  No line items found in table body');
    }
    
    // Check user type (this affects whether publisher column shows)
    const userInfo = await page.evaluate(() => {
      // Try to find user info in the page
      const userElements = document.querySelectorAll('[data-user-type], .user-type, .internal-user');
      return Array.from(userElements).map(el => el.textContent || el.getAttribute('data-user-type'));
    });
    
    if (userInfo.length > 0) {
      log(COLORS.GREEN, `👤 User info found: ${userInfo.join(', ')}`);
    } else {
      log(COLORS.YELLOW, '⚠️  Could not detect user type info');
    }
    
    // Take final screenshot
    await page.screenshot({ path: '/tmp/order_page_final_test.png', fullPage: true });
    log(COLORS.GREEN, '📸 Final order page screenshot saved: /tmp/order_page_final_test.png');
    
    // Keep browser open for manual inspection
    log(COLORS.YELLOW, '👀 Keeping browser open for 30 seconds for manual inspection...');
    log(COLORS.YELLOW, '   - Check if the Publisher column is visible');
    log(COLORS.YELLOW, '   - Check if publisher data is showing in cells');
    log(COLORS.YELLOW, '   - Verify you are logged in as internal user');
    
    await page.waitForTimeout(30000);
    
    log(COLORS.BOLD + COLORS.GREEN, '\n🎉 Frontend publisher display test completed!');
    
  } catch (error) {
    log(COLORS.RED, `❌ Frontend test failed: ${error.message}`);
    
    if (page) {
      await page.screenshot({ path: '/tmp/frontend_test_error_detailed.png' });
      log(COLORS.YELLOW, '📸 Error screenshot saved: /tmp/frontend_test_error_detailed.png');
    }
  } finally {
    if (browser) {
      await browser.close();
      log(COLORS.BLUE, '🔒 Browser closed');
    }
  }
}

if (require.main === module) {
  testFrontendWithCorrectLogin().catch(console.error);
}