import { chromium, Browser, Page } from 'playwright';
import { db } from './lib/db/connection';
import { orders } from './lib/db/orderSchema';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { websites } from './lib/db/websiteSchema';
import { clients } from './lib/db/schema';
import { eq, isNotNull, limit, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

async function setupTestOrderWithAttribution() {
  log(COLORS.YELLOW, '🔧 Setting up test order with publisher attribution...');
  
  // Get a client for the order
  const [client] = await db.select().from(clients).limit(1);
  if (!client) {
    throw new Error('No clients found');
  }
  
  // Create or find a draft order
  let order = await db.select().from(orders).where(eq(orders.status, 'draft')).limit(1);
  
  if (order.length === 0) {
    [order[0]] = await db.insert(orders).values({
      accountId: client.accountId,
      status: 'draft',
      subtotalRetail: 0,
      totalRetail: 0,
      totalWholesale: 0,
      profitMargin: 0,
      discountAmount: 0,
      discountPercent: '0',
    }).returning();
    
    log(COLORS.GREEN, `✅ Created test order: ${order[0].id.slice(0, 8)}`);
  } else {
    log(COLORS.GREEN, `✅ Using existing draft order: ${order[0].id.slice(0, 8)}`);
  }
  
  // Find websites with attribution
  const websitesWithAttribution = await db
    .select({
      id: websites.id,
      domain: websites.domain,
      selectedOfferingId: websites.selectedOfferingId,
      selectedPublisherId: websites.selectedPublisherId,
      guestPostCost: websites.guestPostCost
    })
    .from(websites)
    .where(and(
      isNotNull(websites.selectedOfferingId),
      isNotNull(websites.selectedPublisherId)
    ))
    .limit(2);
  
  if (websitesWithAttribution.length === 0) {
    throw new Error('No websites with attribution found. Run populate_attribution_data.ts first.');
  }
  
  log(COLORS.GREEN, `Found ${websitesWithAttribution.length} websites with attribution to add`);
  
  // Add line items for these websites
  for (const website of websitesWithAttribution) {
    // Check if line item already exists
    const existingLineItem = await db
      .select()
      .from(orderLineItems)
      .where(and(
        eq(orderLineItems.orderId, order[0].id),
        eq(orderLineItems.assignedDomain, website.domain)
      ))
      .limit(1);
    
    if (existingLineItem.length === 0) {
      await db.insert(orderLineItems).values({
        orderId: order[0].id,
        clientId: client.id,
        addedBy: client.accountId, // Use account as user
        status: 'draft',
        estimatedPrice: website.guestPostCost + 7900, // Add service fee
        wholesalePrice: website.guestPostCost,
        publisherId: website.selectedPublisherId,
        publisherOfferingId: website.selectedOfferingId,
        publisherPrice: website.guestPostCost,
        displayOrder: 0,
        assignedDomain: website.domain,
        targetPageUrl: 'https://example.com/test',
        anchorText: 'Test Publisher Attribution',
        metadata: {
          pricingStrategy: 'min_price',
          attributionSource: 'test_setup',
          internalNotes: 'Test line item with publisher attribution'
        }
      });
      
      log(COLORS.GREEN, `✅ Added line item for ${website.domain} with publisher ${website.selectedPublisherId.slice(0, 8)}`);
    } else {
      log(COLORS.YELLOW, `⚠️  Line item already exists for ${website.domain}`);
    }
  }
  
  return order[0].id;
}

async function testFrontendPublisherDisplay() {
  log(COLORS.BOLD + COLORS.BLUE, '🧪 TESTING FRONTEND PUBLISHER DISPLAY');
  log(COLORS.BLUE, '=' .repeat(50));
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Setup test data
    const orderId = await setupTestOrderWithAttribution();
    
    // Launch browser
    log(COLORS.YELLOW, '\n🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to login page first
    log(COLORS.YELLOW, '🔐 Navigating to login...');
    await page.goto('http://localhost:3003/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Login as internal user (assuming test credentials)
    await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL(/^(?!.*\/auth\/login).*$/);
    log(COLORS.GREEN, '✅ Logged in successfully');
    
    // Navigate to the order page
    log(COLORS.YELLOW, `📋 Navigating to order page: ${orderId.slice(0, 8)}...`);
    await page.goto(`http://localhost:3003/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    
    // Check if the page loaded correctly
    const pageTitle = await page.textContent('h1');
    if (pageTitle && pageTitle.includes('Order #')) {
      log(COLORS.GREEN, `✅ Order page loaded: ${pageTitle}`);
    } else {
      throw new Error('Order page did not load correctly');
    }
    
    // Check for publisher column header
    log(COLORS.YELLOW, '🔍 Checking for publisher column...');
    const publisherHeader = await page.locator('th:has-text("Publisher")');
    const publisherHeaderCount = await publisherHeader.count();
    
    if (publisherHeaderCount > 0) {
      log(COLORS.GREEN, '✅ Publisher column header found');
    } else {
      log(COLORS.RED, '❌ Publisher column header NOT found');
      
      // Take screenshot for debugging
      await page.screenshot({ path: '/tmp/order_page_no_publisher_column.png' });
      log(COLORS.YELLOW, '📸 Screenshot saved: /tmp/order_page_no_publisher_column.png');
      
      // Check what headers do exist
      const allHeaders = await page.locator('th').allTextContents();
      log(COLORS.YELLOW, `📋 Found headers: ${allHeaders.join(', ')}`);
    }
    
    // Check for publisher data in cells
    log(COLORS.YELLOW, '🔍 Checking for publisher data in cells...');
    const publisherCells = await page.locator('td').filter({ hasText: /publisher|assigned/i });
    const publisherCellCount = await publisherCells.count();
    
    if (publisherCellCount > 0) {
      log(COLORS.GREEN, `✅ Found ${publisherCellCount} cells with publisher-related content`);
      
      // Get text content of publisher cells
      for (let i = 0; i < Math.min(publisherCellCount, 3); i++) {
        const cellText = await publisherCells.nth(i).textContent();
        log(COLORS.GREEN, `   Cell ${i + 1}: "${cellText}"`);
      }
    } else {
      log(COLORS.RED, '❌ No publisher data found in table cells');
    }
    
    // Check if line items are visible
    log(COLORS.YELLOW, '🔍 Checking for line items...');
    const lineItemRows = await page.locator('tbody tr').count();
    log(COLORS.GREEN, `📊 Found ${lineItemRows} line item rows`);
    
    // Take screenshot of the current state
    await page.screenshot({ path: '/tmp/order_page_final_state.png', fullPage: true });
    log(COLORS.GREEN, '📸 Full page screenshot saved: /tmp/order_page_final_state.png');
    
    // Check for any JavaScript errors
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    if (jsErrors.length > 0) {
      log(COLORS.RED, '❌ JavaScript errors detected:');
      jsErrors.forEach(error => log(COLORS.RED, `   ${error}`));
    } else {
      log(COLORS.GREEN, '✅ No JavaScript errors detected');
    }
    
    // Wait a moment to see the page
    log(COLORS.YELLOW, '⏸️  Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    log(COLORS.RED, `❌ Frontend test failed: ${error.message}`);
    
    if (page) {
      await page.screenshot({ path: '/tmp/frontend_test_error.png' });
      log(COLORS.YELLOW, '📸 Error screenshot saved: /tmp/frontend_test_error.png');
    }
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  log(COLORS.BOLD + COLORS.GREEN, '\n🎉 Frontend publisher display test completed!');
}

if (require.main === module) {
  testFrontendPublisherDisplay().catch(console.error).finally(() => process.exit(0));
}