const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('[DEBUG]') || msg.text().includes('lineItems')) {
      console.log('Console:', msg.text());
    }
  });
  
  // Navigate to login
  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  // Login
  await page.type('input[name="email"]', 'ajay@outreachlabs.com');
  await page.type('input[name="password"]', 'FA64!I$nrbCauS^d');
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Logged in successfully');
  
  // Navigate to the order page
  console.log('Navigating to order page...');
  await page.goto('http://localhost:3000/orders/f450ae02-d830-4152-a661-228d6ccbb6b1/internal', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Wait a bit for React to render
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get the line items data from the page
  const pageData = await page.evaluate(() => {
    // Try to find the line items table
    const tables = document.querySelectorAll('table');
    let lineItemsTable = null;
    
    for (const table of tables) {
      if (table.textContent && (table.textContent.includes('Target Page') || table.textContent.includes('Assigned Domain'))) {
        lineItemsTable = table;
        break;
      }
    }
    
    // Count rows in the table
    const rows = lineItemsTable ? lineItemsTable.querySelectorAll('tbody tr') : [];
    
    // Get some sample data from first row
    let firstRowData = null;
    if (rows.length > 0) {
      const cells = rows[0].querySelectorAll('td');
      firstRowData = {
        cellCount: cells.length,
        cellContents: Array.from(cells).map(cell => (cell.textContent || '').trim().substring(0, 50))
      };
    }
    
    return {
      hasLineItemsTable: Boolean(lineItemsTable),
      rowCount: rows.length,
      tableHeaders: lineItemsTable ? Array.from(lineItemsTable.querySelectorAll('th')).map(th => (th.textContent || '').trim()) : [],
      firstRowData,
      pageTitle: document.title,
      hasError: document.body.textContent ? document.body.textContent.includes('Error') : false
    };
  });
  
  console.log('Page data:', JSON.stringify(pageData, null, 2));
  
  // Try to get the actual API response
  const apiResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/orders/f450ae02-d830-4152-a661-228d6ccbb6b1', {
        credentials: 'include'
      });
      const data = await response.json();
      return {
        hasLineItems: Boolean(data.lineItems),
        lineItemCount: data.lineItems ? data.lineItems.length : 0,
        firstLineItem: data.lineItems && data.lineItems[0] ? {
          hasAssignedDomain: Boolean(data.lineItems[0].assignedDomain),
          assignedDomainType: typeof data.lineItems[0].assignedDomain,
          assignedDomainValue: data.lineItems[0].assignedDomain,
          hasEstimatedPrice: Boolean(data.lineItems[0].estimatedPrice),
          estimatedPrice: data.lineItems[0].estimatedPrice,
          hasWholesalePrice: Boolean(data.lineItems[0].wholesalePrice),
          wholesalePrice: data.lineItems[0].wholesalePrice,
          status: data.lineItems[0].status,
          targetPageUrl: data.lineItems[0].targetPageUrl,
          anchorText: data.lineItems[0].anchorText,
          clientId: data.lineItems[0].clientId,
          keys: Object.keys(data.lineItems[0]).slice(0, 20)
        } : null
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('API Response:', JSON.stringify(apiResponse, null, 2));
  
  await browser.close();
})();