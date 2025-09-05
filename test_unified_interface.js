const { chromium } = require('playwright');

async function testUnifiedInterface() {
  console.log('🧪 Testing unified ManyReach interface...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate and login
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 });
    console.log('   ✓ Logged in successfully');
    
    // Navigate to ManyReach page
    console.log('\n2️⃣ Going to ManyReach import page...');
    await page.goto('http://localhost:3003/admin/manyreach-import');
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Check that we only have 2 tabs now (not 3)
    console.log('\n3️⃣ Checking tab structure...');
    const tabs = await page.$$('[role="tab"]');
    console.log(`   Found ${tabs.length} tabs`);
    
    if (tabs.length === 2) {
      console.log('   ✅ Correct! Now only 2 tabs (Campaign Management + Drafts)');
    } else {
      console.log('   ❌ Wrong number of tabs - expected 2');
    }
    
    // Check tab names
    for (let i = 0; i < tabs.length; i++) {
      const tabText = await tabs[i].textContent();
      console.log(`   Tab ${i + 1}: "${tabText.trim()}"`);
    }
    
    // Verify we're on the Campaign Management tab by default
    console.log('\n4️⃣ Checking default tab...');
    const activeTab = await page.$('[role="tab"][data-state="active"]');
    if (activeTab) {
      const tabText = await activeTab.textContent();
      console.log(`   Active tab: "${tabText.trim()}"`);
      if (tabText.includes('Campaign')) {
        console.log('   ✅ Correctly defaults to Campaign Management tab');
      }
    }
    
    // Verify the Smart Bulk Process button is visible
    console.log('\n5️⃣ Checking for Smart Bulk Process button...');
    const smartBulkButton = await page.locator('button:has-text("🤖 Smart Bulk Process")').first();
    
    if (await smartBulkButton.isVisible()) {
      console.log('   ✅ Smart Bulk Process button found');
      
      // Check if campaigns are loaded
      await page.waitForTimeout(3000); // Wait for campaigns to load
      
      // Look for campaign cards
      const campaignCards = await page.$$('.border.rounded-lg.p-4');
      console.log(`   Found ${campaignCards.length} campaign cards`);
      
      if (campaignCards.length > 0) {
        console.log('   ✅ Campaigns are loading correctly');
      }
    } else {
      console.log('   ❌ Smart Bulk Process button not found');
    }
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/unified_interface.png' });
    console.log('\n📸 Screenshot saved: /tmp/unified_interface.png');
    
    console.log('\n✅ Interface consolidation test complete!');
    console.log('Browser will stay open for 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testUnifiedInterface();