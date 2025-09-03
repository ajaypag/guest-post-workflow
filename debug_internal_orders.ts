import { chromium } from 'playwright';

async function debugInternalOrdersError() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console logs and network errors
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
  });
  
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('=== Logging into internal system ===');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"]', 'FA64!$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    console.log('Login completed, current URL:', page.url());
    
    console.log('=== Navigating to problematic orders page ===');
    await page.goto('http://localhost:3000/orders/474e3625-4140-4919-870e-94497bc81202/internal');
    
    await page.waitForTimeout(8000); // Give it time to load and show errors
    
    console.log('Final URL:', page.url());
    
    // Check for specific error messages
    const pageContent = await page.textContent('body');
    if (pageContent?.includes('Failed to load orders')) {
      console.log('❌ FOUND: "Failed to load orders" error on page');
    }
    
    if (pageContent?.includes('Error')) {
      console.log('❌ Found general error text on page');
    }
    
    // Look for loading states
    if (pageContent?.includes('Loading')) {
      console.log('📄 Found loading text - might be stuck loading');
    }
    
    // Check for red error text
    const errorElements = await page.locator('.text-red-600, .text-red-800').all();
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text?.trim()) {
        console.log('❌ RED ERROR TEXT:', text);
      }
    }
    
    console.log('=== Waiting for final state ===');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  } finally {
    await browser.close();
  }
}

debugInternalOrdersError().catch(console.error);