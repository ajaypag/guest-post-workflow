const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down to observe user flow
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('🔍 Starting UX Audit of Client Module\n');
  console.log('=====================================\n');

  try {
    // Login first
    console.log('📝 Step 1: Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to clients list
    console.log('📝 Step 2: Navigating to /clients...\n');
    await page.goto('http://localhost:3000/clients');
    await page.waitForLoadState('networkidle');
    
    // Analyze clients list page
    console.log('🔍 CLIENTS LIST PAGE ANALYSIS:');
    console.log('--------------------------------');
    
    // Check page title and header
    const pageTitle = await page.textContent('h1');
    console.log(`✓ Page Title: "${pageTitle}"`);
    
    // Count clients
    const clientCards = await page.$$('[data-testid="client-card"], .bg-white.rounded-lg.shadow, a[href^="/clients/"]');
    console.log(`✓ Number of clients visible: ${clientCards.length}`);
    
    // Check for search/filter options
    const hasSearch = await page.$('input[type="search"], input[placeholder*="search" i]');
    console.log(`${hasSearch ? '✓' : '✗'} Search functionality: ${hasSearch ? 'Present' : 'Missing'}`);
    
    // Check for add new client button
    const hasAddButton = await page.$('button:has-text("Add"), button:has-text("New Client"), a:has-text("Add Client")');
    console.log(`${hasAddButton ? '✓' : '✗'} Add new client button: ${hasAddButton ? 'Present' : 'Missing'}`);
    
    // Take screenshot of clients list
    await page.screenshot({ path: 'audit-1-clients-list.png', fullPage: true });
    
    // Navigate to PPC Masterminds
    console.log('\n📝 Step 3: Finding and clicking PPC Masterminds...\n');
    
    // Try to find PPC Masterminds link
    const ppcLink = await page.$('a:has-text("PPC Masterminds"), div:has-text("PPC Masterminds")');
    if (ppcLink) {
      const isClickable = await ppcLink.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      console.log(`✓ Found PPC Masterminds: ${isClickable ? 'Clickable' : 'Not easily clickable'}`);
    } else {
      console.log('✗ Could not easily find PPC Masterminds in the list');
    }
    
    // Navigate directly to PPC Masterminds
    console.log('\n📝 Step 4: Navigating to PPC Masterminds client page...\n');
    await page.goto('http://localhost:3000/clients/aca65919-c0f9-49d0-888b-2c488f7580dc');
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 CLIENT DETAIL PAGE ANALYSIS:');
    console.log('--------------------------------');
    
    // Analyze client detail page structure
    const clientName = await page.textContent('h1, h2');
    console.log(`✓ Client Name Display: "${clientName}"`);
    
    // Count the number of sections/cards on the page
    const sections = await page.$$('.bg-white.rounded-lg, .border.rounded-lg, section');
    console.log(`✓ Number of sections/cards: ${sections.length}`);
    
    // Check for navigation/breadcrumbs
    const hasBreadcrumbs = await page.$('nav[aria-label="breadcrumb"], nav[aria-label="Breadcrumb"], a:has-text("Back"), a:has-text("Clients")');
    console.log(`${hasBreadcrumbs ? '✓' : '✗'} Navigation/Breadcrumbs: ${hasBreadcrumbs ? 'Present' : 'Missing'}`);
    
    // Find all available actions/links
    console.log('\n📊 Available Actions/Features:');
    const links = await page.$$eval('a[href*="/clients/aca65919"], button', elements => 
      elements.map(el => ({
        text: el.textContent.trim(),
        href: el.href || 'button',
        visible: el.offsetParent !== null
      })).filter(item => item.text && item.visible)
    );
    
    links.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text} ${link.href !== 'button' ? `(${link.href.split('/').pop()})` : '(button)'}`);
    });
    
    // Check for visual hierarchy
    console.log('\n📐 Visual Hierarchy Check:');
    const headings = await page.$$eval('h1, h2, h3, h4', elements => 
      elements.map(el => ({
        tag: el.tagName,
        text: el.textContent.trim()
      }))
    );
    
    headings.forEach(h => {
      console.log(`  ${h.tag}: ${h.text}`);
    });
    
    // Take screenshot
    await page.screenshot({ path: 'audit-2-client-detail.png', fullPage: true });
    
    // Check for feature organization
    console.log('\n🗂️ Feature Organization:');
    
    // Look for specific features
    const features = [
      { selector: 'text=/target page/i', name: 'Target Pages' },
      { selector: 'text=/bulk analysis/i', name: 'Bulk Analysis' },
      { selector: 'text=/order/i', name: 'Orders' },
      { selector: 'text=/workflow/i', name: 'Workflows' },
      { selector: 'text=/brand intelligence/i', name: 'Brand Intelligence' },
      { selector: 'text=/account/i', name: 'Account Info' },
      { selector: 'text=/contact/i', name: 'Contact Info' },
      { selector: 'text=/note/i', name: 'Notes' },
      { selector: 'text=/setting/i', name: 'Settings' }
    ];
    
    for (const feature of features) {
      const element = await page.$(feature.selector);
      console.log(`  ${element ? '✓' : '✗'} ${feature.name}: ${element ? 'Found' : 'Not visible'}`);
    }
    
    // Scroll to check if content is below fold
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    console.log(`\n📏 Page Length: ${Math.round(scrollHeight / viewportHeight)} viewport heights (${scrollHeight > viewportHeight * 2 ? 'Too long!' : 'Reasonable'})`);
    
    // Take screenshot of scrolled view
    await page.screenshot({ path: 'audit-3-client-detail-scrolled.png', fullPage: true });
    
    // Try bulk analysis
    console.log('\n📝 Step 5: Checking Bulk Analysis...\n');
    const bulkAnalysisLink = await page.$('a[href*="bulk-analysis"]');
    if (bulkAnalysisLink) {
      await bulkAnalysisLink.click();
      await page.waitForLoadState('networkidle');
      
      console.log('🔍 BULK ANALYSIS PAGE:');
      const projects = await page.$$('.bg-white.rounded-lg');
      console.log(`  ✓ Number of projects: ${projects.length}`);
      
      await page.screenshot({ path: 'audit-4-bulk-analysis.png', fullPage: true });
    }
    
    console.log('\n=====================================');
    console.log('🎯 UX AUDIT COMPLETE\n');
    
  } catch (error) {
    console.error('Error during audit:', error);
  }
  
  // Keep browser open for manual inspection
  console.log('Browser staying open for manual inspection. Press Ctrl+C to close.');
  await new Promise(() => {});
})();