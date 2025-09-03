import { chromium } from 'playwright';

async function testOrdersPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to publisher login...');
    await page.goto('http://localhost:3001/publisher/login', { waitUntil: 'networkidle' });
    
    // Login first
    await page.fill('input[type="email"]', 'sophia@delightfullynotedblog.com');
    await page.fill('input[type="password"]', '2yK4$^1*NeelDTgf');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Navigate to orders page
    console.log('Navigating to orders page...');
    await page.goto('http://localhost:3001/publisher/orders');
    await page.waitForTimeout(5000);
    
    console.log('Orders page URL:', page.url());
    
    // Check for loading states
    const loadingSpinner = await page.$('.animate-spin');
    console.log('Loading spinner found:', !!loadingSpinner);
    
    // Check for error messages
    const errorElement = await page.$('.text-red-800');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('❌ Orders page error:', errorText);
    }
    
    // Check page content
    const pageText = await page.textContent('body');
    
    if (pageText?.includes('Failed to fetch orders')) {
      console.log('❌ Found "Failed to fetch orders" error');
    }
    
    if (pageText?.includes('Loading orders')) {
      console.log('📄 Found "Loading orders" text');
    }
    
    if (pageText?.includes('No orders')) {
      console.log('📄 Found "No orders" text - this might be normal');
    }
    
    // Check for stats cards
    const statsCards = await page.$$('.bg-white.rounded-lg.shadow-md');
    console.log('Stats cards found:', statsCards.length);
    
    // Check browser console for API errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Check network tab for failed requests
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        console.log(`❌ API request failed: ${response.status()} ${response.url()}`);
      }
    });
    
    // Wait and observe
    await page.waitForTimeout(8000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/orders_page_debug.png' });
    console.log('Screenshot saved to /tmp/orders_page_debug.png');
    
  } catch (error) {
    console.error('Error testing orders page:', error.message);
  } finally {
    await browser.close();
  }
}

testOrdersPage().catch(console.error);