const { chromium } = require('playwright');

async function testMigrationThroughFrontend() {
  const browser = await chromium.launch({ 
    headless: true,
    // Set to false if you want to see the browser
    // headless: false,
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  // Listen for failed requests
  page.on('requestfailed', request => {
    console.log('Request failed:', request.url(), request.failure().errorText);
  });
  
  // Listen for responses
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP ${response.status()} error for:`, response.url());
      response.text().then(text => {
        try {
          const json = JSON.parse(text);
          if (json.error) {
            console.log('  Error message:', json.error);
          }
        } catch {
          if (text.length < 500) {
            console.log('  Response:', text);
          }
        }
      }).catch(() => {});
    }
  });
  
  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3006/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('2. Filling in login credentials...');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    
    console.log('3. Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('  Did not redirect to dashboard, checking current URL...');
      console.log('  Current URL:', page.url());
    });
    
    console.log('4. Navigating to migration page...');
    await page.goto('http://localhost:3006/admin/migration', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    console.log('5. Looking for migration buttons...');
    
    // First, try to click the "Force Clear & Re-run Migration" button if it exists
    const forceButton = await page.locator('button:has-text("Force Clear")').first();
    if (await forceButton.isVisible()) {
      console.log('6. Found "Force Clear & Re-run Migration" button, clicking it...');
      await forceButton.click();
      await page.waitForTimeout(3000);
      
      // Check if there are any error messages in the logs section
      const logMessages = await page.locator('div:has(> div:has-text("Migration Logs")) >> text=/❌/').allTextContents();
      if (logMessages.length > 0) {
        console.log('  Cleanup errors found:');
        logMessages.forEach(msg => console.log('    -', msg));
      }
    }
    
    // Now try the full migration
    console.log('7. Looking for full migration section...');
    
    // Type the confirmation text
    const confirmInput = await page.locator('input[placeholder*="MIGRATE NOW"]').first();
    if (await confirmInput.isVisible()) {
      console.log('8. Typing confirmation text...');
      await confirmInput.fill('MIGRATE NOW');
      
      console.log('9. Clicking "Execute Full Migration" button...');
      const migrateButton = await page.locator('button:has-text("Execute Full Migration")').first();
      await migrateButton.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Check for any error messages
      console.log('10. Checking for error messages...');
      
      // Check the logs section
      const errorLogs = await page.locator('div:has-text("❌")').allTextContents();
      if (errorLogs.length > 0) {
        console.log('\n=== MIGRATION ERRORS FOUND ===');
        errorLogs.forEach(log => {
          if (log.includes('❌')) {
            console.log(log);
          }
        });
      }
      
      // Check for any alert dialogs
      page.on('dialog', async dialog => {
        console.log('Alert dialog:', dialog.message());
        await dialog.dismiss();
      });
      
      // Check migration status
      const statusText = await page.locator('text=/Migration Phase/').locator('..').textContent();
      console.log('\nMigration status:', statusText);
      
    } else {
      console.log('Could not find migration confirmation input');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    
    // Take a screenshot on error
    await page.screenshot({ path: 'migration-error.png' });
    console.log('Screenshot saved as migration-error.png');
  } finally {
    await browser.close();
  }
}

console.log('Starting frontend migration test...\n');
testMigrationThroughFrontend().catch(console.error);