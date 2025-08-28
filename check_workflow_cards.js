const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
    console.log('Logged in successfully');
    
    // Navigate to the tasks page with workflow filter
    await page.goto('http://localhost:3000/internal/tasks?user=all&types=workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for data to load
    
    // Take screenshot
    const timestamp = Date.now();
    const screenshotPath = `/tmp/workflow_cards_${timestamp}.png`;
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`Screenshot saved to ${screenshotPath}`);
    
    // Check page content
    const pageContent = await page.content();
    
    // Check for task cards
    const taskCards = await page.$$('[data-testid="task-card"], .task-card, div.bg-white.rounded-lg.border');
    console.log(`Found ${taskCards.length} task cards on the page`);
    
    // Get the first card's HTML to see its structure
    if (taskCards.length > 0) {
      const firstCardHtml = await taskCards[0].innerHTML();
      console.log('First card structure preview:', firstCardHtml.substring(0, 500));
    }
    
    // Check page title
    const title = await page.textContent('h1');
    console.log('Page title:', title);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();