/**
 * Simplified Client Detail Page Audit
 * 
 * Focus on auditing the page structure without complex authentication
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
const BASE_URL = 'http://localhost:3000';

class SimpleClientDetailAuditor {
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
    console.log('🚀 Initializing browser for simple audit...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set up auth token from existing cookie file
    await this.page.setCookie({
      name: 'auth-token',
      value: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI2YTdhYTE0Zi0xMDkzLTQzMjUtYTUwOC00M2EwMGJhMjRkODYiLCJlbWFpbCI6ImFkbWluQGludGVybmFsLmNvbSIsIm5hbWUiOiJBZG1pbiBVc2VyIiwicm9sZSI6ImFkbWluIiwidXNlclR5cGUiOiJpbnRlcm5hbCIsImV4cCI6MTc1NTk1MjA2OX0.Ma3kyLCO43b6WoReCtQhn8UtcNcW-GPElKY0w-NpwGE',
      domain: 'localhost',
      path: '/',
      httpOnly: true
    });
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🐛 JS Error:', msg.text());
        this.auditResults.issues.push({
          type: 'javascript_error',
          message: msg.text(),
          location: 'console'
        });
      }
    });
  }

  async takeScreenshot(name, description = '') {
    const screenshotPath = `test-results/simple-audit-${name}-${Date.now()}.png`;
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
    
    console.log(`📸 Screenshot: ${screenshotPath} - ${description}`);
  }

  async auditPageStructure() {
    console.log('🔍 Auditing page structure...');
    
    try {
      await this.page.goto(`${BASE_URL}/clients/${CLIENT_ID}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.takeScreenshot('01-initial-load', 'Initial page load');
      
      // Wait a bit for dynamic content
      await this.page.waitForTimeout(3000);
      
      await this.takeScreenshot('02-after-wait', 'After 3 second wait');
      
      // Check if the page loaded properly
      const pageTitle = await this.page.title();
      console.log(`📄 Page title: ${pageTitle}`);
      
      // Look for main heading
      const headingExists = await this.page.$('h1') !== null;
      console.log(`📋 Main heading exists: ${headingExists}`);
      
      if (headingExists) {
        const headingText = await this.page.$eval('h1', el => el.textContent?.trim());
        console.log(`📝 Client name: ${headingText}`);
        this.auditResults.metrics.clientName = headingText;
      }
      
      return true;
      
    } catch (error) {
      console.log('❌ Page structure audit failed:', error.message);
      this.auditResults.issues.push({
        type: 'page_load_error',
        message: error.message,
        location: 'page_structure'
      });
      return false;
    }
  }

  async auditActivityComponents() {
    console.log('👥 Auditing activity components...');
    
    try {
      // Look for activity-related elements using more specific searches
      const activitySelectors = [
        'h3:contains("Recent Activity")',
        'h3:contains("Activity Timeline")', 
        'h3:contains("Activity")',
        '.activity-timeline',
        '[class*="activity"]'
      ];
      
      let activityElements = [];
      
      // Use XPath to find headings containing "Activity"
      const activityHeadings = await this.page.$x('//h3[contains(text(), "Activity") or contains(text(), "Timeline")]');
      
      console.log(`Found ${activityHeadings.length} activity-related headings`);
      
      for (let i = 0; i < activityHeadings.length; i++) {
        const element = activityHeadings[i];
        const text = await element.evaluate(el => el.textContent?.trim());
        const bounds = await element.boundingBox();
        
        activityElements.push({
          index: i,
          text,
          bounds,
          type: 'heading'
        });
        
        console.log(`Activity element ${i + 1}: "${text}" at y=${bounds?.y}`);
      }
      
      // Also look for timeline containers
      const timelineContainers = await this.page.$$('[class*="timeline"], [class*="activity"]');
      console.log(`Found ${timelineContainers.length} timeline/activity containers`);
      
      for (let i = 0; i < timelineContainers.length; i++) {
        const element = timelineContainers[i];
        const className = await element.evaluate(el => el.className);
        const bounds = await element.boundingBox();
        
        activityElements.push({
          index: i,
          text: `Container: ${className}`,
          bounds,
          type: 'container'
        });
      }
      
      this.auditResults.metrics.activityElements = activityElements;
      this.auditResults.metrics.totalActivityComponents = activityElements.length;
      
      // Check for potential duplicates
      const headingCount = activityHeadings.length;
      const containerCount = timelineContainers.length;
      
      if (headingCount > 1) {
        console.log('⚠️ MULTIPLE ACTIVITY HEADINGS DETECTED!');
        this.auditResults.issues.push({
          type: 'duplicate_activity_headings',
          message: `Found ${headingCount} activity headings - potential duplicates`,
          location: 'activity_components',
          count: headingCount
        });
      }
      
      if (containerCount > 1) {
        console.log('⚠️ MULTIPLE ACTIVITY CONTAINERS DETECTED!');
        this.auditResults.issues.push({
          type: 'duplicate_activity_containers',
          message: `Found ${containerCount} activity containers - potential duplicates`,
          location: 'activity_components',
          count: containerCount
        });
      }
      
      // Take screenshot highlighting the issue
      if (headingCount > 1 || containerCount > 1) {
        await this.takeScreenshot('03-duplicate-activities', 
          `Duplicate activities: ${headingCount} headings, ${containerCount} containers`);
      }
      
    } catch (error) {
      console.log('❌ Activity components audit failed:', error.message);
      this.auditResults.issues.push({
        type: 'activity_audit_error',
        message: error.message,
        location: 'activity_components'
      });
    }
  }

  async auditTabNavigation() {
    console.log('🔄 Auditing tab navigation...');
    
    try {
      // Look for tab-like elements
      const possibleTabs = await this.page.$$('button, [role="tab"], .tab, a[href*="#"]');
      console.log(`Found ${possibleTabs.length} potential tab elements`);
      
      let tabElements = [];
      
      for (let i = 0; i < possibleTabs.length && i < 10; i++) { // Limit to first 10
        try {
          const element = possibleTabs[i];
          const text = await element.evaluate(el => el.textContent?.trim());
          const isVisible = await element.isIntersectingViewport();
          const tagName = await element.evaluate(el => el.tagName);
          
          if (text && text.length > 0 && text.length < 50 && isVisible) {
            tabElements.push({
              text,
              tagName,
              isVisible
            });
          }
        } catch (e) {
          // Skip elements that cause errors
        }
      }
      
      console.log('Potential tab elements found:');
      tabElements.forEach((tab, index) => {
        console.log(`  ${index + 1}. ${tab.tagName}: "${tab.text}"`);
      });
      
      this.auditResults.metrics.tabElements = tabElements;
      
      // Look specifically for common tab text
      const tabTexts = ['Overview', 'Pages', 'Orders', 'Brand', 'Settings'];
      let foundTabs = [];
      
      for (const tabText of tabTexts) {
        const tabElement = await this.page.$x(`//button[contains(text(), "${tabText}")]`);
        if (tabElement.length > 0) {
          foundTabs.push(tabText);
          console.log(`✅ Found ${tabText} tab`);
        } else {
          console.log(`❌ Missing ${tabText} tab`);
        }
      }
      
      this.auditResults.metrics.foundTabs = foundTabs;
      this.auditResults.metrics.missingTabs = tabTexts.filter(t => !foundTabs.includes(t));
      
      await this.takeScreenshot('04-tab-navigation', 'Tab navigation elements');
      
    } catch (error) {
      console.log('❌ Tab navigation audit failed:', error.message);
      this.auditResults.issues.push({
        type: 'tab_navigation_error',
        message: error.message,
        location: 'tab_navigation'
      });
    }
  }

  async auditLayoutIssues() {
    console.log('📐 Auditing layout issues...');
    
    try {
      // Check for common layout problems
      
      // 1. Horizontal overflow
      const hasOverflow = await this.page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });
      
      if (hasOverflow) {
        this.auditResults.issues.push({
          type: 'horizontal_overflow',
          message: 'Page has horizontal scrollbar - content may be too wide',
          location: 'layout'
        });
      }
      
      // 2. Very tall elements that might indicate layout problems
      const tallElements = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(el => el.offsetHeight > window.innerHeight * 2)
          .map(el => ({
            tagName: el.tagName,
            height: el.offsetHeight,
            className: el.className,
            id: el.id
          }))
          .slice(0, 5); // Limit results
      });
      
      if (tallElements.length > 0) {
        console.log('⚠️ Found unusually tall elements:', tallElements);
        this.auditResults.issues.push({
          type: 'unusually_tall_elements',
          message: `Found ${tallElements.length} elements taller than 2x viewport height`,
          location: 'layout',
          details: tallElements
        });
      }
      
      // 3. Check Quick Actions positioning
      const quickActions = await this.page.$x('//h3[contains(text(), "Quick Actions")]');
      if (quickActions.length > 0) {
        const quickActionsBounds = await quickActions[0].boundingBox();
        console.log(`📍 Quick Actions position: y=${quickActionsBounds?.y}`);
        this.auditResults.metrics.quickActionsPosition = quickActionsBounds;
      }
      
      await this.takeScreenshot('05-layout-check', 'Layout analysis');
      
    } catch (error) {
      console.log('❌ Layout audit failed:', error.message);
      this.auditResults.issues.push({
        type: 'layout_audit_error',
        message: error.message,
        location: 'layout'
      });
    }
  }

  async generateSimpleReport() {
    console.log('📊 Generating simple audit report...');
    
    const report = {
      summary: {
        timestamp: this.auditResults.timestamp,
        clientId: CLIENT_ID,
        totalIssues: this.auditResults.issues.length,
        screenshotCount: this.auditResults.screenshots.length
      },
      keyFindings: {
        duplicateActivityComponents: this.auditResults.issues.filter(i => 
          i.type.includes('duplicate_activity')).length,
        tabNavigationIssues: this.auditResults.issues.filter(i => 
          i.location === 'tab_navigation').length,
        layoutIssues: this.auditResults.issues.filter(i => 
          i.location === 'layout').length,
        jsErrors: this.auditResults.issues.filter(i => 
          i.type === 'javascript_error').length
      },
      metrics: this.auditResults.metrics,
      allIssues: this.auditResults.issues,
      screenshots: this.auditResults.screenshots.map(s => s.path)
    };
    
    // Save report
    const reportPath = `test-results/simple-audit-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('CLIENT DETAIL PAGE AUDIT SUMMARY');
    console.log('='.repeat(50));
    console.log(`📊 Total Issues: ${report.summary.totalIssues}`);
    console.log(`📸 Screenshots: ${report.summary.screenshotCount}`);
    console.log(`👥 Activity Component Issues: ${report.keyFindings.duplicateActivityComponents}`);
    console.log(`🔄 Tab Navigation Issues: ${report.keyFindings.tabNavigationIssues}`);
    console.log(`📐 Layout Issues: ${report.keyFindings.layoutIssues}`);
    console.log(`🐛 JavaScript Errors: ${report.keyFindings.jsErrors}`);
    
    if (this.auditResults.metrics.clientName) {
      console.log(`📝 Client: ${this.auditResults.metrics.clientName}`);
    }
    
    if (this.auditResults.metrics.foundTabs) {
      console.log(`🔄 Found tabs: ${this.auditResults.metrics.foundTabs.join(', ')}`);
    }
    
    if (this.auditResults.metrics.missingTabs && this.auditResults.metrics.missingTabs.length > 0) {
      console.log(`❌ Missing tabs: ${this.auditResults.metrics.missingTabs.join(', ')}`);
    }
    
    console.log(`\n📂 Report saved: ${reportPath}`);
    console.log('📂 Screenshots saved in test-results/');
    console.log('='.repeat(50));
    
    return report;
  }

  async run() {
    try {
      console.log('🚀 Starting Simple Client Detail Page Audit...\n');
      
      await this.initialize();
      
      const pageLoaded = await this.auditPageStructure();
      if (!pageLoaded) {
        console.log('⚠️ Page failed to load properly, continuing with partial audit...');
      }
      
      await this.auditActivityComponents();
      await this.auditTabNavigation();
      await this.auditLayoutIssues();
      
      // Final screenshot
      await this.takeScreenshot('06-final-state', 'Final audit state');
      
      const report = await this.generateSimpleReport();
      
      console.log('\n✅ Simple audit completed!');
      return report;
      
    } catch (error) {
      console.error('💥 Critical error during audit:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Create results directory
const resultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Run the audit
const auditor = new SimpleClientDetailAuditor();
auditor.run().then(() => {
  console.log('🏁 Simple audit execution completed');
}).catch(error => {
  console.error('💥 Failed to complete audit:', error);
});

module.exports = SimpleClientDetailAuditor;