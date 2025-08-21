const puppeteer = require('puppeteer');

async function testSplitMigrations() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.type('input[name="email"]', 'ajay@outreachlabs.com');
    await page.type('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('2. Navigating to migration page...');
    await page.goto('http://localhost:3000/admin/line-items-migration', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run each migration in sequence
    const migrations = ['0057a', '0057b', '0057c', '0057d', '0057e', '0057f'];
    
    for (const migration of migrations) {
      console.log(`\n3. Running migration ${migration}...`);
      
      // Click the Run Migration button for this specific migration
      const clicked = await page.evaluate((migrationId) => {
        const cards = document.querySelectorAll('div');
        for (const card of cards) {
          if (card.textContent && card.textContent.includes(`Migration ${migrationId}`)) {
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
      }, migration);
      
      if (clicked) {
        console.log(`   Clicked Run Migration for ${migration}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take screenshot after each migration
        await page.screenshot({ path: `migration-${migration}-result.png`, fullPage: true });
        
        // Check for success or error
        const pageContent = await page.content();
        if (pageContent.includes(`${migration}`) && pageContent.includes('successfully')) {
          console.log(`   ✅ Migration ${migration} completed successfully`);
        } else if (pageContent.includes('failed')) {
          console.log(`   ❌ Migration ${migration} failed`);
          // Get error details
          const errorText = await page.evaluate(() => {
            const errorEl = document.querySelector('.bg-red-50');
            return errorEl ? errorEl.textContent : 'No error details';
          });
          console.log(`   Error: ${errorText}`);
        } else {
          console.log(`   ⚠️ Migration ${migration} status unclear`);
        }
        
        // Refresh page for next migration
        await page.reload({ waitUntil: 'domcontentloaded' });
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log(`   ❌ Could not find Run Migration button for ${migration}`);
      }
    }
    
    console.log('\n4. All migrations attempted. Taking final screenshot...');
    await page.screenshot({ path: 'migration-final-result.png', fullPage: true });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testSplitMigrations();