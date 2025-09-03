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

async function testMobilePublisherDisplay() {
  log(COLORS.BOLD + COLORS.BLUE, '📱 MOBILE PUBLISHER DISPLAY TEST');
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
    
    const context = await browser.newContext({
      // Mobile viewport
      viewport: { width: 375, height: 812 }, // iPhone X dimensions
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    page = await context.newPage();
    
    // Set timeout
    page.setDefaultTimeout(20000);
    
    // Navigate and login
    log(COLORS.YELLOW, '📱 Testing on mobile viewport (375x812)...');
    await page.goto('http://localhost:3003/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Login
    log(COLORS.YELLOW, '🔐 Logging in...');
    await page.fill('input[type="email"], input[name="email"], input:nth-of-type(1)', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"], input[name="password"], input:nth-of-type(2)', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
    
    // Wait for redirect
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 20000 });
    log(COLORS.GREEN, '✅ Mobile login successful');
    
    // Navigate to order
    const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
    log(COLORS.YELLOW, `📋 Navigating to order on mobile: ${orderId.slice(0, 8)}...`);
    
    await page.goto(`http://localhost:3003/orders/${orderId}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Take mobile screenshot
    await page.screenshot({ path: '/tmp/mobile_order_page.png', fullPage: true });
    log(COLORS.GREEN, '📸 Mobile screenshot: /tmp/mobile_order_page.png');
    
    // Check for mobile cards (should be visible, desktop table should be hidden)
    const desktopTable = await page.locator('.hidden.md\\:block').count();
    const mobileCards = await page.locator('.md\\:hidden').count();
    
    log(COLORS.GREEN, `📊 Desktop tables (should be 0 on mobile): ${desktopTable}`);
    log(COLORS.GREEN, `📱 Mobile card containers: ${mobileCards}`);
    
    if (desktopTable === 0 && mobileCards > 0) {
      log(COLORS.GREEN, '✅ Responsive design working - mobile cards showing');
    } else {
      log(COLORS.RED, '❌ Responsive design issue - wrong components showing');
    }
    
    // Check for publisher information in mobile cards
    log(COLORS.BOLD + COLORS.YELLOW, '\n🔍 CHECKING MOBILE PUBLISHER DISPLAY');
    log(COLORS.YELLOW, '=' .repeat(40));
    
    // Look for publisher text in mobile view
    const publisherLabels = await page.locator('span:has-text("Publisher:")').count();
    log(COLORS.GREEN, `📋 Publisher labels found: ${publisherLabels}`);
    
    if (publisherLabels > 0) {
      log(COLORS.BOLD + COLORS.GREEN, '✅ SUCCESS: Publisher information found in mobile cards!');
      
      // Get publisher data
      const publisherData = await page.locator('span:has-text("Publisher:")').first().textContent();
      log(COLORS.GREEN, `📋 Publisher label text: "${publisherData}"`);
      
      // Check if publisher data is displayed
      const publisherContent = await page.locator('span:has-text("Publisher:")').first()
        .locator('xpath=following-sibling::span[1]').textContent().catch(() => null);
      
      if (publisherContent) {
        log(COLORS.GREEN, `📋 Publisher content: "${publisherContent}"`);
      }
      
    } else {
      log(COLORS.BOLD + COLORS.RED, '❌ FAIL: No publisher information found in mobile cards');
      log(COLORS.RED, '   Mobile cards are missing publisher attribution display');
    }
    
    // Check page content for debugging
    const pageText = await page.textContent('body');
    const hasPublisherText = pageText && pageText.includes('Publisher');
    log(COLORS.YELLOW, `🔍 Page contains "Publisher" text: ${hasPublisherText}`);
    
    // Take final mobile screenshot
    await page.screenshot({ path: '/tmp/mobile_publisher_test.png', fullPage: true });
    log(COLORS.GREEN, '📸 Final mobile screenshot: /tmp/mobile_publisher_test.png');
    
    // Keep browser open for inspection
    log(COLORS.YELLOW, '\n👀 Browser staying open 20 seconds for mobile inspection...');
    log(COLORS.YELLOW, '   - Check if mobile cards show publisher information');
    log(COLORS.YELLOW, '   - Verify responsive design is working correctly');
    log(COLORS.YELLOW, '   - Look for publisher data in card layout');
    
    await page.waitForTimeout(20000);
    
  } catch (error) {
    log(COLORS.RED, `❌ Mobile test failed: ${error.message}`);
    
    if (page) {
      await page.screenshot({ path: '/tmp/mobile_test_error.png', fullPage: true });
      log(COLORS.YELLOW, '📸 Error screenshot: /tmp/mobile_test_error.png');
    }
    
  } finally {
    if (browser) {
      await browser.close();
      log(COLORS.BLUE, '🔒 Browser closed');
    }
  }
}

if (require.main === module) {
  testMobilePublisherDisplay().catch(console.error);
}