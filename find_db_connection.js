const puppeteer = require('puppeteer');

async function findDatabaseConnection() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Coolify dashboard...');
    
    // Navigate to Coolify dashboard - adjust URL as needed
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Look for the PostgreSQL database service
    console.log('Looking for PostgreSQL database service...');
    
    // Try to find and click on the database service
    const dbServiceSelector = 'a[href*="postgresql-database-ksc80soo8ks8000gcsk0ccw8"], div:contains("postgresql-database-ksc80soo8ks8000gcsk0ccw8"), [data-service*="postgresql-database-ksc80soo8ks8000gcsk0ccw8"]';
    
    try {
      await page.click(dbServiceSelector);
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Could not find direct link, searching for text...');
      
      // Alternative: search for text containing the database name
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        for (const element of elements) {
          if (element.textContent.includes('postgresql-database-ksc80soo8ks8000gcsk0ccw8')) {
            element.click();
            break;
          }
        }
      });
      await page.waitForTimeout(2000);
    }
    
    // Extract all connection-related information
    console.log('Extracting connection information...');
    
    const connectionInfo = await page.evaluate(() => {
      const info = {};
      
      // Look for various connection string patterns
      const patterns = [
        'connection string',
        'internal connection',
        'internal url',
        'database url',
        'connection url',
        'postgres://',
        'postgresql://',
        'host:',
        'port:',
        'database:',
        'username:',
        'password:'
      ];
      
      // Get all text content
      const allText = document.body.innerText;
      
      // Extract relevant sections
      const lines = allText.split('\n');
      const relevantLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        for (const pattern of patterns) {
          if (line.includes(pattern)) {
            // Get this line and the next few lines for context
            for (let j = Math.max(0, i - 1); j < Math.min(lines.length, i + 5); j++) {
              relevantLines.push(lines[j]);
            }
            break;
          }
        }
      }
      
      // Also look for environment variables
      const envVars = Array.from(document.querySelectorAll('code, pre, .env-var, [class*="env"], [class*="variable"]'))
        .map(el => el.textContent)
        .filter(text => text.includes('DATABASE') || text.includes('DB_') || text.includes('POSTGRES'));
      
      // Look for any connection URLs
      const urlPattern = /postgres(?:ql)?:\/\/[^\s]+/gi;
      const urls = allText.match(urlPattern) || [];
      
      return {
        relevantLines: [...new Set(relevantLines)],
        envVars: [...new Set(envVars)],
        connectionUrls: [...new Set(urls)],
        fullPageText: allText
      };
    });
    
    console.log('\n=== DATABASE CONNECTION INFORMATION ===\n');
    
    if (connectionInfo.connectionUrls.length > 0) {
      console.log('Connection URLs found:');
      connectionInfo.connectionUrls.forEach(url => console.log(`  - ${url}`));
    }
    
    if (connectionInfo.envVars.length > 0) {
      console.log('\nEnvironment Variables:');
      connectionInfo.envVars.forEach(env => console.log(`  - ${env}`));
    }
    
    if (connectionInfo.relevantLines.length > 0) {
      console.log('\nRelevant Information:');
      connectionInfo.relevantLines.forEach(line => console.log(`  ${line}`));
    }
    
    // Take a screenshot for reference
    await page.screenshot({ path: 'coolify_db_page.png', fullPage: true });
    console.log('\nScreenshot saved as coolify_db_page.png');
    
    // Also try to find any tabs or sections that might contain connection info
    const tabs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, [role="tab"], .tab'))
        .map(el => el.textContent)
        .filter(text => text && text.length < 50);
    });
    
    console.log('\nAvailable tabs/sections:');
    tabs.forEach(tab => console.log(`  - ${tab}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

findDatabaseConnection();