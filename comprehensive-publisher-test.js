const { chromium } = require('playwright');

async function testCompletePublisherWorkflow() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔧 COMPREHENSIVE PUBLISHER WORKFLOW TESTING...\n');
  
  try {
    // Test 1: Publisher Registration
    console.log('=== 1. TESTING PUBLISHER REGISTRATION ===');
    
    // Check if registration page exists
    await page.goto('http://localhost:3001/publisher/signup');
    await page.waitForTimeout(3000);
    
    const signupUrl = page.url();
    console.log(`Signup page URL: ${signupUrl}`);
    
    if (signupUrl.includes('/signup')) {
      console.log('✅ Signup page loads');
      
      // Check for form elements
      const emailInput = await page.locator('input[type="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();
      const submitButton = await page.locator('button[type="submit"]').count();
      
      console.log(`   - Email input: ${emailInput > 0 ? '✅' : '❌'}`);
      console.log(`   - Password input: ${passwordInput > 0 ? '✅' : '❌'}`);
      console.log(`   - Submit button: ${submitButton > 0 ? '✅' : '❌'}`);
      
      if (emailInput > 0 && passwordInput > 0 && submitButton > 0) {
        console.log('✅ Registration form elements present');
        
        // Try to register a new publisher
        const testEmail = `test.publisher.${Date.now()}@example.com`;
        console.log(`   Attempting to register: ${testEmail}`);
        
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="contactName"]', 'Test Publisher');
        await page.fill('input[name="password"]', 'TestPassword123!');
        await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
        console.log('   - Filled all required fields (email, contactName, password, confirmPassword)');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
        
        const afterRegisterUrl = page.url();
        console.log(`   After registration URL: ${afterRegisterUrl}`);
        
        if (afterRegisterUrl !== signupUrl) {
          console.log('✅ Registration appears to work (URL changed)');
        } else {
          // Check for error messages
          const errorMessages = await page.locator('.text-red-700, .text-red-600, [class*="error"]').allTextContents();
          if (errorMessages.length > 0) {
            console.log(`❌ Registration error: ${errorMessages.join(', ')}`);
          } else {
            console.log('❌ Registration may have failed (no URL change, no errors visible)');
          }
        }
      } else {
        console.log('❌ Registration form incomplete');
      }
    } else {
      console.log('❌ Signup page not found or redirected');
    }
    
    // Test 2: Login with existing account
    console.log('\n=== 2. TESTING LOGIN ===');
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForTimeout(2000);
    
    await page.fill('#email', 'test.publisher@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const loginUrl = page.url();
    if (loginUrl.includes('/publisher') && !loginUrl.includes('/login')) {
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login failed');
      return;
    }
    
    // Test 3: Adding a Website
    console.log('\n=== 3. TESTING WEBSITE ADDITION ===');
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(3000);
    
    console.log('Websites page loaded');
    const pageContent = await page.content();
    console.log(`   - Page contains "Add" or "New": ${pageContent.includes('Add') || pageContent.includes('New') ? '✅' : '❌'}`);
    
    // Look for "Add Website" or "New Website" button/link
    const addButtons = await page.locator('a:has-text("Add"), a:has-text("New"), button:has-text("Add"), button:has-text("New")').allTextContents();
    console.log(`   - Add/New buttons found: ${addButtons.join(', ')}`);
    
    // Try navigating directly to add website page (to test if it works)
    console.log('   Testing direct navigation to /publisher/websites/new...');
    await page.goto('http://localhost:3001/publisher/websites/new');
    await page.waitForTimeout(3000);
    
    const addWebsiteUrl = page.url();
    console.log(`   Add website URL: ${addWebsiteUrl}`);
    
    if (addWebsiteUrl.includes('/new')) {
        console.log('✅ Add website page loads');
        
        // Check for website form fields
        const domainInput = await page.locator('input[name*="domain"], input[placeholder*="domain"], input[name*="website"], input[placeholder*="website"]').count();
        const submitBtn = await page.locator('button[type="submit"]').count();
        
        console.log(`   - Domain input field: ${domainInput > 0 ? '✅' : '❌'}`);
        console.log(`   - Submit button: ${submitBtn > 0 ? '✅' : '❌'}`);
        
        if (domainInput > 0 && submitBtn > 0) {
          console.log('✅ Website form elements present');
          
          // Try adding a test website
          const testDomain = `testsite${Date.now()}.com`;
          console.log(`   Attempting to add website: ${testDomain}`);
          
          await page.fill('input[name*="domain"], input[placeholder*="domain"], input[name*="website"], input[placeholder*="website"]', testDomain);
          
          // Fill any other required fields
          const categoryInputs = await page.locator('select[name*="category"], input[name*="category"]').count();
          if (categoryInputs > 0) {
            try {
              await page.selectOption('select[name*="category"]', { index: 1 });
              console.log('   - Selected category');
            } catch (e) {
              console.log('   - Could not select category');
            }
          }
          
          await page.click('button[type="submit"]');
          await page.waitForTimeout(5000);
          
          const afterAddUrl = page.url();
          console.log(`   After website add URL: ${afterAddUrl}`);
          
          if (afterAddUrl.includes('/websites') && !afterAddUrl.includes('/new')) {
            console.log('✅ Website addition appears successful (redirected to list)');
          } else {
            const errorMessages = await page.locator('.text-red-700, .text-red-600, [class*="error"]').allTextContents();
            console.log(`❌ Website addition may have failed. Errors: ${errorMessages.join(', ')}`);
          }
        } else {
          console.log('❌ Website form incomplete');
        }
      } else {
        console.log('❌ Add website page not reached');
      }
    
    // Test 4: Adding an Offering
    console.log('\n=== 4. TESTING OFFERING ADDITION ===');
    await page.goto('http://localhost:3001/publisher/offerings');
    await page.waitForTimeout(3000);
    
    console.log('Offerings page loaded');
    const offeringsContent = await page.content();
    console.log(`   - Page contains "New" or "Add": ${offeringsContent.includes('New') || offeringsContent.includes('Add') ? '✅' : '❌'}`);
    
    // Try navigating directly to new offering page
    console.log('   Testing direct navigation to /publisher/offerings/new...');
    await page.goto('http://localhost:3001/publisher/offerings/new');
    await page.waitForTimeout(3000);
    
    const newOfferingUrl = page.url();
    console.log(`   New offering URL: ${newOfferingUrl}`);
    
    if (newOfferingUrl.includes('/new')) {
        console.log('✅ New offering page loads');
        
        // Check for offering form fields
        const priceInput = await page.locator('input[type="number"], input[placeholder*="250"], input[placeholder*="price"]').count();
        const typeSelect = await page.locator('select').count();
        const submitBtn = await page.locator('button[type="submit"]').count();
        
        console.log(`   - Price input: ${priceInput > 0 ? '✅' : '❌'}`);
        console.log(`   - Type selector: ${typeSelect > 0 ? '✅' : '❌'}`);
        console.log(`   - Submit button: ${submitBtn > 0 ? '✅' : '❌'}`);
        
        if (priceInput > 0 && submitBtn > 0) {
          console.log('✅ Offering form elements present');
          
          // Fill out offering form
          console.log('   Filling out offering form...');
          
          if (typeSelect > 0) {
            await page.selectOption('select', { index: 0 });
          }
          
          await page.fill('input[type="number"]', '250.00');
          
          // Fill other common fields
          const turnaroundInputs = await page.locator('input[name*="turnaround"], input[name*="days"]').count();
          if (turnaroundInputs > 0) {
            await page.fill('input[name*="turnaround"], input[name*="days"]', '7');
          }
          
          const wordCountInputs = await page.locator('input[name*="word"], input[name*="count"]').count();
          if (wordCountInputs > 0) {
            await page.fill('input[name*="word"], input[name*="count"]', '1000');
          }
          
          await page.click('button[type="submit"]');
          await page.waitForTimeout(5000);
          
          const afterOfferingUrl = page.url();
          console.log(`   After offering add URL: ${afterOfferingUrl}`);
          
          if (afterOfferingUrl.includes('/offerings') && !afterOfferingUrl.includes('/new')) {
            console.log('✅ Offering addition appears successful');
          } else {
            const errorMessages = await page.locator('.text-red-700, .text-red-600, [class*="error"]').allTextContents();
            console.log(`❌ Offering addition may have failed. Errors: ${errorMessages.join(', ')}`);
          }
        } else {
          console.log('❌ Offering form incomplete');
        }
      } else {
        console.log('❌ New offering page not reached');
      }
    
    // Test 5: Data Persistence Check
    console.log('\n=== 5. TESTING DATA PERSISTENCE ===');
    
    // Check if added data persists by refreshing pages
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(3000);
    
    const websitesPageContent = await page.content();
    const hasWebsiteEntries = websitesPageContent.includes('testsite') || websitesPageContent.includes('.com');
    console.log(`   - Websites list contains entries: ${hasWebsiteEntries ? '✅' : '❌'}`);
    
    await page.goto('http://localhost:3001/publisher/offerings');
    await page.waitForTimeout(3000);
    
    const offeringsPageContent = await page.content();
    const hasOfferingEntries = offeringsPageContent.includes('$250') || offeringsPageContent.includes('250.00') || offeringsPageContent.includes('Guest Post');
    console.log(`   - Offerings list contains entries: ${hasOfferingEntries ? '✅' : '❌'}`);
    
    console.log('\n🎉 COMPREHENSIVE TESTING COMPLETED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCompletePublisherWorkflow();