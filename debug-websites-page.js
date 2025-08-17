const { chromium } = require('playwright');

async function debugWebsitesPage() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), ':', msg.text());
  });
  
  // Capture network responses
  page.on('response', async response => {
    if (response.url().includes('/api/publisher/websites')) {
      console.log('\nAPI Call to:', response.url());
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Response:', JSON.stringify(body, null, 2));
      } catch (e) {
        const text = await response.text();
        console.log('Response text:', text);
      }
    }
  });
  
  try {
    // Login
    console.log('Logging in...');
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to websites
    console.log('Navigating to websites page...\n');
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    const pageContent = await page.locator('body').textContent();
    if (pageContent.includes('No websites yet')) {
      console.log('\nPage shows: "No websites yet" message');
    }
    
    // Check table
    const tableExists = await page.locator('table').count();
    console.log('\nTable elements found:', tableExists);
    
    const rowCount = await page.locator('table tbody tr').count();
    console.log('Table rows found:', rowCount);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

debugWebsitesPage().catch(console.error);
