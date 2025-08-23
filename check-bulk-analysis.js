const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    // Fill in login credentials
    console.log('Logging in...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('Dashboard redirect not found, continuing...');
    });
    
    // Navigate to the bulk analysis page
    console.log('Navigating to bulk analysis page...');
    await page.goto('http://localhost:3000/clients/aca65919-c0f9-49d0-888b-2c488f7580dc/bulk-analysis');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for the order badge display or project info
    console.log('Checking for order information...');
    
    // Take a screenshot for inspection
    await page.screenshot({ path: 'bulk-analysis-page.png', fullPage: true });
    console.log('Screenshot saved as bulk-analysis-page.png');
    
    // Check if there are any elements with "target-page:" text
    const targetPageElements = await page.$$('text=/target-page:/');
    if (targetPageElements.length > 0) {
      console.log(`Found ${targetPageElements.length} elements with "target-page:" text`);
      
      // Get the text content of these elements
      for (const element of targetPageElements) {
        const text = await element.textContent();
        console.log('Element text:', text);
      }
    } else {
      console.log('No "target-page:" text found on the page');
    }
    
    // Check for order-group text
    const orderGroupElements = await page.$$('text=/order-group:/');
    if (orderGroupElements.length > 0) {
      console.log(`Found ${orderGroupElements.length} elements with "order-group:" text`);
      
      for (const element of orderGroupElements) {
        const text = await element.textContent();
        console.log('Element text:', text);
      }
    } else {
      console.log('No "order-group:" text found on the page');
    }
    
    // Look for any project cards
    const projectCards = await page.$$('.bg-white.rounded-lg.shadow');
    console.log(`Found ${projectCards.length} project cards`);
    
    // Click on the first project if available
    if (projectCards.length > 0) {
      console.log('Clicking on first project...');
      await projectCards[0].click();
      await page.waitForLoadState('networkidle');
      
      // Take another screenshot
      await page.screenshot({ path: 'project-details-page.png', fullPage: true });
      console.log('Project details screenshot saved as project-details-page.png');
      
      // Check for tags in project details
      const tagsInDetails = await page.$$('text=/target-page:/');
      if (tagsInDetails.length > 0) {
        console.log('Found target-page tags in project details');
        for (const element of tagsInDetails) {
          const text = await element.textContent();
          console.log('Tag text:', text);
        }
      }
    }
    
    console.log('Check complete!');
    
  } catch (error) {
    console.error('Error during check:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }
  
  // Keep browser open for manual inspection
  console.log('Browser will stay open for inspection. Press Ctrl+C to close.');
  await new Promise(() => {}); // Keep the script running
})();