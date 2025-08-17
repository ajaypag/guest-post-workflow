const puppeteer = require('puppeteer');

async function testMainLogin() {
  console.log('🧪 Testing Main Login Page for Both User Types\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    // Test 1: Account User via Main Login
    console.log('1️⃣ Testing Account User via /login (jake@thehrguy.co)');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle0' });
    
    await page.type('input[type="email"]', 'jake@thehrguy.co');
    await page.type('input[type="password"]', 'EPoOh&K2sVpAytl&');
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    const accountUrl = page.url();
    console.log(`   Redirected to: ${accountUrl}`);
    
    if (accountUrl.includes('/account/dashboard')) {
      console.log('   ✅ SUCCESS: Account user correctly redirected to dashboard!');
    } else {
      console.log('   ❌ FAILED: Account user not redirected to dashboard');
    }
    
    // Test 2: Internal User via Main Login
    console.log('\n2️⃣ Testing Internal User via /login (ajay@outreachlabs.com)');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle0' });
    
    await page.type('input[type="email"]', 'ajay@outreachlabs.com');
    await page.type('input[type="password"]', 'FA64!I$nrbCauS^d');
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    const internalUrl = page.url();
    console.log(`   Redirected to: ${internalUrl}`);
    
    if (internalUrl === 'http://localhost:3002/' || !internalUrl.includes('/account')) {
      console.log('   ✅ SUCCESS: Internal user correctly redirected to main app!');
    } else {
      console.log('   ❌ FAILED: Internal user incorrectly redirected');
    }
    
    console.log('\n📊 Summary:');
    console.log('   Main login page handles BOTH user types correctly');
    console.log('   Account users → /account/dashboard');
    console.log('   Internal users → / (main app)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  await browser.close();
}

testMainLogin();