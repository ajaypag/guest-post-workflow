const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('\n🔵 Testing new order flow from vetted-sites page\n');
    
    // First go to login page
    await page.goto('http://localhost:3004/login');
    await page.waitForTimeout(1000);
    
    // Login
    await page.fill('input[name="email"]', 'zaid@ppcmasterminds.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await page.waitForTimeout(2000);
    
    // Now navigate to vetted sites page
    await page.goto('http://localhost:3004/vetted-sites');
    
    // Wait for vetted sites to load
    await page.waitForSelector('h1:has-text("Vetted Sites")', { timeout: 10000 });
    console.log('✅ Logged in and on vetted-sites page');
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Clear any existing selection from sessionStorage
    await page.evaluate(() => {
      sessionStorage.removeItem('vetted-sites-selection');
    });
    console.log('✅ Cleared previous selection');
    
    // Find checkboxes in table rows (not header checkbox)
    const rowCheckboxes = await page.$$('tbody input[type="checkbox"]');
    console.log(`Found ${rowCheckboxes.length} domain checkboxes`);
    
    // Select first 3 domains
    for (let i = 0; i < 3 && i < rowCheckboxes.length; i++) {
      await rowCheckboxes[i].click();
      await page.waitForTimeout(300);
      console.log(`  Clicked checkbox ${i + 1}`);
    }
    console.log('✅ Selected 3 domains');
    
    // Wait for selection bar to appear
    await page.waitForTimeout(500);
    
    // Check if selection bar is visible
    const selectionBar = await page.$('text=/[0-9]+ domains? selected/');
    if (selectionBar) {
      console.log('✅ Selection bar appeared');
      
      // Now look for Add to Order button
      const addToOrderButton = await page.$('button:has-text("Add to Order")');
      if (addToOrderButton) {
        console.log('✅ Add to Order button found');
        await addToOrderButton.click();
        console.log('✅ Clicked Add to Order button');
        
        // Wait for modal to appear
        await page.waitForSelector('text=Add to Existing Order', { timeout: 5000 });
        console.log('✅ Add to Order modal opened');
        
        // Check if there are existing orders or need to create new
        const existingOrders = await page.$$('input[type="radio"][name="order"]');
        
        if (existingOrders.length > 0) {
          console.log(`Found ${existingOrders.length} existing orders`);
          // Select first order
          await existingOrders[0].click();
          await page.waitForTimeout(500);
          
          // Click Add to Order in modal
          const modalAddButton = await page.$('button:has-text("Add to Order"):not(:has-text("Export"))');
          if (modalAddButton) {
            await modalAddButton.click();
            console.log('⏳ Adding to existing order...');
            
            // Wait for navigation to edit page
            await page.waitForURL('**/orders/**/edit', { timeout: 10000 });
            console.log('✅ Added to order and navigated to edit page');
          }
          
        } else {
          // No existing orders, create new
          console.log('No existing orders found, looking for create new option');
          
          const createNewButton = await page.$('button:has-text("Create New Order")');
          if (createNewButton) {
            await createNewButton.click();
            
            // Wait for Quick Order modal
            await page.waitForSelector('text=Quick Order', { timeout: 5000 });
            console.log('✅ Quick Order modal opened');
            
            // Check that rush delivery and client review options are gone
            const rushDeliveryOption = await page.$('text=Rush Delivery');
            const clientReviewOption = await page.$('text=Client Review');
            
            if (!rushDeliveryOption && !clientReviewOption) {
              console.log('✅ Non-existent features (Rush Delivery, Client Review) removed successfully');
            } else {
              console.log('❌ Found non-existent features that should have been removed');
            }
            
            // Check pricing summary
            const pricingSummary = await page.$('text=Base Price');
            if (pricingSummary) {
              console.log('✅ Pricing summary visible');
            }
            
            // Create the order
            await page.click('button:has-text("Create Order")');
            console.log('⏳ Creating order...');
            
            // Wait for navigation to edit page
            await page.waitForURL('**/orders/**/edit', { timeout: 10000 });
            console.log('✅ Order created and navigated to edit page');
          }
        }
        
        // Check that domains are visible in the edit page
        await page.waitForTimeout(1000);
        const domainHeader = await page.$('th:has-text("Domain")');
        if (domainHeader) {
          console.log('✅ Domain column header visible in edit page');
          
          // Check for actual domain values
          const domainValues = await page.$$('td .text-blue-600');
          console.log(`✅ Found ${domainValues.length} domains displayed in edit page`);
          
          // Check that no duplicate price columns exist
          const priceHeaders = await page.$$('th:has-text("Price")');
          const investmentHeaders = await page.$$('th:has-text("Investment Details")');
          
          if (priceHeaders.length === 0 && investmentHeaders.length > 0) {
            console.log('✅ Duplicate Price column removed, only Investment Details remains');
          } else if (priceHeaders.length > 0) {
            console.log(`⚠️ Found ${priceHeaders.length} Price column(s) - should be removed`);
          }
        }
        
      } else {
        console.log('❌ Add to Order button not found in selection bar');
        await page.screenshot({ path: 'selection-bar-issue.png', fullPage: true });
      }
    } else {
      console.log('❌ Selection bar did not appear after selecting domains');
      
      // Check selection state in sessionStorage
      const selectionState = await page.evaluate(() => {
        const stored = sessionStorage.getItem('vetted-sites-selection');
        return stored ? JSON.parse(stored) : null;
      });
      console.log('Selection state in sessionStorage:', selectionState);
    }
    
    console.log('\n✅ New order flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot on error
    await page.screenshot({ path: 'new-order-flow-error.png', fullPage: true });
    console.log('📸 Screenshot saved: new-order-flow-error.png');
  }
  
  await browser.close();
})();