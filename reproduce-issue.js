const puppeteer = require('puppeteer');

(async () => {
  console.log('🎯 Reproducing the duplicate detection issue...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox'],
    devtools: false
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  try {
    // Step 1: Login
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3005/login');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Step 2: Logging in as ajay@outreachlabs.com...');
    await page.type('input[type="email"]', 'ajay@outreachlabs.com');
    await page.type('input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    console.log('✅ Login successful\n');
    
    // Step 2: Navigate to new client page
    console.log('Step 3: Navigating to /clients/new...');
    await page.goto('http://localhost:3005/clients/new');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Click "For Existing Account"
    console.log('Step 4: Looking for "For Existing Account" button...');
    const foundButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetButton = buttons.find(button => 
        button.textContent.includes('For Existing Account')
      );
      if (targetButton) {
        targetButton.click();
        return true;
      }
      return false;
    });
    
    if (foundButton) {
      console.log('✅ Clicked "For Existing Account" button');
    } else {
      console.log('❌ "For Existing Account" button not found');
      console.log('Checking page structure...');
      const pageInfo = await page.evaluate(() => {
        return {
          hasForm: !!document.querySelector('input[name="name"]'),
          hasSelect: !!document.querySelector('select'),
          pageTitle: document.querySelector('h1')?.textContent,
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).slice(0, 5)
        };
      });
      console.log('Page info:', pageInfo);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Select account
    console.log('\nStep 5: Looking for account select dropdown...');
    const hasSelect = await page.evaluate(() => !!document.querySelector('select'));
    
    if (hasSelect) {
      console.log('✅ Found account dropdown');
      
      // Get all account options
      const accountOptions = await page.$$eval('select option', options => 
        options.map(option => ({ 
          value: option.value, 
          text: option.textContent.trim() 
        }))
      );
      
      console.log(`Found ${accountOptions.length} accounts`);
      
      // Find abelino@factbites.com
      const abelinoAccount = accountOptions.find(acc => 
        acc.text.toLowerCase().includes('abelino') || 
        acc.text.toLowerCase().includes('factbites')
      );
      
      if (abelinoAccount) {
        console.log(`✅ Found abelino@factbites.com account: "${abelinoAccount.text}"`);
        console.log(`   Account ID: ${abelinoAccount.value}`);
        
        // Select the account
        await page.select('select', abelinoAccount.value);
        console.log('✅ Selected abelino@factbites.com account\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('❌ Could not find abelino@factbites.com account');
        console.log('Available accounts (first 10):');
        accountOptions.slice(0, 10).forEach(acc => {
          console.log(`   - ${acc.text}`);
        });
      }
    } else {
      console.log('❌ No account dropdown found');
    }
    
    // Step 5: Fill in client details
    console.log('Step 6: Filling in client details...');
    console.log('   Brand Name: AIApply');
    console.log('   Website: https://aiapply.co/');
    
    await page.type('input[name="name"]', 'AIApply');
    await page.type('input[name="website"]', 'https://aiapply.co/');
    await page.type('textarea[name="description"]', 'Testing duplicate detection');
    
    console.log('✅ Form filled\n');
    
    // Step 6: Submit form
    console.log('Step 7: Clicking Create Client button...');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Step 7: Check for error message
    console.log('Step 8: Checking for error message...\n');
    const errorMessage = await page.evaluate(() => {
      // Look for error in multiple possible locations
      const errorElements = [
        ...document.querySelectorAll('[class*="text-red"]'),
        ...document.querySelectorAll('[class*="error"]'),
        ...document.querySelectorAll('[class*="alert"]'),
        ...document.querySelectorAll('.text-red-500'),
        ...document.querySelectorAll('.text-red-600')
      ];
      
      for (const el of errorElements) {
        if (el.textContent.includes('client with this website already exists')) {
          return el.textContent.trim();
        }
      }
      return null;
    });
    
    if (errorMessage) {
      console.log('====================================');
      console.log('🔴 ERROR REPRODUCED:');
      console.log(`"${errorMessage}"`);
      console.log('====================================\n');
      
      console.log('✅ Successfully reproduced the issue!');
      console.log('The duplicate detection is checking globally instead of per-account.');
    } else {
      const currentUrl = page.url();
      if (currentUrl.includes('/clients') && !currentUrl.includes('/new')) {
        console.log('✅ Client created successfully - no duplicate detected');
        console.log('The issue may have been fixed.');
      } else {
        console.log('⚠️ No clear error message found, but still on the form page');
        console.log('Current URL:', currentUrl);
      }
    }
    
    // Take a screenshot for evidence
    await page.screenshot({ path: 'duplicate-error-screenshot.png' });
    console.log('\n📸 Screenshot saved as duplicate-error-screenshot.png');
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  } finally {
    console.log('\n🔍 Keeping browser open for manual inspection...');
    // Keep browser open for inspection
  }
})();