#!/usr/bin/env npx tsx
/**
 * Fixed Login Test with Better Form Detection
 */

import { chromium, Browser, Page } from 'playwright';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

class FixedLoginTest {
  private browser: Browser;
  private page: Page;
  
  async run() {
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('FIXED LOGIN TEST - WITH BETTER FORM DETECTION'));
    console.log(blue('Testing actual pricing displays after login'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    try {
      await this.setup();
      await this.debugLoginForm();
      await this.login();
      await this.testPricingDisplays();
    } catch (error) {
      console.error(red('Test failed:'), error.message);
    } finally {
      // Keep browser open for manual inspection
      console.log(yellow('\n🔍 Browser will stay open for manual inspection...'));
      console.log(yellow('Press Ctrl+C when done to close browser\n'));
      
      // Keep the process alive
      await new Promise(() => {}); // Never resolves, keeps browser open
    }
  }
  
  async setup() {
    console.log(yellow('▶ Starting browser (visible mode)...\n'));
    this.browser = await chromium.launch({ 
      headless: false, // Show browser
      slowMo: 2000, // Slow down more for visibility
      args: ['--start-maximized']
    });
    
    const context = await this.browser.newContext({
      viewport: null // Use full screen
    });
    
    this.page = await context.newPage();
  }
  
  async debugLoginForm() {
    console.log(yellow('▶ Debugging login form elements...\n'));
    
    try {
      await this.page.goto('http://localhost:3000/login');
      console.log('  📍 Navigated to login page');
      
      // Wait for page to fully load
      await this.page.waitForLoadState('networkidle');
      
      // Find ALL input elements
      const allInputs = await this.page.locator('input').all();
      console.log(`  🔍 Found ${allInputs.length} input elements total`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        const placeholder = await input.getAttribute('placeholder');
        const className = await input.getAttribute('class');
        
        console.log(`    Input ${i + 1}:`);
        console.log(`      type: "${type}"`);
        console.log(`      name: "${name}"`);
        console.log(`      id: "${id}"`);
        console.log(`      placeholder: "${placeholder}"`);
        console.log(`      class: "${className}"`);
      }
      
      // Look for specific email-related selectors
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[id*="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]',
        '#email',
        '[data-testid="email"]',
        'input:first-of-type'
      ];
      
      console.log('\n  🎯 Testing email field selectors:');
      for (const selector of emailSelectors) {
        const exists = await this.page.locator(selector).count() > 0;
        console.log(`    ${selector}: ${exists ? green('✓ Found') : red('✗ Not found')}`);
      }
      
    } catch (error) {
      console.error(red('  ❌ Debug failed:'), error.message);
    }
  }
  
  async login() {
    console.log(yellow('\n▶ Attempting login with improved detection...\n'));
    
    try {
      // Try multiple strategies to find and fill email field
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[id*="email"]',
        '#email',
        'input:first-of-type'
      ];
      
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id*="password"]',
        '#password'
      ];
      
      let emailField = null;
      let passwordField = null;
      
      // Find email field
      for (const selector of emailSelectors) {
        const field = this.page.locator(selector).first();
        if (await field.count() > 0) {
          emailField = field;
          console.log(`  📧 Found email field with: ${selector}`);
          break;
        }
      }
      
      // Find password field
      for (const selector of passwordSelectors) {
        const field = this.page.locator(selector).first();
        if (await field.count() > 0) {
          passwordField = field;
          console.log(`  🔐 Found password field with: ${selector}`);
          break;
        }
      }
      
      if (!emailField) {
        console.log(red('  ❌ Could not find email field'));
        return false;
      }
      
      if (!passwordField) {
        console.log(red('  ❌ Could not find password field'));
        return false;
      }
      
      // Clear and fill email
      await emailField.clear();
      await emailField.fill('ajay@outreachlabs.com');
      console.log('  📝 Email entered');
      
      // Clear and fill password
      await passwordField.clear();
      await passwordField.fill('FA64!I$nrbCauS^d');
      console.log('  🔐 Password entered');
      
