const puppeteer = require('puppeteer');

async function testManual() {
  console.log('Starting manual verification test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('2. Waiting for login form...');
    await page.waitForSelector('input[type="email"]');
    
    console.log('3. Logging in...');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    console.log('4. Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('5. Checking current URL...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    console.log('6. Looking for workflow creation...');
    const pageContent = await page.content();
    
    // Check if there's a workflow creation link or button
    if (pageContent.includes('Create') || pageContent.includes('Workflow')) {
      console.log('Found workflow-related content');
      
      // Try to find and click create workflow
      try {
        await page.click('text=Create New Workflow');
        console.log('Clicked Create New Workflow');
      } catch (e) {
        console.log('Could not click Create New Workflow, trying other options...');
        
        // Try different selectors
        const selectors = ['button:has-text("Create")', 'a:has-text("Create")', '[href*="workflow"]'];
        for (const selector of selectors) {
          try {
            await page.click(selector);
            console.log(`Clicked ${selector}`);
            break;
          } catch (err) {
            console.log(`${selector} not found`);
          }
        }
      }
    }
    
    console.log('7. I will now manually navigate to check an existing workflow...');
    
    // Let's try to navigate directly to a workflow page
    await page.goto('http://localhost:3000/workflow/new');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('8. Current URL after navigation:', page.url());
    
    // Check if we're on workflow page
    const workflowPageContent = await page.content();
    if (workflowPageContent.includes('Topic Generation')) {
      console.log('✅ Found workflow page with Topic Generation!');
      
      // Now let's test the Topic Generation step
      console.log('9. Testing Topic Generation step...');
      
      await page.click('text=Topic Generation');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Look for Step 2f
      if (await page.$('text=Step 2f')) {
        console.log('Found Step 2f, expanding...');
        await page.click('text=Step 2f: Validate in Ahrefs');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for the Ahrefs link
        const ahrefsLink = await page.$('a[href="https://app.ahrefs.com/keywords-explorer"]');
        if (ahrefsLink) {
          console.log('✅ SUCCESS: Found new direct Ahrefs link!');
          
          // Check for instructions
          const instructions = await page.$('text=Copy your keyword list from Step 2e above');
          if (instructions) {
            console.log('✅ SUCCESS: Found new instructions!');
            
            // Check that old dynamic URL is gone
            const oldDynamicUrl = await page.$('a[href*="encodeURIComponent"]');
            if (!oldDynamicUrl) {
              console.log('✅ SUCCESS: Old dynamic URL is gone!');
              console.log('🎉 ALL TESTS PASSED - CHANGES VERIFIED!');
              return true;
            } else {
              console.log('❌ FAILED: Old dynamic URL still exists!');
              return false;
            }
          } else {
            console.log('❌ FAILED: New instructions not found!');
            return false;
          }
        } else {
          console.log('❌ FAILED: New direct Ahrefs link not found!');
          return false;
        }
      } else {
        console.log('❌ Could not find Step 2f');
        return false;
      }
    } else {
      console.log('❌ Could not find Topic Generation on workflow page');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  } finally {
    // Keep browser open for manual verification
    console.log('Keeping browser open for 30 seconds for manual verification...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

testManual().then(success => {
  console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});