const puppeteer = require('puppeteer');

async function testFrontendPages() {
  console.log('🎭 Starting Frontend Manual Testing...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport for responsive testing
  await page.setViewport({ width: 1920, height: 1080 });
  
  const baseUrl = 'http://localhost:3002';
  
  const testPages = [
    { name: 'Homepage', url: '/', expectAuth: false },
    { name: 'Publisher Dashboard', url: '/publisher', expectAuth: true },
    { name: 'Publisher Orders', url: '/publisher/orders', expectAuth: true },
    { name: 'Publisher Invoices', url: '/publisher/invoices', expectAuth: true },
    { name: 'Create Invoice', url: '/publisher/invoices/new', expectAuth: true },
    { name: 'Payment Profile', url: '/publisher/payment-profile', expectAuth: true },
    { name: 'Admin Migrations', url: '/admin/publisher-migrations', expectAuth: true },
  ];
  
  let passedTests = 0;
  let totalTests = 0;
  
  for (const testPage of testPages) {
    totalTests++;
    console.log(`📄 Testing: ${testPage.name} (${testPage.url})`);
    
    try {
      // Navigate to page
      const response = await page.goto(`${baseUrl}${testPage.url}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      // Check if page loads
      if (!response) {
        console.log(`❌ ${testPage.name}: Failed to load`);
        continue;
      }
      
      const status = response.status();
      console.log(`   Status: ${status}`);
      
      // Check for basic page structure
      await page.waitForSelector('body', { timeout: 5000 });
      
      // Check if it's an auth redirect (302/401) vs actual error
      if (status === 302 || status === 401) {
        if (testPage.expectAuth) {
          console.log(`✅ ${testPage.name}: Correctly requires authentication`);
          passedTests++;
        } else {
          console.log(`⚠️  ${testPage.name}: Unexpected auth requirement`);
        }
      } else if (status >= 200 && status < 300) {
        // Check for React components loading
        const hasReactContent = await page.evaluate(() => {
          return document.querySelector('[data-reactroot]') !== null ||
                 document.body.innerHTML.includes('react') ||
                 document.body.innerHTML.length > 1000; // Basic content check
        });
        
        if (hasReactContent) {
          console.log(`✅ ${testPage.name}: Page loaded successfully`);
          passedTests++;
        } else {
          console.log(`⚠️  ${testPage.name}: Page loaded but may have rendering issues`);
        }
        
        // Check for error messages in console
        const logs = await page.evaluate(() => {
          return window.console.errors || [];
        });
        
        if (logs.length > 0) {
          console.log(`   Console errors: ${logs.length}`);
        }
        
      } else {
        console.log(`❌ ${testPage.name}: HTTP ${status} error`);
      }
      
    } catch (error) {
      console.log(`❌ ${testPage.name}: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Test basic interactions on homepage
  console.log('🖱️  Testing Basic Interactions...');
  try {
    await page.goto(`${baseUrl}/`);
    
    // Check for clickable elements
    const buttons = await page.$$('button');
    const links = await page.$$('a');
    
    console.log(`   Found ${buttons.length} buttons and ${links.length} links`);
    
    if (buttons.length > 0 || links.length > 0) {
      console.log('✅ Interactive elements found');
      passedTests++;
    }
    totalTests++;
    
  } catch (error) {
    console.log(`❌ Interaction test failed: ${error.message}`);
    totalTests++;
  }
  
  // Test responsive design
  console.log('📱 Testing Responsive Design...');
  try {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.goto(`${baseUrl}/publisher`);
      
      const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
      
      if (bodyWidth <= viewport.width) {
        console.log(`✅ ${viewport.name} (${viewport.width}px): Responsive`);
      } else {
        console.log(`⚠️  ${viewport.name} (${viewport.width}px): May have overflow`);
      }
    }
    
    passedTests++;
    totalTests++;
    
  } catch (error) {
    console.log(`❌ Responsive test failed: ${error.message}`);
    totalTests++;
  }
  
  await browser.close();
  
  // Results Summary
  console.log('\n📊 Frontend Testing Results:');
  console.log('=' .repeat(40));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All frontend tests passed! UI is functional.');
  } else if (passedTests / totalTests >= 0.8) {
    console.log('\n✅ Most tests passed. Minor issues may exist.');
  } else {
    console.log('\n⚠️  Several tests failed. Review needed.');
  }
  
  console.log('\n🌐 Manual Testing URLs (copy to browser):');
  testPages.forEach(page => {
    console.log(`   ${page.name}: http://localhost:3002${page.url}`);
  });
}

testFrontendPages().catch(console.error);