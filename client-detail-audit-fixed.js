/**
 * Fixed Client Detail Page Audit
 * Using correct Puppeteer API methods
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
const BASE_URL = 'http://localhost:3000';

class FixedClientDetailAuditor {
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
    console.log('🚀 Initializing browser with correct API methods...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set up auth token
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
    const screenshotPath = `test-results/fixed-audit-${name}-${Date.now()}.png`;
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
      
      // Wait using the correct method
      await this.page.waitForTimeout(3000);
      
      await this.takeScreenshot('02-after-wait', 'After waiting for content');
      
      // Check if the page loaded properly
      const pageTitle = await this.page.title();
      console.log(`📄 Page title: ${pageTitle}`);
      
      // Look for main heading
      const headingElement = await this.page.$('h1');
      if (headingElement) {
        const headingText = await headingElement.evaluate(el => el.textContent?.trim());
        console.log(`📝 Client name: ${headingText}`);
        this.auditResults.metrics.clientName = headingText;
        console.log('✅ Main heading found');
      } else {
        console.log('❌ Main heading not found');
        this.auditResults.issues.push({
          type: 'missing_main_heading',
          message: 'Main h1 heading not found',
          location: 'page_structure'
        });
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
      // Look for activity-related headings using evaluate
      const activityData = await this.page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h3'));
        const activityHeadings = headings.filter(h => 
          h.textContent && (
            h.textContent.includes('Activity') || 
            h.textContent.includes('Timeline') ||
            h.textContent.includes('Recent Activity')
          )
        );
        
        return activityHeadings.map((heading, index) => ({
          index,
          text: heading.textContent.trim(),
          bounds: heading.getBoundingClientRect(),
          className: heading.className,
          id: heading.id
        }));
      });
      
      console.log(`Found ${activityData.length} activity-related headings`);
      this.auditResults.metrics.activityHeadings = activityData;
      
      // Look for activity containers
      const containerData = await this.page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('[class*="activity"], [class*="timeline"], .activity-timeline'));
        return containers.map((container, index) => ({
          index,
          className: container.className,
          tagName: container.tagName,
          bounds: container.getBoundingClientRect(),
          textContent: container.textContent.substring(0, 100) + '...'
        }));
      });
      
      console.log(`Found ${containerData.length} activity/timeline containers`);
      this.auditResults.metrics.activityContainers = containerData;
      
      const totalActivityComponents = activityData.length + containerData.length;
      this.auditResults.metrics.totalActivityComponents = totalActivityComponents;
      
      // Report findings
      if (activityData.length > 0) {
        activityData.forEach((heading, i) => {
          console.log(`  Activity heading ${i + 1}: "${heading.text}" at y=${Math.round(heading.bounds.y)}`);
        });
      }
      
      if (containerData.length > 0) {
        containerData.forEach((container, i) => {
          console.log(`  Activity container ${i + 1}: ${container.tagName}.${container.className}`);
        });
      }
      
      // Check for duplicates
      if (activityData.length > 1) {
        console.log('⚠️ MULTIPLE ACTIVITY HEADINGS DETECTED!');
        this.auditResults.issues.push({
          type: 'duplicate_activity_headings',
          message: `Found ${activityData.length} activity headings - potential duplicates`,
          location: 'activity_components',
          count: activityData.length,
          details: activityData
        });
      }
      
      if (containerData.length > 1) {
        console.log('⚠️ MULTIPLE ACTIVITY CONTAINERS DETECTED!');
        this.auditResults.issues.push({
          type: 'duplicate_activity_containers',
          message: `Found ${containerData.length} activity containers - potential duplicates`,
          location: 'activity_components',
          count: containerData.length,
          details: containerData
        });
      }
      
      // Take screenshot if duplicates found
      if (activityData.length > 1 || containerData.length > 1) {
        await this.takeScreenshot('03-duplicate-activities', 
          `Duplicate activities: ${activityData.length} headings, ${containerData.length} containers`);
        
        // Scroll to show all activity sections
        for (const heading of activityData) {
          await this.page.evaluate((y) => {
            window.scrollTo(0, y - 100);
          }, heading.bounds.y);
          await this.page.waitForTimeout(500);
          await this.takeScreenshot(`04-activity-section-${heading.index}`, 
            `Activity section: ${heading.text}`);
        }
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
      // Find tab elements
      const tabData = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tabLikeButtons = buttons.filter(btn => {
          const text = btn.textContent?.trim().toLowerCase();
          return text && (
            text.includes('overview') ||
            text.includes('pages') ||
            text.includes('orders') ||
            text.includes('brand') ||
            text.includes('settings') ||
            btn.getAttribute('role') === 'tab'
          );
        });
        
        return tabLikeButtons.map((btn, index) => ({
          index,
          text: btn.textContent.trim(),
          className: btn.className,
          role: btn.getAttribute('role'),
          isVisible: btn.offsetParent !== null,
          bounds: btn.getBoundingClientRect()
        }));
      });
      
      console.log(`Found ${tabData.length} potential tab elements`);
      this.auditResults.metrics.tabElements = tabData;
      
      if (tabData.length > 0) {
        tabData.forEach((tab, i) => {
          console.log(`  Tab ${i + 1}: "${tab.text}" (${tab.isVisible ? 'visible' : 'hidden'})`);
        });
        
        await this.takeScreenshot('05-tab-navigation', 'Tab navigation elements');
        
        // Try clicking each tab
        const expectedTabs = ['Overview', 'Pages', 'Orders', 'Brand', 'Settings'];
        let foundTabs = [];
        let missingTabs = [];
        
        for (const expectedTab of expectedTabs) {
          const matchingTab = tabData.find(tab => 
            tab.text.toLowerCase().includes(expectedTab.toLowerCase())
          );
          
          if (matchingTab) {
            foundTabs.push(expectedTab);
            console.log(`✅ Found ${expectedTab} tab`);
            
            // Try clicking the tab
            try {
              const tabButton = await this.page.$(`button:contains("${expectedTab}")`);
              if (tabButton) {
                await tabButton.click();
                await this.page.waitForTimeout(1000);
                await this.takeScreenshot(`06-tab-${expectedTab.toLowerCase()}`, 
                  `${expectedTab} tab clicked`);
              }
            } catch (clickError) {
              console.log(`⚠️ Could not click ${expectedTab} tab: ${clickError.message}`);
              this.auditResults.issues.push({
                type: 'tab_click_error',
                message: `Failed to click ${expectedTab} tab: ${clickError.message}`,
                location: 'tab_navigation'
              });
            }
          } else {
            missingTabs.push(expectedTab);
            console.log(`❌ Missing ${expectedTab} tab`);
          }
        }
        
        this.auditResults.metrics.foundTabs = foundTabs;
        this.auditResults.metrics.missingTabs = missingTabs;
        
        if (missingTabs.length > 0) {
          this.auditResults.issues.push({
            type: 'missing_tabs',
            message: `Missing tabs: ${missingTabs.join(', ')}`,
            location: 'tab_navigation',
            missingTabs
          });
        }
      } else {
        console.log('❌ No tab elements found');
        this.auditResults.issues.push({
          type: 'no_tabs_found',
          message: 'No tab navigation elements found',
          location: 'tab_navigation'
        });
      }
      
    } catch (error) {
      console.log('❌ Tab navigation audit failed:', error.message);
      this.auditResults.issues.push({
        type: 'tab_navigation_error',
        message: error.message,
        location: 'tab_navigation'
      });
    }
  }

  async auditLayoutAndPositioning() {
    console.log('📐 Auditing layout and positioning...');
    
    try {
      // Get Quick Actions positioning
      const quickActionsData = await this.page.evaluate(() => {
        const quickActionsHeading = Array.from(document.querySelectorAll('h3'))
          .find(h => h.textContent && h.textContent.includes('Quick Actions'));
        
        if (quickActionsHeading) {
          return {
            found: true,
            text: quickActionsHeading.textContent.trim(),
            bounds: quickActionsHeading.getBoundingClientRect(),
            offsetTop: quickActionsHeading.offsetTop
          };
        }
        return { found: false };
      });
      
      if (quickActionsData.found) {
        console.log(`📍 Quick Actions found at y=${Math.round(quickActionsData.bounds.y)}`);
        this.auditResults.metrics.quickActionsData = quickActionsData;
      } else {
        console.log('❌ Quick Actions section not found');
        this.auditResults.issues.push({
          type: 'missing_quick_actions',
          message: 'Quick Actions section not found',
          location: 'layout'
        });
      }
      
      // Check for layout issues
      const layoutIssues = await this.page.evaluate(() => {
        const issues = [];
        
        // Check horizontal overflow
        if (document.body.scrollWidth > document.body.clientWidth) {
          issues.push({
            type: 'horizontal_overflow',
            message: 'Page has horizontal scrollbar'
          });
        }
        
        // Check for very tall elements
        const tallElements = Array.from(document.querySelectorAll('*'))
          .filter(el => el.offsetHeight > window.innerHeight * 2)
          .slice(0, 3); // Limit to 3
        
        if (tallElements.length > 0) {
          issues.push({
            type: 'tall_elements',
            message: `Found ${tallElements.length} unusually tall elements`,
            count: tallElements.length
          });
        }
        
        return issues;
      });
      
      layoutIssues.forEach(issue => {
        console.log(`⚠️ Layout issue: ${issue.message}`);
        this.auditResults.issues.push({
          ...issue,
          location: 'layout'
        });
      });
      
      await this.takeScreenshot('07-layout-analysis', 'Layout and positioning analysis');
      
    } catch (error) {
      console.log('❌ Layout audit failed:', error.message);
      this.auditResults.issues.push({
        type: 'layout_audit_error',
        message: error.message,
        location: 'layout'
      });
    }
  }

  async auditResponsiveDesign() {
    console.log('📱 Testing responsive design...');
    
    try {
      const viewports = [
        { name: 'mobile', width: 375, height: 812 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 }
      ];
      
      for (const viewport of viewports) {
        console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await this.page.setViewport(viewport);
        await this.page.waitForTimeout(1000);
        
        // Check for overflow issues
        const hasOverflow = await this.page.evaluate(() => {
          return document.body.scrollWidth > document.body.clientWidth;
        });
        
        if (hasOverflow) {
          this.auditResults.issues.push({
            type: 'responsive_overflow',
            message: `Horizontal overflow in ${viewport.name} viewport`,
            location: 'responsive',
            viewport: viewport.name
          });
        }
        
        await this.takeScreenshot(`08-responsive-${viewport.name}`, 
          `${viewport.name} viewport test`);
      }
      
      // Reset to desktop
      await this.page.setViewport({ width: 1280, height: 720 });
      
    } catch (error) {
      console.log('❌ Responsive design audit failed:', error.message);
      this.auditResults.issues.push({
        type: 'responsive_audit_error',
        message: error.message,
        location: 'responsive'
      });
    }
  }

  async generateDetailedReport() {
    console.log('📊 Generating detailed audit report...');
    
    const criticalIssues = this.auditResults.issues.filter(issue => 
      ['duplicate_activity_headings', 'duplicate_activity_containers', 'no_tabs_found'].includes(issue.type)
    );
    
    const report = {
      summary: {
        timestamp: this.auditResults.timestamp,
        clientId: CLIENT_ID,
        totalIssues: this.auditResults.issues.length,
        criticalIssues: criticalIssues.length,
        screenshotCount: this.auditResults.screenshots.length
      },
      keyFindings: {
        duplicateActivityComponents: this.auditResults.issues.filter(i => 
          i.type.includes('duplicate_activity')).length,
        tabNavigationIssues: this.auditResults.issues.filter(i => 
          i.location === 'tab_navigation').length,
        layoutIssues: this.auditResults.issues.filter(i => 
          i.location === 'layout').length,
        responsiveIssues: this.auditResults.issues.filter(i => 
          i.location === 'responsive').length,
        jsErrors: this.auditResults.issues.filter(i => 
          i.type === 'javascript_error').length
      },
      metrics: this.auditResults.metrics,
      criticalIssues,
      allIssues: this.auditResults.issues,
      screenshots: this.auditResults.screenshots
    };
    
    // Save report
    const reportPath = `test-results/detailed-audit-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print comprehensive summary
    console.log('\n' + '='.repeat(70));
    console.log('CLIENT DETAIL PAGE COMPREHENSIVE AUDIT REPORT');
    console.log('='.repeat(70));
    console.log(`🕒 Audit completed: ${new Date(report.summary.timestamp).toLocaleString()}`);
    console.log(`🆔 Client ID: ${CLIENT_ID}`);
    console.log(`📊 Total Issues: ${report.summary.totalIssues}`);
    console.log(`⚠️  Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`📸 Screenshots: ${report.summary.screenshotCount}`);
    
    if (this.auditResults.metrics.clientName) {
      console.log(`📝 Client Name: ${this.auditResults.metrics.clientName}`);
    }
    
    console.log('\n📋 DETAILED FINDINGS:');
    console.log(`👥 Activity Component Issues: ${report.keyFindings.duplicateActivityComponents}`);
    console.log(`🔄 Tab Navigation Issues: ${report.keyFindings.tabNavigationIssues}`);
    console.log(`📐 Layout Issues: ${report.keyFindings.layoutIssues}`);
    console.log(`📱 Responsive Issues: ${report.keyFindings.responsiveIssues}`);
    console.log(`🐛 JavaScript Errors: ${report.keyFindings.jsErrors}`);
    
    if (this.auditResults.metrics.foundTabs && this.auditResults.metrics.foundTabs.length > 0) {
      console.log(`\n✅ Found Tabs: ${this.auditResults.metrics.foundTabs.join(', ')}`);
    }
    
    if (this.auditResults.metrics.missingTabs && this.auditResults.metrics.missingTabs.length > 0) {
      console.log(`❌ Missing Tabs: ${this.auditResults.metrics.missingTabs.join(', ')}`);
    }
    
    if (report.keyFindings.duplicateActivityComponents > 0) {
      console.log('\n🔍 DUPLICATE ACTIVITY SECTIONS DETECTED:');
      const duplicateIssues = this.auditResults.issues.filter(i => i.type.includes('duplicate_activity'));
      duplicateIssues.forEach(issue => {
        console.log(`   • ${issue.message}`);
        if (issue.details) {
          issue.details.forEach((detail, i) => {
            console.log(`     ${i + 1}. "${detail.text}" at y=${Math.round(detail.bounds?.y || 0)}`);
          });
        }
      });
    }
    
    if (criticalIssues.length > 0) {
      console.log('\n⚠️  CRITICAL ISSUES:');
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.type}: ${issue.message}`);
      });
    }
    
    console.log(`\n📂 Detailed report saved: ${reportPath}`);
    console.log('📂 All screenshots saved in test-results/');
    console.log('='.repeat(70));
    
    return report;
  }

  async run() {
    try {
      console.log('🚀 Starting Fixed Client Detail Page Audit...\n');
      
      await this.initialize();
      
      const pageLoaded = await this.auditPageStructure();
      if (!pageLoaded) {
        console.log('⚠️ Page failed to load properly, continuing with partial audit...');
      }
      
      await this.auditActivityComponents();
      await this.auditTabNavigation();
      await this.auditLayoutAndPositioning();
      await this.auditResponsiveDesign();
      
      // Final full-page screenshot
      await this.page.setViewport({ width: 1280, height: 720 });
      await this.takeScreenshot('09-final-comprehensive', 'Final comprehensive view');
      
      const report = await this.generateDetailedReport();
      
      console.log('\n✅ Comprehensive audit completed successfully!');
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

// Create results directory
const resultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Run the audit
const auditor = new FixedClientDetailAuditor();
auditor.run().then(() => {
  console.log('🏁 Fixed audit execution completed');
}).catch(error => {
  console.error('💥 Failed to complete audit:', error);
});

module.exports = FixedClientDetailAuditor;