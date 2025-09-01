import { chromium } from 'playwright';

async function loginTest() {
  console.log('Starting Playwright login test...');
  
  // Launch browser in headed mode so you can see it
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions so they're visible
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3001/login');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    console.log('Looking for email input field...');
    
    // Try multiple strategies to find the email field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[autocomplete="email"]',
      '#email',
      '[data-testid="email-input"]',
      'input.email-input',
      'input:has-text("email")',
      'label:has-text("Email") + input',
      'label:has-text("Email") input'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.locator(selector).first();
        if (await emailInput.isVisible({ timeout: 1000 })) {
          console.log(`Found email input using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!emailInput || !(await emailInput.isVisible())) {
      // If specific selectors don't work, try to find any visible input that might be for email
      const allInputs = await page.locator('input:visible').all();
      console.log(`Found ${allInputs.length} visible input fields`);
      
      for (const input of allInputs) {
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        const id = await input.getAttribute('id');
        
        console.log(`Input: placeholder="${placeholder}", name="${name}", type="${type}", id="${id}"`);
        
        if (placeholder?.toLowerCase().includes('email') || 
            name?.toLowerCase().includes('email') || 
            id?.toLowerCase().includes('email') ||
            type === 'email') {
          emailInput = input;
          console.log('Found email input by attributes');
          break;
        }
      }
    }
    
    if (!emailInput || !(await emailInput.isVisible())) {
      throw new Error('Could not find email input field');
    }
    
    // Clear and type email
    console.log('Clearing and typing email...');
    await emailInput.click();
    await emailInput.clear();
    
    // Type email character by character to ensure it's entered correctly
    const email = 'ajay@outreachlabs.com';
    await emailInput.type(email, { delay: 100 });
    
    // Verify the email was entered correctly
    const emailValue = await emailInput.inputValue();
    console.log(`Email field value: "${emailValue}"`);
    
    if (emailValue !== email) {
      console.log('Email not entered correctly, trying again...');
      await emailInput.clear();
      await emailInput.fill(email);
    }
    
    console.log('Looking for password input field...');
    
    // Find password field
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[placeholder*="password" i]',
      'input[autocomplete="current-password"]',
      '#password',
      '[data-testid="password-input"]',
      'input.password-input'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.locator(selector).first();
        if (await passwordInput.isVisible({ timeout: 1000 })) {
          console.log(`Found password input using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!passwordInput || !(await passwordInput.isVisible())) {
      throw new Error('Could not find password input field');
    }
    
    console.log('Entering password...');
    await passwordInput.click();
    await passwordInput.clear();
    await passwordInput.type('FA64!I$nrbCauS^d', { delay: 100 });
    
    console.log('Looking for submit button...');
    
    // Find and click submit button
    const submitButton = await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")').first();
    
    if (!submitButton || !(await submitButton.isVisible())) {
      throw new Error('Could not find submit button');
    }
    
    console.log('Clicking submit button...');
    await submitButton.click();
    
    // Wait for navigation or response
    console.log('Waiting for login response...');
    await page.waitForLoadState('networkidle');
    
    // Check if we're logged in by looking for signs of successful login
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/home') || !currentUrl.includes('/login')) {
      console.log('✅ Login appears successful!');
    } else {
      console.log('⚠️ Still on login page, checking for error messages...');
      const errorMessage = await page.locator('.error, .alert, [role="alert"], .text-red-500').first().textContent().catch(() => null);
      if (errorMessage) {
        console.log(`Error message: ${errorMessage}`);
      }
    }
    
    // Keep browser open for 30 seconds so you can see the result
    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error during login:', error);
    // Take a screenshot for debugging
    await page.screenshot({ path: 'login-error.png' });
    console.log('Screenshot saved as login-error.png');
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Run the test
loginTest().catch(console.error);