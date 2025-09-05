const { chromium } = require('playwright');

async function testFixedFlow() {
  console.log('🧪 Testing ManyReach flow with fixed button visibility...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Show browser for debugging
    slowMo: 500 // Slow down actions to observe
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Open browser console to capture logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔵') || text.includes('📊') || 
          text.includes('🌐') || text.includes('✅') ||
          text.includes('⚠️') || text.includes('🔍')) {
        console.log('   BROWSER LOG:', text);
      }
    });
    
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
    
    // The "Check for new emails" button should now be visible immediately
    console.log('4️⃣ Looking for "Check for new emails" button...');
    await page.waitForTimeout(1000); // Wait for React to render
    
    const checkEmailsButton = await page.locator('button:has-text("Check for new emails")').first();
    const isVisible = await checkEmailsButton.isVisible();
    console.log(`   Button visible: ${isVisible}`);
    
    if (!isVisible) {
      console.log('   ❌ Button not visible, taking screenshot...');
      await page.screenshot({ path: '/tmp/button_not_visible.png' });
    } else {
      console.log('   ✅ Button is visible!');
      
      // Check if button is disabled (should be disabled when no campaigns selected)
      const isDisabled = await checkEmailsButton.isDisabled();
      console.log(`   Button disabled: ${isDisabled} (should be true when nothing selected)`);
      
      // Now select a campaign using the checkbox
      console.log('\n5️⃣ Selecting a campaign...');
      
      // Find the first checkbox button (Square or CheckSquare icon inside a button)
      const checkboxButton = await page.locator('button:has(.h-5.w-5)').first();
      if (await checkboxButton.isVisible()) {
        await checkboxButton.click();
        console.log('   ✓ Clicked checkbox to select campaign');
        await page.waitForTimeout(500);
        
        // Check button status again
        const isDisabledAfter = await checkEmailsButton.isDisabled();
        console.log(`   Button disabled after selection: ${isDisabledAfter} (should be false)`);
        
        // Take screenshot showing selected state
        await page.screenshot({ path: '/tmp/campaign_selected_fixed.png' });
        console.log('   ✓ Screenshot saved to /tmp/campaign_selected_fixed.png');
        
        if (!isDisabledAfter) {
          console.log('\n6️⃣ Clicking "Check for new emails" button...');
          await checkEmailsButton.click();
          
          // Wait for the analysis to start
          console.log('   Waiting for analysis to start...');
          await page.waitForTimeout(2000);
          
          // Look for any loading or success indicators
          const loadingIndicator = await page.locator('.animate-spin').count();
          if (loadingIndicator > 0) {
            console.log('   ✓ Analysis is running (loading spinner detected)');
            
            // Wait for completion
            await page.waitForTimeout(5000);
          }
          
          // Take final screenshot
          await page.screenshot({ path: '/tmp/after_analysis_fixed.png' });
          console.log('   ✓ Screenshot saved to /tmp/after_analysis_fixed.png');
          
          // Check for any notifications
          const notifications = await page.$$('.text-sm.p-3.rounded-lg');
          console.log(`   Found ${notifications.length} notifications`);
          
          for (const notification of notifications) {
            const text = await notification.textContent();
            console.log(`     - Notification: ${text}`);
          }
        } else {
          console.log('   ⚠️ Button is still disabled after selection');
        }
      } else {
        console.log('   ❌ Could not find checkbox button');
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

testFixedFlow();