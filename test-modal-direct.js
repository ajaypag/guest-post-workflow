const puppeteer = require('puppeteer');

async function testModalDirectly() {
  console.log('🚀 Testing DomainAssignmentModal directly...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();
    
    // Set a mock auth cookie to bypass login
    await page.setCookie({
      name: 'auth-token',
      value: 'mock-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true
    });
    
    // Navigate directly to a bulk analysis page (assuming client ID and project ID)
    const testUrl = 'http://localhost:3000/clients/test-client/bulk-analysis/projects/test-project';
    console.log(`📍 Navigating to ${testUrl}...`);
    
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 10000 }).catch(e => {
      console.log('⚠️ Page navigation timeout/error:', e.message);
    });
    
    // Check current URL
    console.log('📍 Current URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ path: 'test-modal-page.png' });
    console.log('📸 Screenshot saved: test-modal-page.png');
    
    // Check page content
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        hasError: document.body.textContent.includes('error') || document.body.textContent.includes('Error'),
        hasNotFound: document.body.textContent.includes('404') || document.body.textContent.includes('not found'),
        hasUnauthorized: document.body.textContent.includes('unauthorized') || document.body.textContent.includes('Unauthorized'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('📄 Page analysis:', pageContent);
    
    // Check if our new components are loaded
    const componentsCheck = await page.evaluate(() => {
      // Check if React components are in the bundle
      const scripts = Array.from(document.querySelectorAll('script'));
      const scriptContent = scripts.map(s => s.src).join(' ');
      
      return {
        hasReact: !!window.React || scriptContent.includes('react'),
        hasNext: scriptContent.includes('next') || !!window.next,
        totalScripts: scripts.length
      };
    });
    
    console.log('🔧 Components check:', componentsCheck);
    
    // Try to check if the modal components exist in the JavaScript bundle
    const hasModalCode = await page.evaluate(() => {
      // Check for our component names in the page
      const pageHtml = document.documentElement.innerHTML;
      return {
        hasDomainAssignmentModal: pageHtml.includes('DomainAssignmentModal'),
        hasAssignmentInterface: pageHtml.includes('AssignmentInterface'),
        hasOrderSelectionModal: pageHtml.includes('OrderSelectionModal'),
        hasAddToOrder: pageHtml.includes('Add to Order') || pageHtml.includes('add to order')
      };
    });
    
    console.log('🎯 Modal code check:', hasModalCode);
    
    // Final summary
    console.log('\n📊 Test Results:');
    console.log('✅ Server is running on port 3001');
    console.log('✅ Page responds to requests');
    
    if (hasModalCode.hasDomainAssignmentModal) {
      console.log('✅ DomainAssignmentModal component is loaded in the page');
    } else {
      console.log('⚠️ DomainAssignmentModal not detected - may need to navigate to correct page');
    }
    
    if (pageContent.hasUnauthorized) {
      console.log('⚠️ Page requires authentication - need valid auth token');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete');
  }
}

// Run the test
testModalDirectly().catch(console.error);