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
    await page.goto('http://localhost:3005/clients/new', { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Step 4: Search for abelino in the search box
    console.log('\nStep 5: Searching for abelino@factbites.com...');
    
    // Type in the search box
    const searchInput = await page.$('input[type="text"]');
    if (searchInput) {
      console.log('✅ Found search input');
      await searchInput.click();
      await searchInput.type('abelino');
      console.log('✅ Typed "abelino" in search box');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now look for the radio button with abelino@factbites.com
      console.log('\nStep 6: Looking for abelino@factbites.com in the results...');
      
      const abelinoFound = await page.evaluate(() => {
        // Find all labels that might contain abelino
        const labels = Array.from(document.querySelectorAll('label'));
        for (const label of labels) {
          const text = label.textContent.toLowerCase();
          if (text.includes('abelino') || text.includes('factbites')) {
            console.log('Found label with:', label.textContent);
            // Find the radio button associated with this label
            const radioInput = label.querySelector('input[type="radio"]') || 
                              document.getElementById(label.getAttribute('for'));
            if (radioInput) {
              radioInput.click();
              return label.textContent.trim();
            }
          }
        }
        
        // Alternative: Look for radio buttons and their parent elements
        const radioButtons = Array.from(document.querySelectorAll('input[type="radio"][name="account"]'));
        for (const radio of radioButtons) {
          const parent = radio.closest('label') || radio.parentElement;
          if (parent) {
            const text = parent.textContent.toLowerCase();
            if (text.includes('abelino') || text.includes('factbites')) {
              console.log('Found radio with:', parent.textContent);
              radio.click();
              return parent.textContent.trim();
            }
          }
        }
        
        return null;
      });
      
      if (abelinoFound) {
        console.log(`✅ Selected account: ${abelinoFound}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('❌ Could not find abelino@factbites.com');
        
        // List all available accounts
        const accounts = await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label'));
          return labels.map(l => l.textContent.trim()).filter(t => t.includes('@'));
        });
        console.log('Available accounts found:');
        accounts.forEach(acc => console.log(`  - ${acc}`));
      }
    } else {
      console.log('❌ Could not find search input');
    }
    
    // Wait for form to appear after selecting account
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Fill in client details
    console.log('\nStep 7: Looking for form fields...');
    const hasForm = await page.evaluate(() => {
      return {
        hasName: !!document.querySelector('input[name="name"]'),
        hasWebsite: !!document.querySelector('input[name="website"]'),
        hasDescription: !!document.querySelector('textarea[name="description"]'),
        hasSubmit: !!document.querySelector('button[type="submit"]')
      };
    });
    
    console.log('Form fields found:', hasForm);
    
    if (hasForm.hasName && hasForm.hasWebsite) {
      console.log('\nStep 8: Filling in client details...');
      console.log('   Brand Name: AIApply');
      console.log('   Website: https://aiapply.co/');
      
      await page.type('input[name="name"]', 'AIApply');
      await page.type('input[name="website"]', 'https://aiapply.co/');
      
      if (hasForm.hasDescription) {
        await page.type('textarea[name="description"]', 'Testing duplicate detection for abelino account');
      }
      
      console.log('✅ Form filled\n');
      
      // Step 6: Submit form
      console.log('Step 9: Clicking Create Client button...');
      await page.click('button[type="submit"]');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 7: Check for error message
      console.log('Step 10: Checking for error message...\n');
      const errorInfo = await page.evaluate(() => {
        // Look for any red text error messages
        const errorElements = [
          ...document.querySelectorAll('[class*="text-red"]'),
          ...document.querySelectorAll('[class*="error"]'),
          ...document.querySelectorAll('[class*="alert"]'),
          ...document.querySelectorAll('.text-red-500'),
          ...document.querySelectorAll('.text-red-600'),
          ...document.querySelectorAll('div'),
          ...document.querySelectorAll('p'),
          ...document.querySelectorAll('span')
        ];
        
        for (const el of errorElements) {
          const text = el.textContent.trim();
          if (text.includes('already exists')) {
            return {
              message: text,
              className: el.className,
              tagName: el.tagName
            };
          }
        }
        return null;
      });
      
      if (errorInfo) {
        console.log('====================================');
        console.log('🔴 ERROR REPRODUCED:');
        console.log(`Message: "${errorInfo.message}"`);
        console.log(`Element: ${errorInfo.tagName}.${errorInfo.className}`);
        console.log('====================================\n');
        
        console.log('✅ Successfully reproduced the duplicate detection issue!');
        console.log('The error shows that AIApply is being blocked even though');
        console.log('we selected abelino@factbites.com account, not the OutreachLabs account.');
      } else {
        const currentUrl = page.url();
        if (currentUrl.includes('/clients') && !currentUrl.includes('/new')) {
          console.log('✅ Client created successfully!');
          console.log('No duplicate was detected for abelino@factbites.com account');
          console.log('Current URL:', currentUrl);
        } else {
          console.log('⚠️ No clear error message found');
          console.log('Current URL:', currentUrl);
          
          // Get page text to see if there's any message
          const pageText = await page.evaluate(() => {
            const body = document.body.innerText;
            // Look for relevant text
            if (body.includes('already exists')) {
              const lines = body.split('\n');
              return lines.filter(line => line.includes('already exists')).join('\n');
            }
            return null;
          });
          
          if (pageText) {
            console.log('\nFound text containing "already exists":');
            console.log(pageText);
          }
        }
      }
      
      // Take a screenshot
      await page.screenshot({ path: 'duplicate-error-reproduced.png' });
      console.log('\n📸 Screenshot saved as duplicate-error-reproduced.png');
    } else {
      console.log('❌ Could not find form fields to fill');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  } finally {
    console.log('\n🔍 Browser remains open for manual inspection...');
  }
})();