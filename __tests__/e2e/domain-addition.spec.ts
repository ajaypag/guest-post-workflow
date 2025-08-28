import { test, expect } from '@playwright/test';

test('test domain addition from suggestions', async ({ page }) => {
  // Set slow timeout for slow server
  test.setTimeout(120000);
  
  // Login as test user
  await page.goto('http://localhost:3004/login');
  
  // Fill login form (give time to load)
  await page.waitForTimeout(2000);
  await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
  await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
  
  // Click sign in
  await page.click('button[type="submit"]');
  
  // Wait for redirect to home page (/)
  await page.waitForURL('**/');
  console.log('✅ Login successful, redirected to home page');
  
  // Navigate to the order review page
  await page.goto('http://localhost:3004/orders/1176a884-7825-4c73-99f3-9d3fae687bf8/review');
  
  // Wait for page to load (slow server, give it time)
  await page.waitForTimeout(5000);
  
  // Count initial line items in the AI Apply order table
  const lineItemsTable = page.locator('table').first(); // First table should be line items
  const initialLineItems = await lineItemsTable.locator('tbody tr').count();
  console.log(`Initial line items count: ${initialLineItems}`);
  
  // Debug: dump page content to see what's actually there
  console.log('🔍 Page content:');
  const pageContent = await page.textContent('body');
  console.log(pageContent?.substring(0, 500) + '...');
  
  // Look for suggested sites section and expand if collapsed
  const suggestedSitesHeader = page.locator('text=Suggested Sites to Add');
  const isHeaderVisible = await suggestedSitesHeader.isVisible();
  console.log('Suggested Sites header visible:', isHeaderVisible);
  
  if (!isHeaderVisible) {
    // Try alternative selectors
    console.log('Trying alternative selectors...');
    const altHeader1 = page.locator('h3:has-text("Suggested Sites")');
    const altHeader2 = page.locator('[class*="suggestions"]');
    const altHeader3 = page.locator('text=Sites to Add');
    
    console.log('Alt header 1 visible:', await altHeader1.isVisible());
    console.log('Alt header 2 visible:', await altHeader2.isVisible()); 
    console.log('Alt header 3 visible:', await altHeader3.isVisible());
    
    // If none found, maybe the page hasn't fully loaded
    console.log('Waiting longer for page to load...');
    await page.waitForTimeout(10000);
  }
  
  await expect(suggestedSitesHeader).toBeVisible({ timeout: 5000 });
  
  // Check if collapsed by looking for chevron direction
  const headerButton = suggestedSitesHeader.locator('..').locator('button').first();
  const chevronDown = headerButton.locator('[data-lucide="chevron-down"]');
  const isExpanded = await chevronDown.isVisible();
  
  if (!isExpanded) {
    console.log('📂 Expanding suggested sites section...');
    await headerButton.click();
    await page.waitForTimeout(2000);
  }
  
  // Wait for suggestions table to load
  await page.waitForTimeout(3000);
  
  // Look for skyryedesign.com specifically
  const skyryeRow = page.locator('tr:has-text("skyryedesign.com")');
  if (await skyryeRow.count() === 0) {
    console.log('❌ skyryedesign.com not found, using first available domain');
    const firstRow = page.locator('table').last().locator('tbody tr').first();
    const addButton = firstRow.locator('button:has-text("Add New")');
    
    console.log('🖱️  Clicking Add New for first domain...');
    await addButton.click();
  } else {
    console.log('🎯 Found skyryedesign.com, clicking Add New...');
    const addButton = skyryeRow.locator('button:has-text("Add New")');
    await addButton.click();
  }
  
  // Wait for page refresh/update (slow server)
  await page.waitForTimeout(5000);
  
  // Reload page to see updated table
  await page.reload();
  await page.waitForTimeout(5000);
  
  // Count final line items
  const finalLineItemsTable = page.locator('table').first();
  const finalLineItems = await finalLineItemsTable.locator('tbody tr').count();
  console.log(`Final line items count: ${finalLineItems}`);
  
  if (finalLineItems > initialLineItems) {
    console.log('✅ Line item was added successfully');
    
    // Check the last added line item for domain assignment
    const lastLineItem = finalLineItemsTable.locator('tbody tr').last();
    const domainCell = lastLineItem.locator('td').first();
    const domainText = await domainCell.textContent();
    
    console.log(`Domain assignment text: "${domainText?.trim()}"`);
    
    if (domainText?.includes('No domain assigned')) {
      console.log('❌ BUG CONFIRMED: Domain shows as "No domain assigned"');
      console.log('🔍 Need to diagnose why assignedDomain field is not being set');
    } else {
      console.log('✅ Domain appears to be assigned correctly');
    }
  } else {
    console.log('❌ Line item was not added - no count increase');
  }
});