const { chromium } = require('playwright');

async function testSmartBulkDebug() {
  console.log('🔍 Testing Smart Bulk Process with debugging...\n');
  
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
      // Capture all console logs for debugging
      console.log('   BROWSER:', text);
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
    
    console.log('\n3️⃣ Analyzing campaigns in Status tab...');
    
    // Look for Adzuna Marketing campaign specifically
    const campaignCards = await page.$$('.border.rounded-lg.p-4');
    console.log(`   Found ${campaignCards.length} campaign cards`);
    
    let adzunaCard = null;
    let campaignIndex = -1;
    
    for (let i = 0; i < campaignCards.length; i++) {
      const card = campaignCards[i];
      const text = await card.textContent();
      
      if (text && text.includes('Adzuna Marketing')) {
        adzunaCard = card;
        campaignIndex = i;
        console.log(`\n   ✅ Found Adzuna Marketing at index ${i}!`);
        console.log(`   Card text: ${text.replace(/\s+/g, ' ').substring(0, 300)}`);
        
        // Extract numbers from the text
        const totalMatch = text.match(/Total:\s*(\d+)/i);
        const repliedMatch = text.match(/(\d+)\s*\/\s*\d+\s*replied/i) || text.match(/replied:\s*(\d+)/i);
        const importedMatch = text.match(/imported:\s*(\d+)/i) || text.match(/(\d+)\s*imported/i);
        
        if (totalMatch) console.log(`   Total: ${totalMatch[1]}`);
        if (repliedMatch) console.log(`   Replied: ${repliedMatch[1]}`);
        if (importedMatch) console.log(`   Imported: ${importedMatch[1]}`);
        
        break;
      }
    }
    
    if (!adzunaCard) {
      console.log('\n   ❌ Adzuna Marketing campaign not found!');
      console.log('   Let me select the first campaign with replies instead...');
      
      // Find any campaign with replies
      for (let i = 0; i < Math.min(campaignCards.length, 10); i++) {
        const card = campaignCards[i];
        const text = await card.textContent();
        
        if (text && text.includes('replied')) {
          adzunaCard = card;
          campaignIndex = i;
          const nameMatch = text.match(/^([^0-9]+?)(?=\s*Total:|replied)/);
          const campaignName = nameMatch ? nameMatch[1].trim() : `Campaign ${i}`;
          console.log(`\n   ✅ Selected campaign: ${campaignName}`);
          break;
        }
      }
    }
    
    if (adzunaCard) {
      // Find and click the checkbox
      const checkbox = await adzunaCard.$('button:has(.h-5.w-5)');
      if (checkbox) {
        await checkbox.click();
        console.log('   ✓ Selected campaign checkbox');
        await page.waitForTimeout(500);
      } else {
        console.log('   ❌ Could not find checkbox in campaign card');
      }
      
      // Take screenshot
      await page.screenshot({ path: '/tmp/smart_bulk_debug_before.png' });
      console.log('   ✓ Screenshot: /tmp/smart_bulk_debug_before.png');
      
      // Find Smart Bulk Process button
      console.log('\n4️⃣ Looking for Smart Bulk Process button...');
      const smartBulkButton = await page.locator('button:has-text("🤖 Smart Bulk Process")').first();
      
      if (await smartBulkButton.isVisible()) {
        console.log('   ✓ Found Smart Bulk Process button');
        
        // Click it
        console.log('\n5️⃣ Clicking Smart Bulk Process...');
        await smartBulkButton.click();
        console.log('   ✓ Button clicked!');
        
        // Wait for processing and monitor console
        console.log('\n6️⃣ Monitoring processing (30 seconds)...');
        console.log('   Watch for error messages in console...\n');
        
        for (let i = 0; i < 30; i++) {
          await page.waitForTimeout(1000);
          
          // Check if button text changed
          const buttonText = await smartBulkButton.textContent().catch(() => null);
          if (buttonText && buttonText !== '🤖 Smart Bulk Process') {
            console.log(`   Button text changed: ${buttonText}`);
          }
          
          // Check for error messages on page
          const errorElements = await page.$$('.text-red-500, .text-red-600, .bg-red-50');
          for (const errorEl of errorElements) {
            const errorText = await errorEl.textContent();
            if (errorText && errorText.length > 10) {
              console.log(`   ⚠️ Error on page: ${errorText}`);
            }
          }
        }
        
        // Take final screenshot
        await page.screenshot({ path: '/tmp/smart_bulk_debug_after.png' });
        console.log('\n   ✓ Final screenshot: /tmp/smart_bulk_debug_after.png');
        
      } else {
        console.log('   ❌ Smart Bulk Process button not found!');
      }
      
    } else {
      console.log('\n   ❌ No suitable campaign found to test!');
    }
    
    console.log('\n✅ Test complete! Check server logs for detailed error messages.');
    console.log('Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testSmartBulkDebug();