const { chromium } = require('playwright');

async function testSmartBulkProcess() {
  console.log('🧪 Testing Smart Bulk Process for Adzuna Marketing Campaign...\n');
  
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
      if (text.includes('📧') || text.includes('✅') || text.includes('⚠️') || 
          text.includes('Processing') || text.includes('imported') || text.includes('Adzuna')) {
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
    
    // Click on Campaigns tab
    console.log('\n3️⃣ Clicking on Campaigns tab...');
    const campaignsTab = await page.$('[role="tab"]:has-text("Campaigns")');
    if (campaignsTab) {
      await campaignsTab.click();
      await page.waitForTimeout(2000);
      console.log('   ✓ Switched to Campaigns tab');
    }
    
    // Look for Adzuna Marketing campaign
    console.log('\n4️⃣ Looking for Adzuna Marketing campaign...');
    
    // Find the campaign card that contains "Adzuna Marketing"
    const campaignCards = await page.$$('.border.rounded-lg.p-4');
    let adzunaCard = null;
    let initialPendingCount = 0;
    let initialProcessedCount = 0;
    
    for (const card of campaignCards) {
      const text = await card.textContent();
      if (text && text.includes('Adzuna Marketing')) {
        adzunaCard = card;
        console.log('   ✓ Found Adzuna Marketing campaign');
        
        // Extract the initial counts
        const pendingMatch = text.match(/Pending:\s*(\d+)/);
        const processedMatch = text.match(/Processed:\s*(\d+)/);
        
        if (pendingMatch) {
          initialPendingCount = parseInt(pendingMatch[1]);
          console.log(`   Initial Pending: ${initialPendingCount}`);
        }
        if (processedMatch) {
          initialProcessedCount = parseInt(processedMatch[1]);
          console.log(`   Initial Processed: ${initialProcessedCount}`);
        }
        break;
      }
    }
    
    if (!adzunaCard) {
      console.log('   ❌ Adzuna Marketing campaign not found!');
      await page.screenshot({ path: '/tmp/campaigns_list.png' });
      console.log('   Screenshot saved to /tmp/campaigns_list.png');
      return;
    }
    
    // Find and click the checkbox for this campaign
    console.log('\n5️⃣ Selecting Adzuna Marketing campaign checkbox...');
    const checkbox = await adzunaCard.$('button:has(.h-5.w-5)');
    if (checkbox) {
      await checkbox.click();
      console.log('   ✓ Campaign selected');
      await page.waitForTimeout(500);
    } else {
      console.log('   ❌ Could not find checkbox');
      return;
    }
    
    // Take screenshot of selected state
    await page.screenshot({ path: '/tmp/adzuna_selected.png' });
    console.log('   ✓ Screenshot saved to /tmp/adzuna_selected.png');
    
    // Click Smart Bulk Process button
    console.log('\n6️⃣ Looking for Smart Bulk Process button...');
    const smartBulkButton = await page.locator('button:has-text("Smart bulk process")').first();
    
    if (await smartBulkButton.isVisible()) {
      console.log('   ✓ Found Smart Bulk Process button');
      
      // Check if button is disabled
      const isDisabled = await smartBulkButton.isDisabled();
      if (isDisabled) {
        console.log('   ⚠️ Button is disabled');
      } else {
        console.log('   Clicking Smart Bulk Process...');
        await smartBulkButton.click();
        
        // Wait for processing to complete
        console.log('\n7️⃣ Waiting for processing to complete...');
        
        // Monitor for any loading indicators or status changes
        await page.waitForTimeout(5000);
        
        // Check for any notifications or success messages
        const notifications = await page.$$('.text-sm.p-3.rounded-lg');
        if (notifications.length > 0) {
          console.log('   Notifications:');
          for (const notification of notifications) {
            const text = await notification.textContent();
            console.log(`     - ${text}`);
          }
        }
        
        // Wait a bit more for any async updates
        await page.waitForTimeout(3000);
        
        // Re-check the campaign card for updated counts
        console.log('\n8️⃣ Checking updated counts...');
        const updatedCards = await page.$$('.border.rounded-lg.p-4');
        
        for (const card of updatedCards) {
          const text = await card.textContent();
          if (text && text.includes('Adzuna Marketing')) {
            console.log('   Campaign status after processing:');
            
            const newPendingMatch = text.match(/Pending:\s*(\d+)/);
            const newProcessedMatch = text.match(/Processed:\s*(\d+)/);
            
            if (newPendingMatch) {
              const newPendingCount = parseInt(newPendingMatch[1]);
              console.log(`   New Pending: ${newPendingCount} (was ${initialPendingCount})`);
              
              if (newPendingCount < initialPendingCount) {
                console.log(`   ✅ SUCCESS: ${initialPendingCount - newPendingCount} emails were processed!`);
              } else if (newPendingCount === initialPendingCount) {
                console.log('   ⚠️ No change in pending count');
              }
            }
            
            if (newProcessedMatch) {
              const newProcessedCount = parseInt(newProcessedMatch[1]);
              console.log(`   New Processed: ${newProcessedCount} (was ${initialProcessedCount})`);
              
              if (newProcessedCount > initialProcessedCount) {
                console.log(`   ✅ Processed count increased by ${newProcessedCount - initialProcessedCount}`);
              }
            }
            
            break;
          }
        }
        
        // Take final screenshot
        await page.screenshot({ path: '/tmp/after_smart_process.png' });
        console.log('\n   ✓ Final screenshot saved to /tmp/after_smart_process.png');
      }
    } else {
      console.log('   ❌ Smart Bulk Process button not found');
      
      // Look for any other buttons
      const allButtons = await page.$$('button');
      console.log(`   Found ${allButtons.length} total buttons on page`);
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && text.trim()) {
          console.log(`     - "${text.trim()}"`);
        }
      }
    }
    
    console.log('\n✅ Test complete!');
    console.log('Browser will stay open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/error_screenshot.png' });
    console.log('Error screenshot saved to /tmp/error_screenshot.png');
  } finally {
    await browser.close();
  }
}

testSmartBulkProcess();