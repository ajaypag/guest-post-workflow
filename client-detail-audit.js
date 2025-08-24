/**
 * Client Detail Page Audit Test using Puppeteer
 * 
 * Comprehensive test to audit the client detail page for:
 * 1. Tab navigation functionality
 * 2. Activity timeline component issues (duplicate components)
 * 3. Overall UX and layout issues
 * 4. Visual and functional problems
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
const BASE_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'ajay@outreachlabs.com';
const LOGIN_PASSWORD = 'password123'; // Adjust as needed

class ClientDetailAuditor {
  constructor() {
    this.browser = null;
    this.page = null;
    this.auditResults = {
      timestamp: new Date().toISOString(),
      clientId: CLIENT_ID,
      issues: [],
      screenshots: [],
      metrics: {}
    };
  }

  async initialize() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.auditResults.issues.push({
          type: 'javascript_error',
          message: msg.text(),
          location: 'console'
        });
      }
    });

    // Enable request failure logging
    this.page.on('requestfailed', request => {
      this.auditResults.issues.push({
        type: 'request_failed',
        message: `Failed to load: ${request.url()}`,
        error: request.failure().errorText
      });
    });
  }

  async takeScreenshot(name, description = '') {
    const screenshotPath = `test-results/audit-${name}-${Date.now()}.png`;
    await this.page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    this.auditResults.screenshots.push({
      name,
      path: screenshotPath,
      description,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot saved: ${screenshotPath} - ${description}`);
  }

  async authenticate() {
    console.log('🔐 Authenticating...');
    
    try {
      await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
      await this.takeScreenshot('01-login-page', 'Login page loaded');
      
      // Check if already logged in by looking for redirect or dashboard elements
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/clients')) {
        console.log('✅ Already authenticated');
        return true;
      }

      // Fill login form
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.page.type('input[type="email"]', LOGIN_EMAIL);
      await this.page.type('input[type="password"]', LOGIN_PASSWORD);
      
      await this.takeScreenshot('02-login-filled', 'Login form filled');
      
      // Submit form
      await Promise.all([
        this.page.click('button[type="submit"]'),
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
      ]);
      
      await this.takeScreenshot('03-after-login', 'After login attempt');
      
      // Verify successful login
      const finalUrl = this.page.url();
      if (finalUrl.includes('/login')) {
        this.auditResults.issues.push({
          type: 'authentication_failed',
          message: 'Login failed - still on login page',
          location: 'authentication'
        });
        return false;
      }
      
      console.log('✅ Authentication successful');
      return true;
      
    } catch (error) {
      this.auditResults.issues.push({
        type: 'authentication_error',
        message: error.message,
        location: 'authentication'
      });
      console.log('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async navigateToClientDetail() {
    console.log('🔍 Navigating to client detail page...');
    
    try {
      await this.page.goto(`${BASE_URL}/clients/${CLIENT_ID}`, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      await this.takeScreenshot('04-client-detail-loaded', 'Client detail page loaded');
      
      // Wait for main content to load
      await this.page.waitForSelector('h1', { timeout: 10000 });
      
      const clientName = await this.page.$eval('h1', el => el.textContent);
      console.log(`✅ Client page loaded: ${clientName}`);
      
      this.auditResults.metrics.clientName = clientName;
      this.auditResults.metrics.pageLoadTime = Date.now();
      
      return true;
      
    } catch (error) {
      this.auditResults.issues.push({
        type: 'navigation_error',
        message: error.message,
        location: 'client_detail_navigation'
      });
      console.log('❌ Navigation failed:', error.message);
      return false;
    }
  }

  async auditTabNavigation() {
    console.log('🔄 Auditing tab navigation...');
    
    try {
      // Find all possible tab elements
      const tabSelectors = [
        'button:has-text("Overview")',
        'button:has-text("Pages")', 
        'button:has-text("Orders")',
        'button:has-text("Brand")',
        'button:has-text("Settings")',
        '[role="tab"]',
        '.tab, .tabs button'
      ];
      
      let tabsFound = [];
      
      for (const selector of tabSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            for (const element of elements) {
              const text = await element.evaluate(el => el.textContent?.trim());
              if (text && !tabsFound.includes(text)) {
                tabsFound.push(text);
              }
            }
          }
        } catch (e) {
          // Selector might not be valid, continue
        }
      }
      
      console.log(`Found tabs: ${tabsFound.join(', ')}`);
      this.auditResults.metrics.tabsFound = tabsFound;
      
      // Test clicking each recognizable tab
      const tabNames = ['Overview', 'Pages', 'Orders', 'Brand', 'Settings'];
      
      for (const tabName of tabNames) {
        try {
          const tabButton = await this.page.$x(`//button[contains(text(), "${tabName}")]`);
          
          if (tabButton.length > 0) {
            console.log(`🔄 Testing ${tabName} tab...`);
            
            await tabButton[0].click();
            await this.page.waitForTimeout(1500); // Wait for content to load
            
            await this.takeScreenshot(`05-tab-${tabName.toLowerCase()}`, `${tabName} tab active`);
            
            // Check if content changed
            const activeContent = await this.page.$eval('body', el => el.innerHTML.length);
            console.log(`✅ ${tabName} tab clicked - content length: ${activeContent}`);
            
          } else {
            console.log(`⚠️ ${tabName} tab not found`);
            this.auditResults.issues.push({
              type: 'missing_tab',
              message: `${tabName} tab not found`,
              location: 'tab_navigation'
            });
          }
        } catch (error) {
          console.log(`❌ Error clicking ${tabName} tab: ${error.message}`);
          this.auditResults.issues.push({
            type: 'tab_click_error',
            message: `Error clicking ${tabName} tab: ${error.message}`,
            location: 'tab_navigation'
          });
        }
      }
      
    } catch (error) {
      this.auditResults.issues.push({
        type: 'tab_navigation_audit_error',
        message: error.message,
        location: 'tab_navigation'
      });
    }
  }

  async auditActivityTimeline() {
    console.log('👥 Auditing Activity Timeline components...');
    
    try {
      // Go back to Overview tab first
      const overviewTab = await this.page.$x('//button[contains(text(), "Overview")]');
      if (overviewTab.length > 0) {
        await overviewTab[0].click();
        await this.page.waitForTimeout(1000);
      }
      
      // Look for activity-related headings and components
      const activitySelectors = [
        'h3:has-text("Recent Activity")',
        'h3:has-text("Activity Timeline")', 
        'h3:has-text("Activity")',
        '.activity-timeline',
        '[class*="activity"]',
        '[class*="timeline"]'
      ];
      
      let activityComponents = [];
      
      // Use XPath to find headings with activity-related text
      const activityHeadings = await this.page.$x('//h3[contains(text(), "Activity") or contains(text(), "Timeline")]');
      
      for (const heading of activityHeadings) {
        const text = await heading.evaluate(el => el.textContent?.trim());
        const bounds = await heading.boundingBox();
        
        activityComponents.push({
          text,
          bounds,
          selector: 'h3 heading'
        });
      }
      
      console.log(`Found ${activityComponents.length} activity-related components`);
      this.auditResults.metrics.activityComponentsCount = activityComponents.length;
      
      if (activityComponents.length > 1) {
        console.log('⚠️ DUPLICATE ACTIVITY SECTIONS DETECTED!');
        
        this.auditResults.issues.push({
          type: 'duplicate_activity_sections',
          message: `Found ${activityComponents.length} activity sections - potential duplicates`,
          location: 'activity_timeline',
          details: activityComponents
        });
        
        await this.takeScreenshot('06-duplicate-activity-sections', 
          `Duplicate activity sections detected (${activityComponents.length} found)`);
        
        // Analyze positioning
        for (let i = 0; i < activityComponents.length; i++) {
          console.log(`Activity section ${i + 1}: "${activityComponents[i].text}" at ${JSON.stringify(activityComponents[i].bounds)}`);
        }
      } else {
        console.log('✅ No duplicate activity sections detected');
      }
      
      // Check Quick Actions positioning relative to activity sections
      const quickActionsHeading = await this.page.$x('//h3[contains(text(), "Quick Actions")]');
      if (quickActionsHeading.length > 0) {
        const quickActionsBounds = await quickActionsHeading[0].boundingBox();
        this.auditResults.metrics.quickActionsBounds = quickActionsBounds;
        
        console.log(`Quick Actions position: ${JSON.stringify(quickActionsBounds)}`);
        
        // Check if Quick Actions are positioned correctly relative to activity sections
        if (activityComponents.length > 0) {
          const lastActivityY = Math.max(...activityComponents.map(c => c.bounds?.y || 0));
          if (quickActionsBounds && quickActionsBounds.y < lastActivityY) {
            this.auditResults.issues.push({
              type: 'layout_order_issue',
              message: 'Quick Actions appears before Activity sections - may indicate layout issues',
              location: 'layout'
            });
          }
        }
      }
      
    } catch (error) {
      this.auditResults.issues.push({
        type: 'activity_timeline_audit_error',
        message: error.message,
        location: 'activity_timeline'
      });
    }
  }

  async auditResponsiveDesign() {
    console.log('📱 Auditing responsive design...');
    
    try {
      // Test different viewport sizes
      const viewports = [
        { name: 'mobile', width: 375, height: 812 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 },
        { name: 'large', width: 1920, height: 1080 }
      ];
      
      for (const viewport of viewports) {
        console.log(`Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
        
        await this.page.setViewport(viewport);
        await this.page.waitForTimeout(1000); // Allow layout to adjust
        
        await this.takeScreenshot(`07-responsive-${viewport.name}`, 
          `${viewport.name} viewport (${viewport.width}x${viewport.height})`);
        
        // Check for common responsive issues
        const bodyOverflow = await this.page.evaluate(() => {
          return document.body.scrollWidth > document.body.clientWidth;
        });
        
        if (bodyOverflow) {
          this.auditResults.issues.push({
            type: 'responsive_overflow',
            message: `Horizontal overflow detected in ${viewport.name} viewport`,
            location: 'responsive_design',
            viewport: viewport
          });
        }
      }
      
      // Reset to desktop
      await this.page.setViewport({ width: 1280, height: 720 });
      
    } catch (error) {
      this.auditResults.issues.push({
        type: 'responsive_audit_error',
        message: error.message,
        location: 'responsive_design'
      });
    }
  }

  async auditInteractiveElements() {
    console.log('🔘 Auditing interactive elements...');
    
    try {
      // Find all buttons and links
      const buttons = await this.page.$$('button, a[href], input[type="button"], input[type="submit"]');
      
      console.log(`Found ${buttons.length} interactive elements`);
      this.auditResults.metrics.interactiveElementsCount = buttons.length;
      
      let brokenElements = 0;
      let testedElements = 0;
      const maxElementsToTest = 20; // Limit to avoid timeout
      
      for (let i = 0; i < Math.min(buttons.length, maxElementsToTest); i++) {
        try {
          const element = buttons[i];
          
          const isVisible = await element.isIntersectingViewport();
          const isEnabled = await element.evaluate(el => !el.disabled);
          const hasText = await element.evaluate(el => el.textContent?.trim().length > 0);
          
          if (!isVisible && hasText) {
            // Element has content but is not visible - potential issue
            brokenElements++;
            
            const elementText = await element.evaluate(el => el.textContent?.trim());
            this.auditResults.issues.push({
              type: 'hidden_interactive_element',
              message: `Interactive element "${elementText}" is not visible`,
              location: 'interactive_elements'
            });
          }
          
          if (!isEnabled && isVisible) {
            const elementText = await element.evaluate(el => el.textContent?.trim());
            console.log(`Disabled element found: ${elementText}`);
          }
          
          testedElements++;
          
        } catch (error) {
          brokenElements++;
        }
      }
      
      console.log(`✅ Tested ${testedElements} interactive elements, found ${brokenElements} potential issues`);
      this.auditResults.metrics.brokenInteractiveElements = brokenElements;
      
    } catch (error) {
      this.auditResults.issues.push({
        type: 'interactive_elements_audit_error',
        message: error.message,
        location: 'interactive_elements'
      });
    }
  }

  async auditAccessibility() {
    console.log('♿ Auditing accessibility...');
    
    try {
      // Test keyboard navigation
      await this.page.focus('body');
      
      // Try to tab through elements
      const tabStops = [];
      for (let i = 0; i < 10; i++) {
        await this.page.keyboard.press('Tab');
        
        const focused = await this.page.evaluate(() => {
          const activeElement = document.activeElement;
          return {
            tagName: activeElement?.tagName,
            textContent: activeElement?.textContent?.trim().substring(0, 50),
            id: activeElement?.id,
            className: activeElement?.className
          };
        });
        
        tabStops.push(focused);
      }
      
      console.log('✅ Keyboard navigation tab stops:', tabStops);
      this.auditResults.metrics.keyboardNavigation = tabStops;
      
      await this.takeScreenshot('08-accessibility-test', 'After keyboard navigation test');
      
    } catch (error) {
      this.auditResults.issues.push({
        type: 'accessibility_audit_error',
        message: error.message,
        location: 'accessibility'
      });
    }
  }

  async generateReport() {
    console.log('📊 Generating comprehensive audit report...');
    
    // Add final metrics
    this.auditResults.metrics.totalIssues = this.auditResults.issues.length;
    this.auditResults.metrics.criticalIssues = this.auditResults.issues.filter(i => 
      ['duplicate_activity_sections', 'authentication_failed', 'navigation_error'].includes(i.type)
    ).length;
    
    // Create detailed report
    const report = {
      summary: {
        timestamp: this.auditResults.timestamp,
        clientId: CLIENT_ID,
        totalIssues: this.auditResults.metrics.totalIssues,
        criticalIssues: this.auditResults.metrics.criticalIssues,
        screenshotCount: this.auditResults.screenshots.length
      },
      findings: {
        duplicateActivitySections: this.auditResults.issues.filter(i => i.type === 'duplicate_activity_sections'),
        tabNavigationIssues: this.auditResults.issues.filter(i => i.location === 'tab_navigation'),
        responsiveIssues: this.auditResults.issues.filter(i => i.location === 'responsive_design'),
        interactiveElementIssues: this.auditResults.issues.filter(i => i.location === 'interactive_elements'),
        jsErrors: this.auditResults.issues.filter(i => i.type === 'javascript_error')
      },
      metrics: this.auditResults.metrics,
      screenshots: this.auditResults.screenshots,
      allIssues: this.auditResults.issues
    };
    
    // Save report to file
    const reportPath = `test-results/client-detail-audit-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📋 Audit report saved to: ${reportPath}`);
    
    // Print summary to console
    console.log('\n' + '='.repeat(60));
    console.log('CLIENT DETAIL PAGE AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`🕒 Timestamp: ${report.summary.timestamp}`);
    console.log(`🆔 Client ID: ${CLIENT_ID}`);
    console.log(`📊 Total Issues: ${report.summary.totalIssues}`);
    console.log(`⚠️  Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`📸 Screenshots: ${report.summary.screenshotCount}`);
    
    if (report.findings.duplicateActivitySections.length > 0) {
      console.log('\n🔍 DUPLICATE ACTIVITY SECTIONS:');
      report.findings.duplicateActivitySections.forEach(issue => {
        console.log(`   • ${issue.message}`);
      });
    }
    
    if (report.findings.tabNavigationIssues.length > 0) {
      console.log('\n🔄 TAB NAVIGATION ISSUES:');
      report.findings.tabNavigationIssues.forEach(issue => {
        console.log(`   • ${issue.message}`);
      });
    }
    
    if (report.findings.jsErrors.length > 0) {
      console.log('\n🐛 JAVASCRIPT ERRORS:');
      report.findings.jsErrors.forEach(issue => {
        console.log(`   • ${issue.message}`);
      });
    }
    
    console.log('\n📂 All screenshots and detailed data saved to test-results/');
    console.log('='.repeat(60));
    
    return report;
  }

  async run() {
    try {
      console.log('🚀 Starting Client Detail Page Audit...\n');
      
      await this.initialize();
      
      const authenticated = await this.authenticate();
      if (!authenticated) {
        console.log('❌ Authentication failed - cannot continue audit');
        return;
      }
      
      const navigated = await this.navigateToClientDetail();
      if (!navigated) {
        console.log('❌ Navigation failed - cannot continue audit');
        return;
      }
      
      // Run all audit procedures
      await this.auditTabNavigation();
      await this.auditActivityTimeline();
      await this.auditResponsiveDesign();
      await this.auditInteractiveElements();
      await this.auditAccessibility();
      
      // Take final screenshot
      await this.takeScreenshot('09-final-state', 'Final state after all tests');
      
      // Generate comprehensive report
      const report = await this.generateReport();
      
      console.log('\n✅ Audit completed successfully!');
      return report;
      
    } catch (error) {
      console.error('💥 Critical error during audit:', error);
      this.auditResults.issues.push({
        type: 'critical_audit_error',
        message: error.message,
        location: 'audit_execution'
      });
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Create results directory if it doesn't exist
const resultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Run the audit
const auditor = new ClientDetailAuditor();
auditor.run().then(() => {
  console.log('🏁 Audit execution completed');
}).catch(error => {
  console.error('💥 Failed to complete audit:', error);
});

module.exports = ClientDetailAuditor;