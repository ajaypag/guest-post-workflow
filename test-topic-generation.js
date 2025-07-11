const puppeteer = require('puppeteer');

async function testTopicGeneration() {
  console.log('Starting Topic Generation verification test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('2. Logging in...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    console.log('3. Waiting for dashboard...');
    await page.waitForSelector('text=Create New Workflow', { timeout: 10000 });
    
    console.log('4. Creating new workflow...');
    await page.click('text=Create New Workflow');
    
    console.log('5. Filling workflow form...');
    await page.waitForSelector('input[placeholder*="campaign"]');
    await page.type('input[placeholder*="campaign"]', 'Test Campaign');
    await page.type('input[placeholder*="Client"]', 'Test Client');
    await page.type('input[placeholder*="website"]', 'https://testclient.com');
    await page.type('textarea[placeholder*="description"]', 'Test client description');
    
    await page.click('button[type="submit"]');
    
    console.log('6. Waiting for workflow page...');
    await page.waitForSelector('text=Topic Generation', { timeout: 10000 });
    
    console.log('7. Clicking on Topic Generation step...');
    await page.click('text=Topic Generation');
    
    console.log('8. Waiting for Topic Generation step to load...');
    await page.waitForSelector('text=Step 2f: Validate in Ahrefs', { timeout: 10000 });
    
    console.log('9. Expanding Step 2f section...');
    await page.click('text=Step 2f: Validate in Ahrefs');
    
    console.log('10. Looking for Ahrefs functionality...');
    await page.waitForSelector('text=Check Your Keywords in Ahrefs', { timeout: 5000 });
    
    // Check if the old dynamic URL is gone
    const dynamicUrlExists = await page.$('a[href*="encodeURIComponent"]');
    if (dynamicUrlExists) {
      console.log('❌ FAILED: Old dynamic URL still exists!');
      return false;
    }
    
    // Check if the new direct link exists
    const directLinkExists = await page.$('a[href="https://app.ahrefs.com/keywords-explorer"]');
    if (!directLinkExists) {
      console.log('❌ FAILED: New direct link not found!');
      return false;
    }
    
    // Check if instructions are present
    const instructionsExist = await page.$('text=Copy your keyword list from Step 2e above');
    if (!instructionsExist) {
      console.log('❌ FAILED: New instructions not found!');
      return false;
    }
    
    console.log('✅ SUCCESS: All changes verified!');
    console.log('- Direct link to Ahrefs Keyword Explorer: ✓');
    console.log('- Step-by-step instructions: ✓');
    console.log('- No dynamic URL generation: ✓');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testTopicGeneration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});