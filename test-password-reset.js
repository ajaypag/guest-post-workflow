const { chromium } = require('playwright');

async function testPasswordResetFlow() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  
  console.log('🔧 TESTING PUBLISHER PASSWORD RESET FLOW...\n');
  
  try {
    // Test 1: Navigate to login page
    console.log('=== 1. NAVIGATING TO LOGIN PAGE ===');
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForTimeout(1000);
    
    // Test 2: Click Forgot Password link
    console.log('=== 2. CLICKING FORGOT PASSWORD LINK ===');
    const forgotLink = await page.locator('a:has-text("Forgot your password")');
    const forgotLinkExists = await forgotLink.count() > 0;
    
    if (forgotLinkExists) {
      console.log('✅ Forgot password link found');
      await forgotLink.click();
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/forgot-password')) {
        console.log('✅ Navigated to forgot password page');
      } else {
        console.log(`❌ Unexpected URL: ${currentUrl}`);
      }
    } else {
      console.log('❌ Forgot password link not found');
    }
    
    // Test 3: Submit forgot password form
    console.log('\n=== 3. TESTING FORGOT PASSWORD FORM ===');
    const forgotPageUrl = page.url();
    if (forgotPageUrl.includes('/forgot-password')) {
      // Use the test publisher email
      const testEmail = 'test.publisher@example.com';
      console.log(`   Requesting reset for: ${testEmail}`);
      
      await page.fill('input[type="email"]', testEmail);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // Check for success message
      const successText = await page.textContent('body');
      if (successText.includes('Email Sent Successfully') || successText.includes('Check Your Email')) {
        console.log('✅ Password reset email requested successfully');
      } else {
        console.log('❌ No success confirmation shown');
      }
    }
    
    // Test 4: Test reset password page (simulate clicking email link)
    console.log('\n=== 4. TESTING RESET PASSWORD PAGE ===');
    
    // Generate a test token (in real scenario, this would come from email)
    const testToken = 'test-token-123';
    await page.goto(`http://localhost:3001/publisher/reset-password?token=${testToken}`);
    await page.waitForTimeout(2000);
    
    const resetPageUrl = page.url();
    if (resetPageUrl.includes('/reset-password')) {
      console.log('✅ Reset password page loads');
      
      // Check for form elements
      const passwordInputs = await page.locator('input[type="password"]').count();
      console.log(`   - Password inputs found: ${passwordInputs}`);
      
      if (passwordInputs >= 2) {
        console.log('✅ Password reset form is present');
        
        // Try to submit with test data
        const newPassword = 'NewTestPassword123!';
        await page.fill('input[id="password"]', newPassword);
        await page.fill('input[id="confirmPassword"]', newPassword);
        
        // Note: This will fail with invalid token, but we're testing the UI flow
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // Check for error (expected with test token)
        const errorMessage = await page.locator('.text-red-700').textContent().catch(() => null);
        if (errorMessage) {
          console.log(`   - Expected error with test token: "${errorMessage}"`);
          console.log('✅ Form submission works (error expected with test token)');
        }
      } else {
        console.log('❌ Password reset form incomplete');
      }
    } else {
      console.log('❌ Reset password page not reached');
    }
    
    // Test 5: Verify all pages are accessible
    console.log('\n=== 5. VERIFYING ALL PAGES ===');
    
    const pages = [
      { url: '/publisher/login', name: 'Login' },
      { url: '/publisher/forgot-password', name: 'Forgot Password' },
      { url: '/publisher/reset-password', name: 'Reset Password' }
    ];
    
    for (const pageInfo of pages) {
      await page.goto(`http://localhost:3001${pageInfo.url}`);
      await page.waitForTimeout(1000);
      const responseUrl = page.url();
      const status = responseUrl.includes(pageInfo.url) ? '✅' : '❌';
      console.log(`   ${status} ${pageInfo.name} page: ${responseUrl.includes(pageInfo.url) ? 'accessible' : 'not found'}`);
    }
    
    // Test 6: Check website view page
    console.log('\n=== 6. TESTING WEBSITE VIEW PAGE ===');
    
    // First login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('#email', 'test.publisher@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to websites page
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(2000);
    
    // Check for view icons
    const viewIcons = await page.locator('a[href*="/publisher/websites/"][href$="/edit"]').count();
    const eyeIcons = await page.locator('svg.lucide-eye').count();
    
    console.log(`   - Edit links found: ${viewIcons}`);
    console.log(`   - Eye icons found: ${eyeIcons}`);
    
    // Try to click on a view link if available
    const viewLinks = await page.locator('a[href*="/publisher/websites/"]:not([href*="/new"]):not([href*="/edit"])').all();
    if (viewLinks.length > 0) {
      const firstViewLink = viewLinks[0];
      const href = await firstViewLink.getAttribute('href');
      console.log(`   - Clicking view link: ${href}`);
      
      await firstViewLink.click();
      await page.waitForTimeout(2000);
      
      const viewPageUrl = page.url();
      if (viewPageUrl.includes('/publisher/websites/') && !viewPageUrl.includes('/edit') && !viewPageUrl.includes('/new')) {
        console.log('✅ Website view page loads successfully');
        
        // Check for key elements
        const hasBackLink = await page.locator('a:has-text("Back to Websites")').count() > 0;
        const hasEditButton = await page.locator('a:has-text("Edit Website")').count() > 0;
        const hasStats = await page.locator('text=/Monthly Traffic|Domain Authority/').count() > 0;
        
        console.log(`   - Back link: ${hasBackLink ? '✅' : '❌'}`);
        console.log(`   - Edit button: ${hasEditButton ? '✅' : '❌'}`);
        console.log(`   - Statistics: ${hasStats ? '✅' : '❌'}`);
      } else {
        console.log('❌ Website view page did not load');
      }
    } else {
      console.log('   - No website view links found (may need to add a website first)');
    }
    
    console.log('\n🎉 PASSWORD RESET FLOW TESTING COMPLETED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testPasswordResetFlow();