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
    
    // Click on Campaigns tab - THIS IS THE KEY DIFFERENCE
    console.log('\n3️⃣ Clicking on Campaigns tab (where Smart Bulk Process button is)...');
    const campaignsTab = await page.locator('[role="tab"]:has-text("Campaigns")').first();
    if (await campaignsTab.isVisible()) {
      await campaignsTab.click();
      await page.waitForTimeout(2000);
      console.log('   ✓ Switched to Campaigns tab');
    }
    
    // Wait for campaigns to load
    console.log('\n4️⃣ Waiting for campaigns to load...');
    await page.waitForTimeout(3000);
    
    // Look for the Adzuna Marketing campaign checkbox
    console.log('\n5️⃣ Looking for Adzuna Marketing campaign...');
    
    // In the Campaigns tab, checkboxes are input elements, not button elements
    const campaignRows = await page.$$('.border.rounded-lg.p-4');
    let adzunaCheckbox = null;
    let foundAdzuna = false;
    
    for (const row of campaignRows) {
      const text = await row.textContent();
      if (text && text.includes('Adzuna Marketing')) {
        console.log('   ✓ Found Adzuna Marketing campaign');
        console.log('   Campaign details:', text.replace(/\s+/g, ' ').substring(0, 200));
        
        // Find the checkbox input in this row
        const checkbox = await row.$('input[type="checkbox"]');
        if (checkbox) {
          adzunaCheckbox = checkbox;
          foundAdzuna = true;
        }
        break;
      }
    }
    
    if (!foundAdzuna) {
      console.log('   ⚠️ Adzuna Marketing not found in Campaigns list');
      console.log('   Looking for any campaign to test with...');
      
      // Just select the first checkbox if available
      const firstCheckbox = await page.$('input[type="checkbox"]');
      if (firstCheckbox) {
        await firstCheckbox.check();
        console.log('   ✓ Selected first available campaign');
      }
    } else if (adzunaCheckbox) {
      console.log('\n6️⃣ Selecting Adzuna Marketing campaign...');
      await adzunaCheckbox.check();
      console.log('   ✓ Campaign selected');
      await page.waitForTimeout(500);
    }
    
    // Take screenshot of selected state
    await page.screenshot({ path: '/tmp/campaign_selected.png' });
    console.log('   ✓ Screenshot saved to /tmp/campaign_selected.png');
    
    // Now look for the Smart Bulk Process button with more flexible matching
    console.log('\n7️⃣ Looking for Smart Bulk Process button...');
    
    // Try multiple selectors
    const selectors = [
      'button:has-text("Smart Bulk Process")',
      'button:has-text("Smart bulk process")',  
      'button:has-text("smart bulk")',
      'button >> text=/smart.*bulk/i',
      '.bg-gradient-to-r.from-purple-600.to-blue-600', // The specific class
      'button:has-text("🤖")', // The robot emoji
    ];
    
    let smartBulkButton = null;
    for (const selector of selectors) {
      try {
        const button = await page.locator(selector).first();
        if (await button.isVisible()) {
          smartBulkButton = button;
          console.log(`   ✓ Found button with selector: ${selector}`);
          const buttonText = await button.textContent();
          console.log(`   Button text: "${buttonText}"`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (smartBulkButton) {
      // Check if button is disabled
      const isDisabled = await smartBulkButton.isDisabled();
      if (isDisabled) {
        console.log('   ⚠️ Smart Bulk Process button is disabled');
        console.log('   This might mean no campaigns are loaded or selected');
      } else {
        console.log('\n8️⃣ Clicking Smart Bulk Process button...');
        
        // Take screenshot before clicking
        await page.screenshot({ path: '/tmp/before_smart_process.png' });
        
        await smartBulkButton.click();
        console.log('   ✓ Button clicked!');
        
        // Handle the confirmation dialog if it appears
        page.on('dialog', async dialog => {
          console.log('   📋 Confirmation dialog appeared:', dialog.message().substring(0, 100));
          await dialog.accept();
          console.log('   ✓ Confirmed processing');
        });
        
        // Wait for processing to start/complete
        console.log('\n9️⃣ Waiting for processing...');
        await page.waitForTimeout(5000);
        
        // Look for progress indicators
        const progressBar = await page.$('.bg-gradient-to-r.from-purple-600.to-blue-600.h-2');
        if (progressBar) {
          console.log('   ✓ Processing in progress (progress bar visible)');
          
          // Wait for completion (max 30 seconds)
          let completed = false;
          for (let i = 0; i < 30; i++) {
            const progressText = await page.locator('text=/Processing.*of/').textContent().catch(() => null);
            if (progressText) {
              console.log(`   Status: ${progressText}`);
            }
            
            // Check if button text changed back to non-processing state
            const buttonText = await smartBulkButton.textContent();
            if (!buttonText.includes('Processing')) {
              completed = true;
              break;
            }
            
            await page.waitForTimeout(1000);
          }
          
          if (completed) {
            console.log('   ✅ Processing completed!');
          } else {
            console.log('   ⏱️ Processing still running after 30 seconds');
          }
        }
        
        // Take final screenshot
        await page.screenshot({ path: '/tmp/after_smart_process.png' });
        console.log('   ✓ Final screenshot saved to /tmp/after_smart_process.png');
        
        // Check if any results are visible
        const notifications = await page.$$('.text-sm.p-3.rounded-lg');
        if (notifications.length > 0) {
          console.log('\n   📬 Notifications:');
          for (const notification of notifications) {
            const text = await notification.textContent();
            console.log(`     - ${text}`);
          }
        }
      }
    } else {
      console.log('   ❌ Smart Bulk Process button not found!');
      console.log('   Let me check what buttons ARE visible in the Campaigns tab...');
      
      const allButtons = await page.$$('button');
      console.log(`\n   Found ${allButtons.length} total buttons:`);
      
      // Show first 20 buttons
      for (let i = 0; i < Math.min(20, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        const classes = await allButtons[i].getAttribute('class');
        if (text && text.trim()) {
          console.log(`     ${i+1}. "${text.trim().substring(0, 50)}"${classes && classes.includes('gradient') ? ' [GRADIENT]' : ''}`);
        }
      }
      
      // Take a screenshot to see what's on the page
      await page.screenshot({ path: '/tmp/campaigns_tab_view.png' });
      console.log('\n   📸 Screenshot saved to /tmp/campaigns_tab_view.png');
    }
    
    console.log('\n✅ Test complete!');
    console.log('Browser will stay open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
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