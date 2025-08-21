const puppeteer = require('puppeteer');

async function testDomainAssignmentModal() {
  console.log('🚀 Starting DomainAssignmentModal test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('📍 Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Check if we're on login page or already logged in
    const url = page.url();
    console.log('📍 Current URL:', url);
    
    // Take a screenshot of the current state
    await page.screenshot({ path: 'test-screenshot-1-initial.png' });
    console.log('📸 Screenshot saved: test-screenshot-1-initial.png');
    
    // Check if login is required
    const needsLogin = await page.evaluate(() => {
      return document.body.textContent.includes('Sign in') || 
             document.body.textContent.includes('Email') ||
             window.location.pathname === '/login';
    });
    
    if (needsLogin) {
      console.log('🔐 Login required - attempting to login...');
      
      // Try to find and fill login form
      try {
        // Look for email/username field
        const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
        await page.waitForSelector(emailSelector, { timeout: 5000 });
        await page.type(emailSelector, 'test@example.com'); // Replace with actual credentials
        
        // Look for password field
        const passwordSelector = 'input[type="password"], input[name="password"]';
        await page.waitForSelector(passwordSelector, { timeout: 5000 });
        await page.type(passwordSelector, 'password'); // Replace with actual credentials
        
        // Look for submit button
        const submitButton = 'button[type="submit"], button:has-text("Sign in"), button:has-text("Login")';
        await page.click(submitButton);
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('✅ Login successful');
      } catch (loginError) {
        console.log('⚠️ Could not complete login automatically:', loginError.message);
        console.log('Please login manually in the browser window...');
        // Wait for manual login
        await page.waitForTimeout(10000);
      }
    }
    
    // Navigate to a bulk analysis project
    console.log('📍 Looking for bulk analysis projects...');
    
    // Try to find a client link
    const hasClients = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.some(link => link.href.includes('/clients/'));
    });
    
    if (hasClients) {
      console.log('✅ Found clients - navigating to first client...');
      
      // Click on first client
      await page.evaluate(() => {
        const clientLink = Array.from(document.querySelectorAll('a')).find(link => 
          link.href.includes('/clients/') && !link.href.includes('/new')
        );
        if (clientLink) clientLink.click();
      });
      
      await page.waitForTimeout(2000);
      
      // Look for bulk analysis projects
      const hasBulkAnalysis = await page.evaluate(() => {
        return document.body.textContent.includes('Bulk Analysis') || 
               Array.from(document.querySelectorAll('a')).some(link => 
                 link.href.includes('/bulk-analysis/'));
      });
      
      if (hasBulkAnalysis) {
        console.log('✅ Found bulk analysis section');
        
        // Navigate to bulk analysis
        await page.evaluate(() => {
          const bulkLink = Array.from(document.querySelectorAll('a')).find(link => 
            link.href.includes('/bulk-analysis/')
          );
          if (bulkLink) bulkLink.click();
        });
        
        await page.waitForTimeout(3000);
        
        // Take screenshot of bulk analysis page
        await page.screenshot({ path: 'test-screenshot-2-bulk-analysis.png' });
        console.log('📸 Screenshot saved: test-screenshot-2-bulk-analysis.png');
        
        // Check for domains and "Add to Order" button
        const hasAddToOrder = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => 
            btn.textContent.includes('Add to Order') || 
            btn.textContent.includes('Add to order')
          );
        });
        
        if (hasAddToOrder) {
          console.log('✅ Found "Add to Order" button');
          
          // Try to select some domains first
          const checkboxes = await page.$$('input[type="checkbox"]');
          if (checkboxes.length > 0) {
            console.log(`📝 Found ${checkboxes.length} checkboxes - selecting first 3...`);
            for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
              await checkboxes[i].click();
              await page.waitForTimeout(500);
            }
          }
          
          // Click "Add to Order" button
          console.log('🎯 Clicking "Add to Order" button...');
          await page.evaluate(() => {
            const button = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent.includes('Add to Order') || 
              btn.textContent.includes('Add to order')
            );
            if (button) button.click();
          });
          
          // Wait for modal to appear
          await page.waitForTimeout(2000);
          
          // Check if DomainAssignmentModal opened
          const modalOpened = await page.evaluate(() => {
            return document.body.textContent.includes('Smart Domain Assignment') ||
                   document.body.textContent.includes('Add Domains to Order') ||
                   document.querySelector('[role="dialog"]') !== null;
          });
          
          if (modalOpened) {
            console.log('🎉 SUCCESS! DomainAssignmentModal is open!');
            
            // Take screenshot of the modal
            await page.screenshot({ path: 'test-screenshot-3-modal.png' });
            console.log('📸 Screenshot saved: test-screenshot-3-modal.png');
            
            // Check for smart assignment features
            const hasSmartFeatures = await page.evaluate(() => {
              const text = document.body.textContent;
              return {
                hasSmartAssignment: text.includes('Smart Assignment') || text.includes('Smart Domain'),
                hasOrderSelection: text.includes('Select an order') || text.includes('Order #'),
                hasConfidenceBadges: text.includes('Perfect') || text.includes('Good') || text.includes('Fair'),
                hasGenerateButton: text.includes('Generate') || text.includes('Regenerate')
              };
            });
            
            console.log('🔍 Modal features detected:', hasSmartFeatures);
            
            // Try to select an order if on order selection step
            const orderButtons = await page.$$('button[class*="border"]');
            if (orderButtons.length > 0) {
              console.log('📋 Found order selection options');
              // Could click on an order here to proceed to assignment step
            }
            
          } else {
            console.log('⚠️ Modal did not open - old OrderSelectionModal might still be in use');
          }
          
        } else {
          console.log('⚠️ No "Add to Order" button found - may need to select domains first');
        }
        
      } else {
        console.log('⚠️ No bulk analysis projects found');
      }
      
    } else {
      console.log('⚠️ No clients found - may need different test data');
    }
    
    console.log('\n📊 Test Summary:');
    console.log('- Server is running: ✅');
    console.log('- Page loads: ✅');
    console.log('- Modal implementation: Check screenshots for verification');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error-screenshot.png' });
    console.log('📸 Error screenshot saved: test-error-screenshot.png');
  } finally {
    console.log('\n🏁 Test complete - keeping browser open for manual inspection');
    console.log('Press Ctrl+C to close the browser and exit');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
  }
}

// Run the test
testDomainAssignmentModal().catch(console.error);