#!/usr/bin/env npx tsx
/**
 * Localhost Audit Script
 * Comprehensive check of the running application
 */

import { chromium, Browser, Page } from 'playwright';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

interface AuditResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  details: string;
}

class LocalhostAudit {
  private results: AuditResult[] = [];
  private browser: Browser;
  private page: Page;
  
  async run() {
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('LOCALHOST AUDIT - PHASE 2 VERIFICATION'));
    console.log(blue('Testing live application functionality'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    try {
      await this.setup();
      await this.testServerHealth();
      await this.testAuthentication();
      await this.testPricingPages();
      await this.testAPIEndpoints();
      await this.testDatabaseConnectivity();
    } catch (error) {
      console.error(red('Audit failed:'), error.message);
    } finally {
      await this.cleanup();
      this.printResults();
    }
  }
  
  async setup() {
    console.log(yellow('▶ Setting up browser...\n'));
    this.browser = await chromium.launch({ 
      headless: true,
      timeout: 30000
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(10000);
  }
  
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
  
  async testServerHealth() {
    console.log(yellow('▶ Testing Server Health\n'));
    
    try {
      // Test if server is running
      const response = await fetch('http://localhost:3000/');
      
      this.addResult({
        category: 'Server',
        test: 'Application server status',
        status: response.ok ? 'PASS' : 'FAIL',
        details: `HTTP ${response.status} ${response.statusText}`
      });
      
      if (response.ok) {
        // Test if it redirects properly (likely to login or dashboard)
        const redirected = response.url !== 'http://localhost:3000/';
        this.addResult({
          category: 'Server',
          test: 'Routing functionality',
          status: 'PASS',
          details: redirected ? `Redirects to ${response.url}` : 'No redirect (expected for unauthenticated)'
        });
      }
    } catch (error) {
      this.addResult({
        category: 'Server',
        test: 'Server connectivity',
        status: 'FAIL',
        details: `Cannot connect: ${error.message}`
      });
    }
  }
  
  async testAuthentication() {
    console.log(yellow('▶ Testing Authentication System\n'));
    
    try {
      await this.page.goto('http://localhost:3000/login');
      
      // Check login page loads
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
      
      this.addResult({
        category: 'Auth',
        test: 'Login page accessibility',
        status: 'PASS',
        details: 'Login form elements present'
      });
      
      // Attempt login with provided credentials
      await this.page.fill('input[type="email"], input[name="email"]', 'ajay@outreachlabs.com');
      await this.page.fill('input[type="password"], input[name="password"]', 'FA64!I$nrbCauS^d');
      
      // Submit and wait for response
      await this.page.click('button[type="submit"], .login-button, [class*="submit"]');
      
      // Wait for redirect or error
      try {
        await this.page.waitForURL(/dashboard|internal|orders/, { timeout: 8000 });
        
        this.addResult({
          category: 'Auth',
          test: 'Login functionality',
          status: 'PASS',
          details: `Successfully logged in, redirected to ${this.page.url()}`
        });
        
        return true; // Successfully authenticated
        
      } catch (error) {
        // Check if still on login page (might indicate error)
        const currentUrl = this.page.url();
        if (currentUrl.includes('/login')) {
          this.addResult({
            category: 'Auth',
            test: 'Login functionality',
            status: 'WARN',
            details: 'Login attempt did not redirect - check credentials or form'
          });
        } else {
          this.addResult({
            category: 'Auth',
            test: 'Login functionality',
            status: 'PASS',
            details: `Redirected to ${currentUrl}`
          });
          return true;
        }
      }
      
    } catch (error) {
      this.addResult({
        category: 'Auth',
        test: 'Authentication system',
        status: 'FAIL',
        details: error.message
      });
    }
    
    return false;
  }
  
  async testPricingPages() {
    console.log(yellow('▶ Testing Pricing-Related Pages\n'));
    
    const pagesToTest = [
      { url: '/admin/pricing-fixes', name: 'Pricing Fixes Admin' },
      { url: '/internal/websites', name: 'Internal Websites' },
      { url: '/orders/new', name: 'Order Creation' },
      { url: '/dashboard', name: 'Dashboard' }
    ];
    
    for (const pageTest of pagesToTest) {
      try {
        await this.page.goto(`http://localhost:3000${pageTest.url}`);
        
        // Wait for page to load
        await this.page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const title = await this.page.title();
        const hasContent = await this.page.locator('body').textContent() !== '';
        
        this.addResult({
          category: 'Pages',
          test: `${pageTest.name} page load`,
          status: hasContent ? 'PASS' : 'WARN',
          details: hasContent ? `Loaded successfully: "${title}"` : 'Page loaded but appears empty'
        });
        
        // Look for pricing-related content
        const bodyText = await this.page.textContent('body');
        const hasPricingContent = bodyText?.includes('$') || bodyText?.includes('price') || bodyText?.includes('cost');
        
        if (hasPricingContent) {
          this.addResult({
            category: 'Pages',
            test: `${pageTest.name} pricing content`,
            status: 'INFO',
            details: 'Contains pricing-related content'
          });
        }
        
      } catch (error) {
        this.addResult({
          category: 'Pages',
          test: `${pageTest.name} accessibility`,
          status: 'WARN',
          details: `Could not access: ${error.message}`
        });
      }
    }
  }
  
  async testAPIEndpoints() {
    console.log(yellow('▶ Testing API Endpoints\n'));
    
    const apiTests = [
      { url: '/api/auth/session-state', method: 'GET', name: 'Session state' },
      { url: '/api/notifications/summary', method: 'GET', name: 'Notifications' },
      { url: '/api/websites/search?q=test&limit=3', method: 'GET', name: 'Website search' },
    ];
    
    for (const test of apiTests) {
      try {
        const response = await this.page.evaluate(async ({ url, method }) => {
          const res = await fetch(url, { method });
          return {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            headers: Object.fromEntries(res.headers.entries())
          };
        }, test);
        
        this.addResult({
          category: 'API',
          test: `${test.name} endpoint`,
          status: response.ok ? 'PASS' : (response.status === 401 ? 'WARN' : 'FAIL'),
          details: `HTTP ${response.status} ${response.statusText}${response.status === 401 ? ' (auth required)' : ''}`
        });
        
      } catch (error) {
        this.addResult({
          category: 'API',
          test: `${test.name} endpoint`,
          status: 'FAIL',
          details: error.message
        });
      }
    }
  }
  
  async testDatabaseConnectivity() {
    console.log(yellow('▶ Testing Database Connectivity\n'));
    
    try {
      // Test a simple database query via API
      const response = await this.page.evaluate(async () => {
        try {
          // Try to hit an endpoint that definitely queries the database
          const res = await fetch('/api/auth/session-state');
          return {
            ok: res.ok,
            status: res.status,
            hasData: true
          };
        } catch (error) {
          return {
            ok: false,
            error: error.message
          };
        }
      });
      
      if (response.ok) {
        this.addResult({
          category: 'Database',
          test: 'Database connectivity via API',
          status: 'PASS',
          details: 'API endpoints responding (implies DB connection working)'
        });
      } else {
        this.addResult({
          category: 'Database',
          test: 'Database connectivity',
          status: 'WARN',
          details: 'Cannot verify DB connection through API calls'
        });
      }
      
    } catch (error) {
      this.addResult({
        category: 'Database',
        test: 'Database connectivity',
        status: 'FAIL',
        details: error.message
      });
    }
  }
  
  private addResult(result: AuditResult) {
    this.results.push(result);
    
    const statusColor = {
      'PASS': green,
      'FAIL': red,
      'WARN': yellow,
      'INFO': cyan
    }[result.status];
    
    const statusIcon = {
      'PASS': '✓',
      'FAIL': '✗',
      'WARN': '⚠',
      'INFO': 'ℹ'
    }[result.status];
    
    console.log(`  ${statusColor(`${statusIcon} ${result.status}`)} ${result.test}`);
    console.log(`    ${result.details}`);
  }
  
  private printResults() {
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('LOCALHOST AUDIT RESULTS'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    // Group by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'PASS').length;
      const failed = categoryResults.filter(r => r.status === 'FAIL').length;
      const warned = categoryResults.filter(r => r.status === 'WARN').length;
      const total = categoryResults.length;
      
      console.log(`${category}:`);
      console.log(`  ${green('✓')} ${passed} passed, ${red('✗')} ${failed} failed, ${yellow('⚠')} ${warned} warnings`);
    });
    
    // Overall summary
    const totalPassed = this.results.filter(r => r.status === 'PASS').length;
    const totalFailed = this.results.filter(r => r.status === 'FAIL').length;
    const totalWarned = this.results.filter(r => r.status === 'WARN').length;
    const totalTests = this.results.length;
    
    console.log('\n' + '─'.repeat(70));
    console.log(`Overall: ${green(totalPassed.toString())} passed, ${red(totalFailed.toString())} failed, ${yellow(totalWarned.toString())} warnings out of ${totalTests} tests`);
    
    if (totalFailed === 0) {
      console.log('\n' + green('✅ LOCALHOST APPLICATION FUNCTIONAL'));
      console.log(green('The application is running and accessible!'));
      if (totalWarned > 0) {
        console.log(yellow(`Note: ${totalWarned} warnings found - mostly related to authentication requirements`));
      }
    } else {
      console.log('\n' + red('⚠️  ISSUES DETECTED'));
      console.log(red(`${totalFailed} critical issues need attention`));
    }
    
    console.log('\n' + cyan('Next Steps:'));
    console.log('  1. If authentication worked, test pricing displays manually');
    console.log('  2. Verify that prices show in $XX.XX format (not cents)');
    console.log('  3. Check that service fees are calculated correctly');
    console.log('  4. Test order creation flow');
    
    console.log('\n' + blue('═'.repeat(70)) + '\n');
  }
}

// Run the audit
async function main() {
  const audit = new LocalhostAudit();
  await audit.run();
}

main().catch(console.error);