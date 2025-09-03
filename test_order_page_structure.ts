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

async function testOrderPageStructure() {
  log(COLORS.BOLD + COLORS.BLUE, '🔍 EXAMINING ORDER PAGE STRUCTURE');
  log(COLORS.BLUE, '=' .repeat(50));
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Launch browser
    log(COLORS.YELLOW, '🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Try to access the dev server first
    log(COLORS.YELLOW, '🌐 Checking if dev server is running...');
    try {
      await page.goto('http://localhost:3003', { timeout: 5000 });
      log(COLORS.GREEN, '✅ Dev server is accessible');
    } catch (error) {
      log(COLORS.RED, '❌ Dev server not accessible on localhost:3003');
      log(COLORS.YELLOW, '💡 Make sure npm run dev is running');
      return;
    }
    
    // Check the login page structure first
    log(COLORS.YELLOW, '🔐 Examining login page...');
    await page.goto('http://localhost:3003/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: '/tmp/login_page.png' });
    log(COLORS.GREEN, '📸 Login page screenshot saved: /tmp/login_page.png');
    
    // Check what input fields exist
    const emailInputs = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').count();
    const passwordInputs = await page.locator('input[type="password"], input[name="password"]').count();
    const allInputs = await page.locator('input').count();
    
    log(COLORS.GREEN, `📋 Login page form elements:`);
    log(COLORS.GREEN, `   Email inputs: ${emailInputs}`);
    log(COLORS.GREEN, `   Password inputs: ${passwordInputs}`);
    log(COLORS.GREEN, `   Total inputs: ${allInputs}`);
    
    // Try to access an order page directly (might bypass auth in dev)
    log(COLORS.YELLOW, '📋 Trying to access order page directly...');
    const orderId = 'b4e262ad-4a72-405c-bde6-262211905518'; // Our test order
    
    try {
      await page.goto(`http://localhost:3003/orders/${orderId}`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      const pageContent = await page.textContent('body');
      if (pageContent && pageContent.includes('Order #')) {
        log(COLORS.GREEN, '✅ Order page accessed successfully!');
        
        // Check for table headers
        const headers = await page.locator('th').allTextContents();
        log(COLORS.GREEN, `📊 Table headers found: ${headers.join(', ')}`);
        
        // Check specifically for Publisher column
        const publisherHeader = await page.locator('th:has-text("Publisher")').count();
        if (publisherHeader > 0) {
          log(COLORS.GREEN, '✅ Publisher column header found!');
        } else {
          log(COLORS.YELLOW, '⚠️  Publisher column header not found');
        }
        
        // Check for any table content
        const tableRows = await page.locator('tbody tr').count();
        log(COLORS.GREEN, `📊 Table rows found: ${tableRows}`);
        
        if (tableRows > 0) {
          // Get first row content
          const firstRowCells = await page.locator('tbody tr:first-child td').allTextContents();
          log(COLORS.GREEN, `📋 First row cells: ${firstRowCells.join(' | ')}`);
        }
        
        // Take screenshot of order page
        await page.screenshot({ path: '/tmp/order_page_structure.png', fullPage: true });
        log(COLORS.GREEN, '📸 Order page screenshot saved: /tmp/order_page_structure.png');
        
      } else if (pageContent && (pageContent.includes('Unauthorized') || pageContent.includes('Sign in'))) {
        log(COLORS.YELLOW, '⚠️  Order page requires authentication');
      } else {
        log(COLORS.RED, '❌ Order page did not load correctly');
      }
    } catch (error) {
      log(COLORS.RED, `❌ Failed to access order page: ${error.message}`);
    }
    
    // Wait for manual inspection
    log(COLORS.YELLOW, '👀 Browser will remain open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    log(COLORS.RED, `❌ Test failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  testOrderPageStructure().catch(console.error);
}