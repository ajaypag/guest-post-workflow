const puppeteer = require('puppeteer');

async function runMigrationViaUI() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    
    console.log('2. Logging in...');
    await page.type('input[name="email"]', 'ajay@outreachlabs.com');
    await page.type('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    
    console.log('3. Waiting a bit...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('4. Going to migration page...');
    await page.goto('http://localhost:3000/admin/line-items-migration', { waitUntil: 'domcontentloaded' });
    
    console.log('5. Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('6. Taking screenshot...');
    await page.screenshot({ path: 'migration-page.png', fullPage: true });
    
    console.log('7. Looking for Run Migration button...');
    const runButton = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent && button.textContent.includes('Run Migration')) {
          return button.textContent;
        }
      }
      return null;
    });
    
    if (runButton) {
      console.log('Found button:', runButton);
      
      // Click the Run Migration button for 0057
      await page.evaluate(() => {
        const cards = document.querySelectorAll('div');
        for (const card of cards) {
          if (card.textContent && card.textContent.includes('Migration 0057')) {
            const buttons = card.querySelectorAll('button');
            for (const button of buttons) {
              if (button.textContent && button.textContent.includes('Run Migration')) {
                button.click();
                return true;
              }
            }
          }
        }
        return false;
      });
      
      console.log('8. Clicked Run Migration for 0057');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('9. Taking final screenshot...');
      await page.screenshot({ path: 'migration-result.png', fullPage: true });
      
    } else {
      console.log('No Run Migration button found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

runMigrationViaUI();