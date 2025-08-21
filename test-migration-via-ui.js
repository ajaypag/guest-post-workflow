const puppeteer = require('puppeteer');

async function runMigrationViaUI() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Fill in login form
    console.log('2. Filling login form...');
    await page.type('input[name="email"]', 'ajay@outreachlabs.com');
    await page.type('input[name="password"]', 'FA64!I$nrbCauS^d');
    
    // Click login button
    console.log('3. Clicking login button...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    
    // Give it a moment to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('4. Login successful, navigating to migration page...');
    
    // Navigate to admin migration page
    await page.goto('http://localhost:3000/admin/line-items-migration', { waitUntil: 'networkidle0' });
    console.log('5. On migration page, looking for migration 0057...');
    
    // Wait for the page to load migrations
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    
    // Find and click the Run Migration button for 0057
    // The button is inside the migration card for 0057
    const runButton = await page.evaluateHandle(() => {
      // Find the card that contains "Migration 0057"
      const cards = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      for (const card of cards) {
        if (card.textContent.includes('Migration 0057')) {
          // Find the Run Migration button in this card
          const buttons = card.querySelectorAll('button');
          for (const button of buttons) {
            if (button.textContent.includes('Run Migration')) {
              return button;
            }
          }
        }
      }
      return null;
    });
    
    if (runButton) {
      console.log('6. Found Run Migration button for 0057, clicking...');
      await runButton.click();
      
      // Wait for the migration to complete
      console.log('7. Waiting for migration to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check for success or error messages
      const pageContent = await page.content();
      
      if (pageContent.includes('Success') || pageContent.includes('completed')) {
        console.log('✅ Migration appears to have completed successfully!');
      } else if (pageContent.includes('Error') || pageContent.includes('failed')) {
        console.log('❌ Migration failed. Checking error message...');
        const errorElement = await page.$('.bg-red-50');
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          console.log('Error:', errorText);
        }
      }
      
      // Take a screenshot of the final state
      await page.screenshot({ path: 'migration-result.png' });
      console.log('8. Screenshot saved as migration-result.png');
      
    } else {
      console.log('❌ Could not find Run Migration button for 0057');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

runMigrationViaUI();