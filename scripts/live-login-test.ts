#!/usr/bin/env npx tsx
/**
 * Live Login Test with Playwright
 * Login to the actual application and test pricing displays
 */

import { chromium, Browser, Page } from 'playwright';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

class LiveLoginTest {
  private browser: Browser;
  private page: Page;
  
  async run() {
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('LIVE LOGIN TEST - PHASE 2 VERIFICATION'));
    console.log(blue('Testing actual pricing displays after login'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    try {
      await this.setup();
      await this.login();
      await this.testPricingDisplays();
      await this.testAPIsWithAuth();
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
      slowMo: 1000, // Slow down for visibility
      args: ['--start-maximized']
    });
    
    const context = await this.browser.newContext({
      viewport: null // Use full screen
    });
    
    this.page = await context.newPage();
  }
  
  async login() {
    console.log(yellow('▶ Attempting login...\n'));
    
    try {
      // Go to login page
      await this.page.goto('http://localhost:3000/login');
      console.log('  📍 Navigated to login page');
      
      // Wait for login form
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      console.log('  📝 Login form detected');
      
      // Fill credentials
      await this.page.fill('input[type="email"], input[name="email"]', 'ajay@outreachlabs.com');
      await this.page.fill('input[type="password"], input[name="password"]', 'FA64!I$nrbCauS^d');
      console.log('  🔐 Credentials entered');
      
      // Submit form
      await this.page.click('button[type="submit"], .login-button, button:has-text("Login"), button:has-text("Sign in")');
      console.log('  🚀 Form submitted');
      
      // Wait for redirect - be more flexible with timeout and URLs
      try {
        await this.page.waitForFunction(() => {
          return !window.location.pathname.includes('/login');
        }, { timeout: 15000 });
        
        const currentUrl = this.page.url();
        console.log(green(`  ✅ Login successful! Redirected to: ${currentUrl}`));
        
        // Wait a bit more for the page to fully load
        await this.page.waitForTimeout(3000);
        
        return true;
        
      } catch (error) {
        const currentUrl = this.page.url();
        console.log(red(`  ❌ Login may have failed. Current URL: ${currentUrl}`));
        
        // Check if there's an error message
        const errorMsg = await this.page.locator('.error, .alert-error, [class*="error"]').textContent().catch(() => null);
        if (errorMsg) {
          console.log(red(`  📢 Error message: ${errorMsg}`));
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
      { url: '/internal/websites', name: 'Internal Websites', timeout: 10000 },
      { url: '/admin/pricing-fixes', name: 'Pricing Fixes Admin', timeout: 8000 },
      { url: '/orders/new', name: 'Order Creation', timeout: 8000 }
    ];
    
    for (const pageTest of testPages) {
      try {
        console.log(`  📄 Testing ${pageTest.name}...`);
        
        await this.page.goto(`http://localhost:3000${pageTest.url}`, { 
          waitUntil: 'networkidle',
          timeout: pageTest.timeout 
        });
        
        const title = await this.page.title();
        console.log(`    📋 Page title: "${title}"`);
        
        // Look for pricing elements
        const priceElements = await this.page.$$('[class*="price"], .cost, .amount, td:has-text("$"), span:has-text("$")');
        console.log(`    💰 Found ${priceElements.length} potential price elements`);
        
        if (priceElements.length > 0) {
          // Get text from first few price elements
          for (let i = 0; i < Math.min(5, priceElements.length); i++) {
            const priceText = await priceElements[i].textContent();
            if (priceText && priceText.includes('$')) {
              console.log(`    💵 Price display ${i + 1}: "${priceText.trim()}"`);
              
              // Check if it's in correct format (dollars, not cents)
              const isDollarFormat = /\$\d+\.\d{2}/.test(priceText);
              const isCentsFormat = /\$\d{5,}/.test(priceText); // 5+ digits = probably cents
              
              if (isDollarFormat) {
                console.log(green(`      ✅ Correct format: shows dollars`));
              } else if (isCentsFormat) {
                console.log(red(`      ❌ WRONG FORMAT: showing cents instead of dollars!`));
              } else {
                console.log(yellow(`      ⚠️  Unusual format: ${priceText}`));
              }
            }
          }
        }
        
        // Look for service fee mentions
        const bodyText = await this.page.textContent('body');
        const hasServiceFeeRef = bodyText?.includes('79') || bodyText?.includes('service');
        if (hasServiceFeeRef) {
          console.log(green('    🔧 Service fee references found'));
        }
        
      } catch (error) {
        console.log(red(`    ❌ Failed to test ${pageTest.name}: ${error.message}`));
      }
    }
  }
  
  async testAPIsWithAuth() {
    console.log(yellow('\n▶ Testing APIs with authentication...\n'));
    
    try {
      // Test website search API
      const websiteSearchResult = await this.page.evaluate(async () => {
        try {
          const response = await fetch('/api/websites/search?q=test&limit=5');
          if (response.ok) {
            const data = await response.json();
            return {
              success: true,
              count: data.websites?.length || 0,
              sampleWebsite: data.websites?.[0] || null
            };
          } else {
            return { success: false, status: response.status, statusText: response.statusText };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      if (websiteSearchResult.success) {
        console.log(green(`  ✅ Website search API: ${websiteSearchResult.count} websites returned`));
        
        if (websiteSearchResult.sampleWebsite && websiteSearchResult.sampleWebsite.guestPostCost) {
          const cost = websiteSearchResult.sampleWebsite.guestPostCost;
          const isInCents = Number.isInteger(cost) && cost > 1000;
          const dollars = isInCents ? cost / 100 : cost;
          
          console.log(`    💰 Sample pricing: ${cost} (${isInCents ? 'cents' : 'dollars'}) = $${dollars.toFixed(2)}`);
          
          if (isInCents) {
            console.log(green('    ✅ Database correctly stores prices in cents'));
          } else {
            console.log(red('    ❌ Database might not be storing cents correctly'));
          }
        }
      } else {
        console.log(red(`  ❌ Website search API failed: ${websiteSearchResult.status} ${websiteSearchResult.statusText}`));
      }
      
      // Test pricing estimate API
      const estimateResult = await this.page.evaluate(async () => {
        try {
          const response = await fetch('/api/orders/estimate-pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              drMin: 30,
              drMax: 70,
              minTraffic: 1000,
              priceMin: 10000, // $100 in cents
              priceMax: 30000, // $300 in cents
              categories: []
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return { success: true, data };
          } else {
            return { success: false, status: response.status };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      if (estimateResult.success) {
        console.log(green(`  ✅ Pricing estimate API: ${estimateResult.data.count} sites found`));
        console.log(`    📊 Price range: $${(estimateResult.data.clientMin / 100).toFixed(2)} - $${(estimateResult.data.clientMax / 100).toFixed(2)}`);
      } else {
        console.log(red(`  ❌ Pricing estimate API failed: ${estimateResult.status}`));
      }
      
    } catch (error) {
      console.log(red('  ❌ API testing failed:'), error.message);
    }
  }
}

// Run the test
async function main() {
  const test = new LiveLoginTest();
  await test.run();
}

main().catch(console.error);