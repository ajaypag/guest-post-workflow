const { chromium } = require('playwright');

async function testImportCountIncrement() {
  console.log('🧪 Testing that imported count increases after Smart Bulk Process...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console monitoring
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('imported') || text.includes('Imported') || 
          text.includes('✅') || text.includes('Smart Bulk')) {
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
    
    // Click on Status tab to see campaign cards
    console.log('\n3️⃣ Opening Status tab...');
    const statusTab = await page.locator('[role="tab"]:has-text("Status")').first();
    if (await statusTab.isVisible()) {
      await statusTab.click();
      await page.waitForTimeout(3000);
      console.log('   ✓ Status tab opened');
    }
    
    // Find Adzuna Marketing campaign and record imported count BEFORE
    console.log('\n4️⃣ Finding Adzuna Marketing campaign and checking imported count...');
    const campaignCards = await page.$$('.border.rounded-lg.p-4');
    
    let adzunaCard = null;
    let importedBefore = 0;
    
    for (const card of campaignCards) {
      const text = await card.textContent();
      if (text && text.includes('Adzuna Marketing')) {
        adzunaCard = card;
        console.log('   ✓ Found Adzuna Marketing campaign');
        
        // Extract imported count
        const importedMatch = text.match(/imported:\s*(\d+)/i) || text.match(/(\d+)\s*imported/i);
        if (importedMatch) {
          importedBefore = parseInt(importedMatch[1]);
          console.log(`   📊 Current imported count: ${importedBefore}`);
        }
        break;
      }
    }
    
    if (!adzunaCard) {
      console.log('   ❌ Adzuna Marketing campaign not found!');
      return;
    }
    
    // Select the campaign
    const checkbox = await adzunaCard.$('button:has(.h-5.w-5)');
    if (checkbox) {
      await checkbox.click();
      console.log('   ✓ Campaign selected');
      await page.waitForTimeout(500);
    }
    
    // Take screenshot before
    await page.screenshot({ path: '/tmp/import_count_before.png' });
    console.log('   📸 Before screenshot: /tmp/import_count_before.png');
    
    // Find and click Smart Bulk Process button
    console.log('\n5️⃣ Clicking Smart Bulk Process button...');
    const smartBulkButton = await page.locator('button:has-text("🤖 Smart Bulk Process")').first();
    
    if (await smartBulkButton.isVisible()) {
      await smartBulkButton.click();
      console.log('   ✓ Smart Bulk Process started');
      
      // Wait for processing to complete
      console.log('\n6️⃣ Waiting for processing to complete (up to 60 seconds)...');
      
      // Wait until button is no longer showing "Processing"
      let processingComplete = false;
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(1000);
        
        const buttonText = await smartBulkButton.textContent().catch(() => null);
        if (buttonText && !buttonText.includes('Processing')) {
          processingComplete = true;
          console.log('   ✓ Processing completed');
          break;
        }
        
        if (i % 5 === 0) {
          console.log(`   ⏱️ Still processing... (${i} seconds)`);
        }
      }
      
      if (!processingComplete) {
        console.log('   ⚠️ Processing timeout after 60 seconds');
      }
      
      // Wait a bit for UI to update
      await page.waitForTimeout(3000);
      
      // Re-fetch campaign cards to check new imported count
      console.log('\n7️⃣ Checking imported count AFTER processing...');
      const updatedCards = await page.$$('.border.rounded-lg.p-4');
      
      let importedAfter = 0;
      for (const card of updatedCards) {
        const text = await card.textContent();
        if (text && text.includes('Adzuna Marketing')) {
          const importedMatch = text.match(/imported:\s*(\d+)/i) || text.match(/(\d+)\s*imported/i);
          if (importedMatch) {
            importedAfter = parseInt(importedMatch[1]);
            console.log(`   📊 New imported count: ${importedAfter}`);
          }
          break;
        }
      }
      
      // Take screenshot after
      await page.screenshot({ path: '/tmp/import_count_after.png' });
      console.log('   📸 After screenshot: /tmp/import_count_after.png');
      
      // Report results
      console.log('\n📊 RESULTS:');
      console.log(`   Before: ${importedBefore} imported`);
      console.log(`   After:  ${importedAfter} imported`);
      console.log(`   Change: ${importedAfter - importedBefore} new imports`);
      
      if (importedAfter > importedBefore) {
        console.log('\n✅ SUCCESS! Import count increased by ' + (importedAfter - importedBefore));
      } else if (importedAfter === importedBefore) {
        console.log('\n⚠️ WARNING: Import count did not change. Either:');
        console.log('   - No new emails to import');
        console.log('   - UI is not updating properly');
        console.log('   - Import failed silently');
      } else {
        console.log('\n❌ ERROR: Import count decreased somehow!');
      }
      
    } else {
      console.log('   ❌ Smart Bulk Process button not found!');
    }
    
    console.log('\n✅ Test complete!');
    console.log('Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testImportCountIncrement();