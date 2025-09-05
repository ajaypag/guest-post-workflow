const { chromium } = require('playwright');

async function testSmartBulkProcess() {
  console.log('🧪 Testing Smart Bulk Process in Status Tab...\n');
  
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
      if (text.includes('🤖') || text.includes('✅') || text.includes('⚠️') || 
          text.includes('Processing') || text.includes('imported') || text.includes('Adzuna') ||
          text.includes('Smart')) {
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
    await page.waitForTimeout(2000); // Wait for campaigns to load
    
    // We should already be on the Status tab by default
    console.log('\n3️⃣ Currently on Status tab (default)...');
    
    // Look for the Adzuna Marketing campaign in the Status tab
    console.log('\n4️⃣ Looking for Adzuna Marketing campaign...');
    
    // Find the campaign card that contains "Adzuna Marketing"
    const campaignCards = await page.$$('.border.rounded-lg.p-4');
    let adzunaFound = false;
    let initialPendingCount = 0;
    
    for (const card of campaignCards) {
      const text = await card.textContent();
      if (text && text.includes('Adzuna Marketing')) {
        console.log('   ✓ Found Adzuna Marketing campaign');
        
        // Extract the pending count if visible
        const repliedMatch = text.match(/(\d+)\s*\/\s*\d+\s*replied/);
        if (repliedMatch) {
          console.log(`   Replied count: ${repliedMatch[1]}`);
        }
        
        // Click the checkbox for this campaign
        const checkbox = await card.$('button:has(.h-5.w-5)');
        if (checkbox) {
          await checkbox.click();
          console.log('   ✓ Selected Adzuna Marketing campaign');
          adzunaFound = true;
        }
        break;
      }
    }
    
    if (!adzunaFound) {
      console.log('   ⚠️ Adzuna Marketing not found, selecting first available campaign');
      // Select the first campaign checkbox
      const firstCheckbox = await page.$('button:has(.h-5.w-5)');
      if (firstCheckbox) {
        await firstCheckbox.click();
        console.log('   ✓ Selected first campaign');
      }
    }
    
    await page.waitForTimeout(500);
    
    // Take screenshot of selected state
    await page.screenshot({ path: '/tmp/status_tab_selected.png' });
    console.log('   ✓ Screenshot saved to /tmp/status_tab_selected.png');
    
    // Now look for the Smart Bulk Process button
    console.log('\n5️⃣ Looking for Smart Bulk Process button...');
    
    // The button should appear when campaigns are selected
    const smartBulkButton = await page.locator('button:has-text("🤖 Smart Bulk Process")').first();
    
    if (await smartBulkButton.isVisible()) {
      console.log('   ✓ Found Smart Bulk Process button!');
      
      // Check button text to see selection count
      const buttonText = await smartBulkButton.textContent();
      console.log(`   Button text: "${buttonText}"`);
      
      // Check if button is disabled
      const isDisabled = await smartBulkButton.isDisabled();
      if (isDisabled) {
        console.log('   ⚠️ Button is disabled');
      } else {
        console.log('\n6️⃣ Clicking Smart Bulk Process button...');
        await smartBulkButton.click();
        console.log('   ✓ Button clicked!');
        
        // Wait for processing to start
        console.log('\n7️⃣ Monitoring processing...');
        
        // Look for notifications or status changes
        await page.waitForTimeout(3000);
        
        // Check if button text changed to show processing
        const updatedButtonText = await smartBulkButton.textContent().catch(() => null);
        if (updatedButtonText && updatedButtonText.includes('Processing')) {
          console.log('   ✓ Processing started!');
          console.log(`   Status: ${updatedButtonText}`);
          
          // Wait for processing to complete (max 30 seconds)
          let completed = false;
          for (let i = 0; i < 30; i++) {
            const currentText = await smartBulkButton.textContent().catch(() => null);
            if (currentText && !currentText.includes('Processing')) {
              completed = true;
              console.log('   ✅ Processing completed!');
              break;
            }
            await page.waitForTimeout(1000);
          }
          
          if (!completed) {
            console.log('   ⏱️ Still processing after 30 seconds');
          }
        }
        
        // Check for any notifications
        const notifications = await page.$$('.text-sm.p-3.rounded-lg');
        if (notifications.length > 0) {
          console.log('\n   📬 Notifications found:');
          for (const notification of notifications) {
            const text = await notification.textContent();
            console.log(`     - ${text}`);
          }
        }
        
        // Check for any visible success/error messages
        const successMessages = await page.$$('text=/✅|Successfully processed/');
        const errorMessages = await page.$$('text=/❌|failed/i');
        
        if (successMessages.length > 0) {
          console.log('\n   ✅ SUCCESS: Processing completed successfully!');
        }
        if (errorMessages.length > 0) {
          console.log('\n   ❌ ERROR: Some processing errors occurred');
        }
        
        // Take final screenshot
        await page.screenshot({ path: '/tmp/after_smart_process_status.png' });
        console.log('\n   ✓ Final screenshot saved to /tmp/after_smart_process_status.png');
        
        // Check if the campaign counts changed
        console.log('\n8️⃣ Checking for updated campaign counts...');
        const updatedCards = await page.$$('.border.rounded-lg.p-4');
        for (const card of updatedCards) {
          const text = await card.textContent();
          if (text && text.includes('Adzuna Marketing')) {
            console.log('   Campaign status after processing:');
            const repliedMatch = text.match(/(\d+)\s*\/\s*\d+\s*replied/);
            const importedMatch = text.match(/(\d+)\s*imported/);
            if (repliedMatch) {
              console.log(`     Replied: ${repliedMatch[1]}`);
            }
            if (importedMatch) {
              console.log(`     Imported: ${importedMatch[1]}`);
            }
            break;
          }
        }
      }
    } else {
      console.log('   ❌ Smart Bulk Process button not found!');
      console.log('   This might mean no campaigns are selected or the button hasn\'t been added yet');
      
      // List all visible buttons to debug
      const allButtons = await page.$$('button');
      console.log(`\n   Total buttons on page: ${allButtons.length}`);
      
      // Show buttons that contain relevant text
      for (const button of allButtons) {
        const text = await button.textContent();
        if (text && (text.includes('Smart') || text.includes('bulk') || text.includes('🤖') || text.includes('Process'))) {
          console.log(`     Found button: "${text}"`);
        }
      }
    }
    
    console.log('\n✅ Test complete!');
    console.log('Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    const page = await browser.pages().then(pages => pages[0]);
    if (page) {
      await page.screenshot({ path: '/tmp/error_screenshot.png' });
      console.log('Error screenshot saved to /tmp/error_screenshot.png');
    }
  } finally {
    await browser.close();
  }
}

testSmartBulkProcess();