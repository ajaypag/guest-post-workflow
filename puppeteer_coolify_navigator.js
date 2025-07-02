// Puppeteer script to find PostgreSQL connection info in Coolify

const STEPS = `
=== PUPPETEER STEPS TO FIND DATABASE CONNECTION ===

1. NAVIGATE TO COOLIFY:
   puppeteer_navigate({ url: "http://localhost:8000" })
   // Or use your Coolify URL

2. TAKE INITIAL SCREENSHOT:
   puppeteer_screenshot({ name: "coolify_dashboard", encoded: false })

3. LOOK FOR THE DATABASE SERVICE:
   // Try clicking on the database service
   puppeteer_click({ selector: "a[href*='postgresql-database-ksc80soo8ks8000gcsk0ccw8']" })
   
   // Or search for it by text
   puppeteer_evaluate({ 
     script: \`
       const elements = Array.from(document.querySelectorAll('*'));
       for (const el of elements) {
         if (el.textContent.includes('postgresql-database-ksc80soo8ks8000gcsk0ccw8')) {
           el.click();
           return 'Clicked on: ' + el.tagName + ' - ' + el.textContent.substring(0, 100);
         }
       }
       return 'Database not found on page';
     \`
   })

4. WAIT AND SCREENSHOT THE DATABASE PAGE:
   puppeteer_screenshot({ name: "database_page", encoded: false })

5. EXTRACT ALL CONNECTION INFORMATION:
   puppeteer_evaluate({
     script: \`
       const connectionInfo = {
         urls: [],
         envVars: {},
         connectionStrings: [],
         credentials: {}
       };
       
       // Find all PostgreSQL URLs
       const pageText = document.body.innerText;
       const urlMatches = pageText.match(/postgres(?:ql)?:\\/\\/[^\\s"']+/gi) || [];
       connectionInfo.urls = [...new Set(urlMatches)];
       
       // Look for connection-related text
       const connectionPatterns = [
         /connection\\s*string\\s*:?\\s*([^\\n]+)/gi,
         /internal\\s*url\\s*:?\\s*([^\\n]+)/gi,
         /database\\s*url\\s*:?\\s*([^\\n]+)/gi,
         /host\\s*:?\\s*([^\\s,;\\n]+)/gi,
         /port\\s*:?\\s*(\\d+)/gi,
         /database\\s*:?\\s*([^\\s,;\\n]+)/gi,
         /username\\s*:?\\s*([^\\s,;\\n]+)/gi,
         /password\\s*:?\\s*([^\\s,;\\n]+)/gi
       ];
       
       // Extract environment variables
       const envElements = document.querySelectorAll('code, pre, .env-var, [class*="env"]');
       envElements.forEach(el => {
         const text = el.textContent;
         if (text.includes('DATABASE') || text.includes('POSTGRES') || text.includes('DB_')) {
           const lines = text.split('\\n');
           lines.forEach(line => {
             const match = line.match(/([A-Z_]+)\\s*=\\s*(.+)/);
             if (match) {
               connectionInfo.envVars[match[1]] = match[2];
             }
           });
         }
       });
       
       // Look for any copyable elements
       const copyButtons = document.querySelectorAll('button[class*="copy"], [onclick*="copy"], [data-copy]');
       const copyableContent = [];
       copyButtons.forEach(btn => {
         const parent = btn.parentElement;
         const codeBlock = parent.querySelector('code, pre');
         if (codeBlock) {
           copyableContent.push(codeBlock.textContent);
         }
       });
       connectionInfo.copyableContent = copyableContent;
       
       // Extract visible form inputs (might contain credentials)
       const inputs = document.querySelectorAll('input[type="text"], input[type="password"], input:not([type="hidden"])');
       inputs.forEach(input => {
         const label = input.labels?.[0]?.textContent || input.placeholder || input.name || '';
         if (label.toLowerCase().includes('host') || 
             label.toLowerCase().includes('port') || 
             label.toLowerCase().includes('database') || 
             label.toLowerCase().includes('user') || 
             label.toLowerCase().includes('pass')) {
           connectionInfo.credentials[label] = input.value;
         }
       });
       
       return JSON.stringify(connectionInfo, null, 2);
     \`
   })

6. CHECK FOR TABS OR SECTIONS:
   puppeteer_evaluate({
     script: \`
       const tabs = Array.from(document.querySelectorAll('button[role="tab"], .tab, a[class*="tab"], [data-tab]'));
       const tabInfo = tabs.map(tab => ({
         text: tab.textContent.trim(),
         selector: tab.tagName + (tab.id ? '#' + tab.id : '') + (tab.className ? '.' + tab.className.split(' ')[0] : '')
       }));
       return JSON.stringify(tabInfo, null, 2);
     \`
   })

7. CLICK ON CONNECTION/ENVIRONMENT TAB IF FOUND:
   // Try common tab names
   puppeteer_click({ selector: "button:contains('Connection')" })
   // Or
   puppeteer_click({ selector: "button:contains('Environment')" })
   // Or
   puppeteer_click({ selector: "button:contains('Variables')" })

8. TAKE FINAL SCREENSHOT:
   puppeteer_screenshot({ name: "connection_info", encoded: false })

9. EXTRACT FINAL CONNECTION INFO:
   puppeteer_evaluate({
     script: \`
       // Final comprehensive extraction
       const allText = document.body.innerText;
       const sections = allText.split('\\n\\n');
       const relevantSections = sections.filter(section => 
         section.toLowerCase().includes('connection') ||
         section.toLowerCase().includes('postgres') ||
         section.toLowerCase().includes('database') ||
         section.includes('://')
       );
       
       return {
         relevantSections: relevantSections,
         fullText: allText.substring(0, 5000) // First 5000 chars
       };
     \`
   })
`;

console.log(STEPS);

// Helper function to parse Coolify connection formats
function parseCoolifyConnection(text) {
  // Common Coolify patterns
  const patterns = {
    internalUrl: /Internal URL:\s*(.+)/i,
    connectionString: /Connection String:\s*(.+)/i,
    databaseUrl: /DATABASE_URL[=:]\s*(.+)/i,
    postgresUrl: /POSTGRES_URL[=:]\s*(.+)/i
  };
  
  const results = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      results[key] = match[1].trim();
    }
  }
  
  return results;
}

module.exports = { parseCoolifyConnection };