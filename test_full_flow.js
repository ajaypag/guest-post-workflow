const { chromium } = require('playwright');

async function testFullFlow() {
  console.log('🧪 Testing complete ManyReach flow with authentication...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console monitoring
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔍') || text.includes('📝') || text.includes('✅') || 
          text.includes('⚠️') || text.includes('❌') || text.includes('Campaign analysis')) {
        console.log('   BROWSER:', text);
      }
    });
    
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
    await page.waitForLoadState('networkidle');
    
    // Click on Status tab to ensure we're on the right view
    console.log('\n3️⃣ Switching to Status tab...');
    const statusTab = await page.$('[role="tab"]:has-text("Status")');
    if (statusTab) {
      await statusTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Select ALL campaigns by clicking all checkboxes
    console.log('\n4️⃣ Selecting ALL campaigns...');
    const checkboxButtons = await page.$$('button:has(.h-5.w-5)');
    console.log(`   Found ${checkboxButtons.length} campaign checkboxes`);
    
    let selectedCount = 0;
    for (const checkbox of checkboxButtons) {
      await checkbox.click();
      selectedCount++;
      await page.waitForTimeout(100); // Small delay between clicks
    }
    console.log(`   ✓ Selected ${selectedCount} campaigns`);
    
    // Take screenshot of selected state
    await page.screenshot({ path: '/tmp/all_campaigns_selected.png' });
    console.log('   ✓ Screenshot saved to /tmp/all_campaigns_selected.png');
    
    // Click the "Check for new emails" button
    console.log('\n5️⃣ Clicking "Check for new emails" button...');
    const checkEmailsButton = await page.locator('button:has-text("Check for new emails")').first();
    await checkEmailsButton.click();
    
    // Wait for and monitor the API response
    console.log('   Waiting for analysis to complete...');
    
    // Listen for the network response
    page.on('response', async response => {
      if (response.url().includes('/api/admin/manyreach/bulk-analysis')) {
        console.log(`\n   📡 API Response: ${response.status()}`);
        if (response.ok()) {
          const data = await response.json();
          console.log(`   Total campaigns analyzed: ${data.analysis?.totalCampaigns || 0}`);
          console.log(`   Total new emails found: ${data.analysis?.totalNewEmails || 0}`);
          console.log(`   Total duplicates: ${data.analysis?.totalDuplicates || 0}`);
          
          if (data.analysis?.campaignBreakdown) {
            const withEmails = data.analysis.campaignBreakdown.filter(c => 
              c.newEmails > 0 || c.duplicates > 0
            );
            if (withEmails.length > 0) {
              console.log(`\n   ✅ FOUND CAMPAIGNS WITH EMAILS:`);
              withEmails.forEach(c => {
                console.log(`     - ${c.campaignName}: ${c.newEmails} new, ${c.duplicates} duplicates`);
              });
            } else {
              console.log(`\n   ⚠️ NO CAMPAIGNS HAVE EMAILS`);
            }
          }
        }
      }
    });
    
    // Wait for the analysis to complete
    await page.waitForTimeout(10000);
    
    // Check if there's a result card visible
    const resultCards = await page.$$('div:has-text("Campaign Analysis Results")');
    if (resultCards.length > 0) {
      console.log('\n6️⃣ Analysis results displayed on page');
      await page.screenshot({ path: '/tmp/analysis_results.png' });
      console.log('   ✓ Screenshot saved to /tmp/analysis_results.png');
    } else {
      console.log('\n   ⚠️ No result card visible on page');
    }
    
    // Now deselect all and select just ONE campaign to test
    console.log('\n7️⃣ Testing with single campaign...');
    
    // Click all checkboxes again to deselect
    for (const checkbox of checkboxButtons) {
      await checkbox.click();
      await page.waitForTimeout(50);
    }
    console.log('   ✓ Deselected all campaigns');
    
    // Select just the first one
    if (checkboxButtons.length > 0) {
      await checkboxButtons[0].click();
      console.log('   ✓ Selected first campaign only');
      
      // Click the button again
      console.log('   Clicking "Check for new emails" again...');
      await checkEmailsButton.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: '/tmp/single_campaign_result.png' });
      console.log('   ✓ Screenshot saved to /tmp/single_campaign_result.png');
    }
    
    console.log('\n✅ Test complete! Check screenshots in /tmp/');
    console.log('   Browser will stay open for 20 seconds for inspection...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/error_screenshot.png' });
    console.log('Error screenshot saved to /tmp/error_screenshot.png');
  } finally {
    await browser.close();
  }
}

testFullFlow();