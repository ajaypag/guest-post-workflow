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
    await new Promise(resolve => setTimeout(resolve, 5000)); // Longer wait
    
    // Step 3: Click "For Existing Account"
    console.log('Step 4: Looking for "For Existing Account" button...');
    const foundButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetButton = buttons.find(button => 
        button.textContent.includes('For Existing Account')
      );
      if (targetButton) {
        console.log('Found button, clicking it...');
        targetButton.click();
        return true;
      }
      return false;
    });
    
    if (foundButton) {
      console.log('✅ Clicked "For Existing Account" button');
      console.log('⏳ Waiting for form to load...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for form to appear
    } else {
      console.log('❌ "For Existing Account" button not found');
    }
    
    // Check what's on the page now
    console.log('\nStep 5: Checking page state after clicking...');
    const pageState = await page.evaluate(() => {
      return {
        hasAccountSelect: !!document.querySelector('select'),
        hasNameInput: !!document.querySelector('input[name="name"]'),
        hasWebsiteInput: !!document.querySelector('input[name="website"]'),
        hasSubmitButton: !!document.querySelector('button[type="submit"]'),
        selectVisible: document.querySelector('select')?.offsetParent !== null,
        formElements: Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
          tag: el.tagName,
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder')
        })).slice(0, 10),
        visibleText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Page state:');
    console.log('  - Has account select:', pageState.hasAccountSelect);
    console.log('  - Has name input:', pageState.hasNameInput);
    console.log('  - Has website input:', pageState.hasWebsiteInput);
    console.log('  - Has submit button:', pageState.hasSubmitButton);
    console.log('  - Select visible:', pageState.selectVisible);
    console.log('\nForm elements found:');
    pageState.formElements.forEach(el => {
      console.log(`  - ${el.tag} [name="${el.name}", type="${el.type}"]`);
    });
    
    // Try to wait for select to appear
    if (!pageState.hasAccountSelect) {
      console.log('\n⏳ Waiting longer for account select to appear...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const hasSelectNow = await page.evaluate(() => !!document.querySelector('select'));
      if (hasSelectNow) {
        console.log('✅ Account select appeared after waiting');
      } else {
        console.log('❌ Account select still not found');
        
        // Check if we need to click something else
        const pathIndicator = await page.evaluate(() => {
          const indicator = document.querySelector('[class*="blue-50"]');
          return indicator ? indicator.textContent : null;
        });
        console.log('Path indicator:', pathIndicator);
      }
    }
    
    // Step 4: Try to select account
    const hasSelect = await page.evaluate(() => !!document.querySelector('select'));
    
    if (hasSelect) {
      console.log('\n✅ Found account dropdown');
      
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
        
        // Select the account
        await page.select('select', abelinoAccount.value);
        console.log('✅ Selected abelino@factbites.com account');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('❌ Could not find abelino@factbites.com account');
        console.log('Available accounts (showing all):');
        accountOptions.forEach((acc, i) => {
          console.log(`   ${i+1}. ${acc.text}`);
        });
      }
    }
    
    // Step 5: Try to fill form whether we found select or not
    const hasForm = await page.evaluate(() => {
      return !!(document.querySelector('input[name="name"]') && 
                document.querySelector('input[name="website"]'));
    });
    
    if (hasForm) {
      console.log('\nStep 6: Filling in client details...');
      console.log('   Brand Name: AIApply');
      console.log('   Website: https://aiapply.co/');
      
      await page.type('input[name="name"]', 'AIApply');
      await page.type('input[name="website"]', 'https://aiapply.co/');
      
      const hasDescription = await page.evaluate(() => !!document.querySelector('textarea[name="description"]'));
      if (hasDescription) {
        await page.type('textarea[name="description"]', 'Testing duplicate detection');
      }
      
      console.log('✅ Form filled\n');
      
      // Step 6: Submit form
      console.log('Step 7: Clicking Create Client button...');
      await page.click('button[type="submit"]');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 7: Check for error message
      console.log('Step 8: Checking for error message...\n');
      const errorMessage = await page.evaluate(() => {
        const errorElements = [
          ...document.querySelectorAll('[class*="text-red"]'),
          ...document.querySelectorAll('[class*="error"]'),
          ...document.querySelectorAll('[class*="alert"]'),
          ...document.querySelectorAll('.text-red-500'),
          ...document.querySelectorAll('.text-red-600')
        ];
        
        for (const el of errorElements) {
          const text = el.textContent.trim();
          if (text.includes('already exists')) {
            return text;
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
      } else {
        const currentUrl = page.url();
        if (currentUrl.includes('/clients') && !currentUrl.includes('/new')) {
          console.log('✅ Client created successfully - redirected to:', currentUrl);
        } else {
          console.log('⚠️ No error found, checking page for any messages...');
          const pageText = await page.evaluate(() => document.body.innerText);
          if (pageText.includes('already exists')) {
            console.log('Found "already exists" text in page');
          }
        }
      }
      
      // Take a screenshot
      await page.screenshot({ path: 'duplicate-error-screenshot.png' });
      console.log('📸 Screenshot saved as duplicate-error-screenshot.png');
    } else {
      console.log('\n❌ Could not find form inputs to fill');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  } finally {
    console.log('\n🔍 Browser remains open for inspection...');
  }
})();