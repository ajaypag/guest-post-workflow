const { chromium } = require('playwright');

async function findCampaignsWithEmails() {
  console.log('🔍 Finding campaigns with actual new emails to import...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console monitoring
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('📧') || text.includes('✅') || text.includes('⚠️') || 
          text.includes('Processing') || text.includes('imported') || 
          text.includes('Smart') || text.includes('new emails')) {
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
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // We're on the Status tab by default
    console.log('\n3️⃣ Analyzing campaigns in Status tab to find ones with new emails...');
    
    // Get all campaign cards
    const campaignCards = await page.$$('.border.rounded-lg.p-4');
    const campaignsWithNewEmails = [];
    
    console.log(`   Found ${campaignCards.length} campaigns to analyze\n`);
    
    for (let i = 0; i < campaignCards.length; i++) {
      const card = campaignCards[i];
      const text = await card.textContent();
      
      // Extract campaign name and stats
      const nameMatch = text.match(/([^0-9]+?)(?=Total:|replied|pending|imported|processed)/);
      const totalMatch = text.match(/Total:\s*(\d+)/i) || text.match(/(\d+)\s*total/i);
      const repliedMatch = text.match(/(\d+)\s*\/\s*\d+\s*replied/) || text.match(/replied\s*(\d+)/i);
      const pendingMatch = text.match(/pending\s*(\d+)/i);
      const importedMatch = text.match(/imported\s*(\d+)/i);
      const processedMatch = text.match(/processed\s*(\d+)/i);
      
      if (nameMatch) {
        const campaignName = nameMatch[1].trim();
        const total = totalMatch ? parseInt(totalMatch[1]) : 0;
        const replied = repliedMatch ? parseInt(repliedMatch[1]) : 0;
        const pending = pendingMatch ? parseInt(pendingMatch[1]) : 0;
        const imported = importedMatch ? parseInt(importedMatch[1]) : 0;
        const processed = processedMatch ? parseInt(processedMatch[1]) : 0;
        
        // Calculate potential new emails
        // New emails = replied - imported (these are the ones not yet imported)
        const potentialNewEmails = replied - imported;
        
        console.log(`   📊 ${campaignName}:`);
        console.log(`      Total: ${total}, Replied: ${replied}, Pending: ${pending}`);
        console.log(`      Imported: ${imported}, Processed: ${processed}`);
        console.log(`      → Potential new emails: ${potentialNewEmails}`);
        
        if (potentialNewEmails > 0) {
          campaignsWithNewEmails.push({
            name: campaignName,
            element: card,
            potentialNewEmails,
            replied,
            imported
          });
          console.log(`      ✅ Has ${potentialNewEmails} new emails to import!`);
        } else {
          console.log(`      ❌ No new emails to import`);
        }
        console.log('');
      }
    }
    
    if (campaignsWithNewEmails.length === 0) {
      console.log('\n❌ No campaigns found with new emails to import!');
      console.log('   All campaigns either have no replies or all replies are already imported.');
      
      // Let's try clicking "Check for new emails" on some campaigns to fetch new data
      console.log('\n4️⃣ Trying to check for new emails in campaigns...');
      
      // Find campaigns with pending emails and check for new ones
      for (const card of campaignCards.slice(0, 3)) { // Check first 3 campaigns
        const text = await card.textContent();
        const nameMatch = text.match(/([^0-9]+?)(?=Total:|replied|pending|imported|processed)/);
        
        if (nameMatch) {
          const campaignName = nameMatch[1].trim();
          console.log(`\n   Checking for new emails in: ${campaignName}`);
          
          // Click the "Check for new emails" button for this campaign
          const checkButton = await card.$('button:has-text("Check for new emails")');
          if (checkButton) {
            await checkButton.click();
            console.log('   ✓ Clicked "Check for new emails"');
            
            // Wait for the check to complete
            await page.waitForTimeout(5000);
            
            // Check if any notification appeared
            const notifications = await page.$$('.text-sm.p-3.rounded-lg');
            for (const notification of notifications) {
              const notifText = await notification.textContent();
              if (notifText.includes(campaignName) || notifText.includes('new')) {
                console.log(`   📬 ${notifText}`);
              }
            }
          }
        }
      }
      
      // Re-check campaigns after fetching new emails
      console.log('\n5️⃣ Re-checking campaigns after fetching...');
      await page.waitForTimeout(2000);
      
      const updatedCards = await page.$$('.border.rounded-lg.p-4');
      for (const card of updatedCards) {
        const text = await card.textContent();
        const nameMatch = text.match(/([^0-9]+?)(?=Total:|replied|pending|imported|processed)/);
        const repliedMatch = text.match(/(\d+)\s*\/\s*\d+\s*replied/) || text.match(/replied\s*(\d+)/i);
        const importedMatch = text.match(/imported\s*(\d+)/i);
        
        if (nameMatch && repliedMatch && importedMatch) {
          const campaignName = nameMatch[1].trim();
          const replied = parseInt(repliedMatch[1]);
          const imported = parseInt(importedMatch[1]);
          const potentialNewEmails = replied - imported;
          
          if (potentialNewEmails > 0) {
            campaignsWithNewEmails.push({
              name: campaignName,
              element: card,
              potentialNewEmails,
              replied,
              imported
            });
            console.log(`   ✅ ${campaignName} now has ${potentialNewEmails} new emails!`);
          }
        }
      }
    }
    
    // Now test Smart Bulk Process with a campaign that has new emails
    if (campaignsWithNewEmails.length > 0) {
      console.log('\n6️⃣ Found campaigns with new emails! Testing Smart Bulk Process...');
      
      // Sort by most new emails and pick the best one
      campaignsWithNewEmails.sort((a, b) => b.potentialNewEmails - a.potentialNewEmails);
      const bestCampaign = campaignsWithNewEmails[0];
      
      console.log(`\n   🎯 Selected campaign: ${bestCampaign.name}`);
      console.log(`      Current imported: ${bestCampaign.imported}`);
      console.log(`      Expected new emails: ${bestCampaign.potentialNewEmails}`);
      
      // Find and click the checkbox for this campaign
      const checkbox = await bestCampaign.element.$('button:has(.h-5.w-5)');
      if (checkbox) {
        await checkbox.click();
        console.log('   ✓ Selected campaign checkbox');
        await page.waitForTimeout(500);
      }
      
      // Take screenshot before processing
      await page.screenshot({ path: '/tmp/before_smart_bulk_process.png' });
      console.log('   ✓ Screenshot saved: /tmp/before_smart_bulk_process.png');
      
      // Find and click Smart Bulk Process button
      const smartBulkButton = await page.locator('button:has-text("🤖 Smart Bulk Process")').first();
      if (await smartBulkButton.isVisible()) {
        console.log('\n7️⃣ Clicking Smart Bulk Process button...');
        
        const initialImportedCount = bestCampaign.imported;
        await smartBulkButton.click();
        console.log('   ✓ Button clicked!');
        
        // Wait for processing
        console.log('\n8️⃣ Monitoring processing...');
        
        // Wait for the button to show processing state
        await page.waitForTimeout(2000);
        
        // Check if button shows processing
        const buttonText = await smartBulkButton.textContent().catch(() => null);
        if (buttonText && buttonText.includes('Processing')) {
          console.log('   ✓ Processing started!');
          
          // Wait for completion (max 30 seconds)
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
        }
        
        // Wait a bit more for UI to update
        await page.waitForTimeout(3000);
        
        // Check the updated imported count
        console.log('\n9️⃣ Verifying email import...');
        
        // Find the campaign card again
        const finalCards = await page.$$('.border.rounded-lg.p-4');
        let finalImportedCount = 0;
        let foundUpdatedCampaign = false;
        
        for (const card of finalCards) {
          const text = await card.textContent();
          if (text.includes(bestCampaign.name)) {
            const importedMatch = text.match(/imported\s*(\d+)/i);
            if (importedMatch) {
              finalImportedCount = parseInt(importedMatch[1]);
              foundUpdatedCampaign = true;
              break;
            }
          }
        }
        
        if (foundUpdatedCampaign) {
          console.log(`\n   📊 Results for ${bestCampaign.name}:`);
          console.log(`      Before: ${initialImportedCount} imported`);
          console.log(`      After:  ${finalImportedCount} imported`);
          console.log(`      Change: +${finalImportedCount - initialImportedCount} emails`);
          
          if (finalImportedCount > initialImportedCount) {
            console.log('\n   🎉 SUCCESS! New emails were imported and UI updated!');
            console.log(`   ✅ ${finalImportedCount - initialImportedCount} new emails imported`);
          } else {
            console.log('\n   ❌ FAILED: No new emails imported (count unchanged)');
          }
        } else {
          console.log('\n   ⚠️ Could not find updated campaign to verify');
        }
        
        // Take final screenshot
        await page.screenshot({ path: '/tmp/after_smart_bulk_process_final.png' });
        console.log('\n   ✓ Final screenshot: /tmp/after_smart_bulk_process_final.png');
        
        // Check for notifications
        const notifications = await page.$$('.text-sm.p-3.rounded-lg');
        if (notifications.length > 0) {
          console.log('\n   📬 Notifications:');
          for (const notification of notifications) {
            const text = await notification.textContent();
            console.log(`     - ${text}`);
          }
        }
      } else {
        console.log('\n   ❌ Smart Bulk Process button not found!');
      }
    } else {
      console.log('\n❌ No campaigns have new emails to import!');
      console.log('   This might mean:');
      console.log('   1. All emails have already been imported');
      console.log('   2. No campaigns have received new replies');
      console.log('   3. The ManyReach API is not returning new data');
    }
    
    console.log('\n✅ Test complete!');
    console.log('Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      const pages = await context.pages();
      if (pages && pages.length > 0) {
        await pages[0].screenshot({ path: '/tmp/error_screenshot.png' });
        console.log('Error screenshot saved to /tmp/error_screenshot.png');
      }
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
  } finally {
    await browser.close();
  }
}

findCampaignsWithEmails();