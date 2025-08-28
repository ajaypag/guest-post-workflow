const { chromium } = require('playwright');

async function createMockRequestsSimple() {
  console.log('Creating mock vetted sites requests for testing...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3003/');
    
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'auth-session');
    
    // Test creating one request first
    console.log('Creating test request...');
    
    const response = await page.evaluate(async ({ cookie }) => {
      const response = await fetch('/api/vetted-sites/requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `auth-session=${cookie}`
        },
        body: JSON.stringify({
          target_urls: ['https://example.com/blog', 'https://test.com/articles'],
          notes: 'Test request for email notifications',
          filters: {
            topics: [],
            keywords: []
          }
        })
      });
      
      return {
        ok: response.ok,
        status: response.status,
        text: await response.text()
      };
    }, { cookie: sessionCookie.value });
    
    if (response.ok) {
      const result = JSON.parse(response.text);
      console.log('✅ Created request:', result.request.id);
    } else {
      console.log('❌ Failed:', response.status, response.text);
    }
    
    // Go to requests page
    await page.goto('http://localhost:3003/internal/vetted-sites/requests');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Check the requests page - you should see the new request!');
    console.log('✅ You can now test email notifications by clicking status buttons');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('Browser staying open for testing...');
    // Keep open for manual testing
    await page.waitForTimeout(60000);
  }
}

createMockRequestsSimple();