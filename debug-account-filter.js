const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-web-security'],
    devtools: true
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('ACCOUNT FILTER DEBUG') || msg.text().includes('clientIds')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });
  
  try {
    // Login
    console.log('Logging in...');
    await page.goto('http://localhost:3005/login');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'ajay@outreachlabs.com');
    await page.type('input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Go to workflows page
    console.log('Going to workflows page...');
    await page.goto('http://localhost:3005/');
    await page.waitForSelector('button[aria-haspopup="listbox"]', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Open account dropdown
    console.log('Opening account dropdown...');
    await page.click('button[aria-haspopup="listbox"]');
    await page.waitForSelector('ul[role="listbox"]');
    
    // Get all account options
    const accountOptions = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('li[role="option"]'));
      return options.map(option => ({
        id: option.getAttribute('aria-selected'),
        text: option.textContent.trim()
      }));
    });
    
    console.log('Available accounts:', accountOptions);
    
    // Look for Zaid's account
    const zaidOption = accountOptions.find(opt => 
      opt.text.toLowerCase().includes('zaid') || 
      opt.text.toLowerCase().includes('zelenka')
    );
    
    if (zaidOption) {
      console.log('Found Zaid account:', zaidOption.text);
      
      // Click on Zaid's account
      await page.evaluate((text) => {
        const options = Array.from(document.querySelectorAll('li[role="option"]'));
        const zaidOption = options.find(opt => opt.textContent.trim() === text);
        if (zaidOption) zaidOption.click();
      }, zaidOption.text);
      
      // Wait for filtering and console logs
      await page.waitForTimeout(3000);
      
    } else {
      console.log('Zaid account not found. Available accounts:');
      accountOptions.forEach(opt => console.log(' -', opt.text));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  // Keep browser open for inspection
  console.log('Browser will stay open for inspection...');
  // await browser.close();
})();