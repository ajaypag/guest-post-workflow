const puppeteer = require('puppeteer');

async function testOrderFlow() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  console.log('🚀 Starting Order Flow Test\n');

  try {
    // Test 1: Internal User Login
    console.log('1️⃣ Testing Internal User Login');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'screenshots/01-login-page.png' });
    
    await page.type('input[name="email"], input[type="email"]', 'ajay@outreachlabs.com');
    await page.type('input[name="password"], input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.screenshot({ path: 'screenshots/02-login-filled.png' });
    
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    await page.screenshot({ path: 'screenshots/03-after-login.png' });
    console.log(`   Current URL: ${page.url()}`);
    
    // Test 2: Navigate to Orders
    console.log('\n2️⃣ Navigating to Orders Section');
    const ordersLink = await page.$('a[href="/orders"]');
    if (ordersLink) {
      await ordersLink.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots/04-orders-page.png' });
      console.log(`   Current URL: ${page.url()}`);
    }
    
    // Test 3: Create New Order
    console.log('\n3️⃣ Creating New Order');
    const newOrderButton = await page.$('a[href="/orders/new"], button:has-text("New Order"), button:has-text("Create Order")');
    if (newOrderButton) {
      await newOrderButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots/05-new-order-page.png' });
      console.log(`   Current URL: ${page.url()}`);
      
      // Try to fill order form
      const selects = await page.$$('select');
      const inputs = await page.$$('input[type="number"], input[type="text"]');
      console.log(`   Found ${selects.length} select fields and ${inputs.length} input fields`);
    }
    
    // Test 4: Check what's visible on the page
    console.log('\n4️⃣ Page Analysis');
    const pageTitle = await page.title();
    const headings = await page.$$eval('h1, h2', els => els.map(el => el.textContent));
    const buttons = await page.$$eval('button', els => els.map(el => el.textContent).slice(0, 5));
    
    console.log(`   Page Title: ${pageTitle}`);
    console.log(`   Headings: ${headings.join(', ')}`);
    console.log(`   Buttons: ${buttons.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'screenshots/error-state.png' });
  }

  console.log('\n✅ Test completed - check screenshots folder for visual documentation');
  await browser.close();
}

testOrderFlow();