      // Wait a moment
      await this.page.waitForTimeout(1000);
      
      // Find submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'button:has-text("Sign In")',
        '.login-button',
        'form button',
        'button'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        const button = this.page.locator(selector).first();
        if (await button.count() > 0) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            submitButton = button;
            console.log(`  🚀 Found submit button with: ${selector}`);
            break;
          }
        }
      }
      
      if (!submitButton) {
        console.log(red('  ❌ Could not find submit button'));
        return false;
      }
      
      // Click submit button
      await submitButton.click();
      console.log('  🚀 Form submitted');
      
      // Wait for redirect with longer timeout and better detection
      try {
        await this.page.waitForFunction(() => {
          return !window.location.pathname.includes('/login') && 
                 !window.location.pathname.includes('/auth');
        }, { timeout: 20000 });
        
        const currentUrl = this.page.url();
        console.log(green(`  ✅ Login successful! Current URL: ${currentUrl}`));
        
        // Wait for page to fully load
        await this.page.waitForLoadState('networkidle');
        
        return true;
        
      } catch (error) {
        const currentUrl = this.page.url();
        console.log(yellow(`  ⚠️  Still checking... Current URL: ${currentUrl}`));
        
        // Check if we're on a different page that's not login
        if (!currentUrl.includes('/login')) {
          console.log(green('  ✅ Appears to be logged in (not on login page)'));
          return true;
        }
        
        // Check for error messages
        const errorSelectors = ['.error', '.alert', '[role="alert"]', '.text-red', '.text-danger'];
        for (const selector of errorSelectors) {
          const errorMsg = await this.page.locator(selector).textContent().catch(() => null);
          if (errorMsg && errorMsg.trim()) {
            console.log(red(`  📢 Error message: ${errorMsg}`));
          }
        }
        
        return false;
      }
      
    } catch (error) {
      console.error(red('  ❌ Login process failed:'), error.message);
      return false;
    }
  }
  
  async testPricingDisplays() {
    console.log(yellow('\n▶ Testing pricing displays...\n'));
    
    const testPages = [
      { url: '/internal/websites', name: 'Internal Websites' },
      { url: '/admin/pricing-fixes', name: 'Pricing Fixes Admin' },
      { url: '/orders/new', name: 'Order Creation' }
    ];
    
    for (const pageTest of testPages) {
      try {
        console.log(`  📄 Testing ${pageTest.name}...`);
        
        await this.page.goto(`http://localhost:3000${pageTest.url}`, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        const title = await this.page.title();
        console.log(`    📋 Page title: "${title}"`);
        
        // Look for dollar signs in the page
        const bodyText = await this.page.textContent('body');
        const dollarMatches = bodyText?.match(/\$[\d,]+\.?\d*/g) || [];
        
        console.log(`    💰 Found ${dollarMatches.length} dollar amounts:`);
        dollarMatches.slice(0, 10).forEach((match, i) => {
          console.log(`      ${i + 1}. ${match}`);
        });
        
        // Test API calls from this page
        const apiTestResult = await this.page.evaluate(async () => {
          try {
            const response = await fetch('/api/websites/search?q=&limit=3');
            if (response.ok) {
              const data = await response.json();
              return {
                success: true,
                count: data.websites?.length || 0,
                sample: data.websites?.[0] || null
              };
            } else {
              return { success: false, status: response.status };
            }
          } catch (error) {
            return { success: false, error: error.message };
          }
        });
        
        if (apiTestResult.success) {
          console.log(green(`    🌐 API working: ${apiTestResult.count} websites`));
          if (apiTestResult.sample?.guestPostCost) {
            const cost = apiTestResult.sample.guestPostCost;
            console.log(`    💵 Sample cost: ${cost} (${cost > 1000 ? 'cents' : 'dollars'})`);
          }
        }
        
      } catch (error) {
        console.log(red(`    ❌ Failed to test ${pageTest.name}: ${error.message}`));
      }
    }
  }
}

// Run the test
async function main() {
  const test = new FixedLoginTest();
  await test.run();
}

main().catch(console.error);