const { chromium } = require('playwright');

async function testManyReachTabs() {
  console.log('🧪 Testing ManyReach tabs and button visibility...\n');
  
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
    
    // Check what tab is active
    console.log('4️⃣ Checking active tab...');
    
    // Look for tabs
    const tabs = await page.$$('[role="tab"]');
    console.log(`   Found ${tabs.length} tabs`);
    
    for (const tab of tabs) {
      const text = await tab.textContent();
      const isSelected = await tab.getAttribute('aria-selected');
      console.log(`   - Tab: "${text}" (selected: ${isSelected})`);
    }
    
    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/initial_tab_state.png' });
    console.log('   ✓ Screenshot saved to /tmp/initial_tab_state.png');
    
    // Check if we're on the Status tab
    const statusTab = await page.$('[role="tab"]:has-text("Status")');
    if (statusTab) {
      const isStatusSelected = await statusTab.getAttribute('aria-selected');
      console.log(`\n5️⃣ Status tab selected: ${isStatusSelected}`);
      
      if (isStatusSelected !== 'true') {
        console.log('   Clicking Status tab...');
        await statusTab.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Now look for the CampaignStatusView content
    console.log('\n6️⃣ Looking for CampaignStatusView content...');
    
    // Check if CampaignStatusView is rendering by looking for its unique elements
    const campaignCards = await page.$$('.border.rounded-lg.p-4');
    console.log(`   Found ${campaignCards.length} campaign cards`);
    
    // Look for ALL buttons on the page
    console.log('\n7️⃣ Looking for ALL buttons on the page...');
    const buttons = await page.$$('button');
    console.log(`   Found ${buttons.length} total buttons`);
    
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.trim()) {
        console.log(`   - Button: "${text.trim()}"`);
      }
    }
    
    // Try to find the specific button
    console.log('\n8️⃣ Specifically looking for "Check for new emails" button...');
    let checkEmailsButton = null;
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.includes('Check for new emails')) {
        checkEmailsButton = button;
        console.log(`   ✅ FOUND: "${text}"`);
        break;
      }
    }
    
    if (!checkEmailsButton) {
      console.log('   ❌ "Check for new emails" button NOT FOUND');
      
      // Try switching to Campaigns tab to see if button is there
      console.log('\n9️⃣ Switching to Campaigns tab...');
      const campaignsTab = await page.$('[role="tab"]:has-text("Campaigns")');
      if (campaignsTab) {
        await campaignsTab.click();
        await page.waitForTimeout(1000);
        
        // Take screenshot
        await page.screenshot({ path: '/tmp/campaigns_tab.png' });
        console.log('   ✓ Screenshot saved to /tmp/campaigns_tab.png');
        
        // Look for buttons again
        const campaignButtons = await page.$$('button');
        console.log(`   Found ${campaignButtons.length} buttons in Campaigns tab`);
        
        for (const button of campaignButtons) {
          const text = await button.textContent();
          if (text && text.trim()) {
            console.log(`   - Button: "${text.trim()}"`);
          }
        }
      }
    } else {
      // If we found the button, try to select a campaign and click it
      console.log('\n10️⃣ Found the button! Now selecting a campaign...');
      
      if (campaignCards.length > 0) {
        await campaignCards[0].click();
        await page.waitForTimeout(500);
        console.log('   ✓ Selected first campaign');
        
        // Click the button
        console.log('   Clicking "Check for new emails"...');
        await checkEmailsButton.click();
        await page.waitForTimeout(3000);
        
        // Take final screenshot
        await page.screenshot({ path: '/tmp/after_check_emails.png' });
        console.log('   ✓ Screenshot saved to /tmp/after_check_emails.png');
      }
    }
    
    console.log('\n✅ Test complete! Check screenshots in /tmp/');
    
    // Keep browser open for manual inspection
    console.log('Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await page.screenshot({ path: '/tmp/error_screenshot.png' });
      console.log('Error screenshot saved to /tmp/error_screenshot.png');
    } catch (e) {
      // ignore screenshot error
    }
  } finally {
    await browser.close();
  }
}

testManyReachTabs();