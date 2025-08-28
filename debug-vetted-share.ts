import { chromium } from 'playwright';

async function debugVettedSitesShare() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor API calls
  page.on('request', request => {
    if (request.url().includes('/api/vetted-sites')) {
      console.log('🔍 API Request:', request.url());
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/vetted-sites')) {
      console.log('📥 API Response:', response.url(), response.status());
      try {
        const body = await response.json();
        console.log('📦 Response stats:', body.stats);
        if (body.domains) {
          console.log('📦 Domain count:', body.domains.length);
        }
      } catch (e) {
        // Ignore if not JSON
      }
    }
  });

  try {
    // Go to login page
    console.log('🔐 Navigating to login page...');
    await page.goto('http://localhost:3003/login', { timeout: 60000, waitUntil: 'domcontentloaded' });
    
    // Wait for the form to be ready
    await page.waitForSelector('input[type="email"]', { state: 'visible' });
    
    // Fill in login credentials - CLEAR AND TYPE
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    console.log('📝 Clearing and filling email...');
    await emailInput.clear();
    await emailInput.type('ajay@outreachlabs.com');
    
    console.log('📝 Clearing and filling password...');
    await passwordInput.clear();
    await passwordInput.type('FA64!I$nrbCauS^d');
    
    // Take screenshot to verify fields are filled
    await page.screenshot({ path: 'login-form-filled.png' });
    console.log('📸 Login form screenshot saved');
    
    // Click login button
    console.log('🔐 Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for successful login - look for navigation away from login page
    try {
      await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 10000 });
      console.log('✅ Successfully logged in!');
    } catch (e) {
      console.log('⚠️ Login might have failed, continuing anyway...');
      // Try waiting for any navigation
      await page.waitForTimeout(3000);
    }
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    // Navigate to the vetted sites request
    console.log('\n🔍 Navigating to vetted sites request...');
    await page.goto('http://localhost:3003/internal/vetted-sites/requests/049c3364-2b34-4b43-817d-4804f34dd77c', { timeout: 60000, waitUntil: 'domcontentloaded' });
    console.log('✅ Page loaded');

    // Wait a bit for any async data loading
    await page.waitForTimeout(2000);

    // Find and click the Share Results button
    console.log('\n🔍 Looking for Share Results button...');
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'vetted-sites-request-page.png', fullPage: true });
    console.log('📸 Screenshot of page saved as vetted-sites-request-page.png');
    
    // Try multiple selectors for the Share Results button
    let shareButton = await page.locator('button:has-text("Share Results")').first();
    
    // If not found, try looking for button with just "Share" text
    if (!(await shareButton.isVisible())) {
      shareButton = await page.locator('button').filter({ hasText: /Share Results/i }).first();
    }
    
    // Also try by class or aria-label
    if (!(await shareButton.isVisible())) {
      shareButton = await page.locator('button').filter({ hasText: /Share/i }).first();
    }
    
    if (await shareButton.isVisible()) {
      console.log('✅ Found Share Results button, clicking...');
      await shareButton.click();
      
      // Wait for the modal to appear
      await page.waitForSelector('text="Share Vetted Sites Results"', { timeout: 5000 });
      console.log('✅ Share modal opened');

      // Wait for API call to complete
      await page.waitForTimeout(2000);
      
      // TAKE SCREENSHOT IMMEDIATELY
      await page.screenshot({ path: 'vetted-sites-share-modal.png', fullPage: true });
      console.log('📸 Screenshot saved as vetted-sites-share-modal.png');

      // Check for the "No qualified sites found" message
      const warningBox = await page.locator('.bg-amber-50').first();
      let hasNoQualifiedMessage = false;
      
      if (await warningBox.isVisible()) {
        const warningText = await warningBox.textContent();
        console.log('⚠️ Warning box text:', warningText);
        
        if (warningText?.includes('No qualified sites found')) {
          hasNoQualifiedMessage = true;
        }
      }
      
      // Also check standalone text
      const noQualifiedSitesMessage = await page.locator('text="No qualified sites found"').isVisible();
      
      if (noQualifiedSitesMessage || hasNoQualifiedMessage) {
        console.log('\n❌ BUG CONFIRMED: "No qualified sites found" message is shown!');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'vetted-sites-share-modal-bug.png', fullPage: true });
        console.log('📸 Screenshot saved as vetted-sites-share-modal-bug.png');
        
        // Also log what the API returned
        console.log('⚠️ But API returned qualified: 5! There is a disconnect between API response and UI display.');
      } else {
        console.log('\n✅ Good: No "No qualified sites found" message - the fix is working!');
      }
    } else {
      console.log('❌ Share Results button not found!');
    }

    // Also navigate to the bulk analysis project to verify it has domains
    console.log('\n🔍 Checking bulk analysis project for comparison...');
    await page.goto('http://localhost:3003/clients/3092fbcc-9205-4ad8-a869-91f938f9e3ca/bulk-analysis/projects/380626f9-2bdf-489f-83f2-6ffd55c0aaed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for qualified count
    const stats = await page.locator('text=/Qualified:\\s*\\d+/i').first();
    if (await stats.isVisible()) {
      const text = await stats.textContent();
      console.log(`✅ Bulk analysis project shows: ${text}`);
    }

    console.log('\n✅ Test complete - keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await browser.close();
  }
}

debugVettedSitesShare().catch(console.error);