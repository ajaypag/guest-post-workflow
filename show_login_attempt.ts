import { chromium } from 'playwright';

async function showLoginAttempt() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== GOING TO LOGIN PAGE ===');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(3000);
    
    console.log('=== FILLING EMAIL ===');
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.fill('ajay@outreachlabs.com');
      console.log('Filled email: ajay@outreachlabs.com');
    } else {
      console.log('❌ NO EMAIL INPUT FOUND');
    }
    
    await page.waitForTimeout(2000);
    
    console.log('=== FILLING PASSWORD ===');
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      // Using the exact password you gave me
      await passwordInput.fill('FA64!$nrbCauS^d');
      console.log('Filled password: FA64!$nrbCauS^d');
    } else {
      console.log('❌ NO PASSWORD INPUT FOUND');
    }
    
    await page.waitForTimeout(2000);
    
    console.log('=== CLICKING LOGIN BUTTON ===');
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
      console.log('Clicked login button');
    } else {
      console.log('❌ NO LOGIN BUTTON FOUND');
    }
    
    console.log('=== WAITING FOR RESPONSE ===');
    await page.waitForTimeout(5000);
    
    console.log('=== RESULT ===');
    console.log('Current URL:', page.url());
    
    // Check for error messages
    const errorElement = await page.$('.text-red-600, .text-red-800');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('ERROR MESSAGE ON PAGE:', errorText);
    }
    
    // If login successful, go to the problematic orders page
    if (!page.url().includes('/login')) {
      console.log('✅ LOGIN SUCCESSFUL! Going to internal orders page...');
      await page.goto('http://localhost:3000/orders/474e3625-4140-4919-870e-94497bc81202/internal');
      await page.waitForTimeout(5000);
      
      // Check for the error
      const pageContent = await page.textContent('body');
      if (pageContent?.includes('Failed to load orders')) {
        console.log('❌ FOUND THE ERROR: "Failed to load orders"');
      }
    } else {
      console.log('❌ STILL ON LOGIN PAGE - LOGIN FAILED');
    }
    
    console.log('=== KEEPING BROWSER OPEN FOR 15 SECONDS ===');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Script error:', error.message);
  } finally {
    await browser.close();
  }
}

showLoginAttempt().catch(console.error);