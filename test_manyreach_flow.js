const { chromium } = require('playwright');

async function testManyReachFlow() {
  console.log('🧪 Testing ManyReach campaign analysis flow...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Show browser for debugging
    slowMo: 500 // Slow down actions to observe
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to login page
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    // Login
    console.log('2️⃣ Logging in...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    // Wait for navigation - internal users go to /
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
    console.log('   ✓ Logged in successfully');
    
    // Navigate to ManyReach import page
    console.log('3️⃣ Navigating to ManyReach import page...');
    await page.goto('http://localhost:3003/admin/manyreach-import');
    await page.waitForLoadState('networkidle');
    
    // Wait for campaigns to load
    console.log('4️⃣ Waiting for campaigns to load...');
    await page.waitForSelector('.border.rounded-lg.p-4', { timeout: 10000 });
    const campaigns = await page.$$('.border.rounded-lg.p-4');
    console.log(`   ✓ Found ${campaigns.length} campaigns`);
    
    if (campaigns.length > 0) {
      // Click the first campaign to select it
      console.log('5️⃣ Selecting first campaign...');
      await campaigns[0].click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of selected state
      await page.screenshot({ path: '/tmp/campaign_selected.png' });
      console.log('   ✓ Screenshot saved to /tmp/campaign_selected.png');
      
      // Look for the "Check for new emails" button
      console.log('6️⃣ Looking for "Check for new emails" button...');
      const buttons = await page.$$('button');
      let foundButton = null;
      
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && text.includes('Check for new emails')) {
          foundButton = button;
          console.log(`   ✓ Found button with text: "${text}"`);
          break;
        }
      }
      
      if (foundButton) {
        // Open browser console to capture logs
        page.on('console', msg => {
          if (msg.text().includes('🔵') || msg.text().includes('📊') || 
              msg.text().includes('🌐') || msg.text().includes('✅')) {
            console.log('   CONSOLE:', msg.text());
          }
        });
        
        // Click the button
        console.log('7️⃣ Clicking "Check for new emails" button...');
        await foundButton.click();
        
        // Wait to see what happens
        console.log('8️⃣ Waiting for response...');
        await page.waitForTimeout(5000);
        
        // Take screenshot after clicking
        await page.screenshot({ path: '/tmp/after_analysis.png' });
        console.log('   ✓ Screenshot saved to /tmp/after_analysis.png');
        
        // Check for any notifications
        const notifications = await page.$$('.text-sm.p-3.rounded-lg');
        console.log(`   ✓ Found ${notifications.length} notifications`);
        
        for (const notification of notifications) {
          const text = await notification.textContent();
          console.log(`     - Notification: ${text}`);
        }
      } else {
        console.log('   ❌ Could not find "Check for new emails" button');
      }
    } else {
      console.log('   ❌ No campaigns found');
    }
    
    console.log('\n✅ Test complete! Check screenshots in /tmp/');
    
    // Keep browser open for manual inspection
    console.log('Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    // page might not exist if error happens early
    try {
      const pages = context.pages();
      if (pages.length > 0) {
        await pages[0].screenshot({ path: '/tmp/error_screenshot.png' });
        console.log('Error screenshot saved to /tmp/error_screenshot.png');
      }
    } catch (e) {
      // ignore screenshot error
    }
  } finally {
    await browser.close();
  }
}

testManyReachFlow();