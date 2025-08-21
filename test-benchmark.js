const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
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
  
  // Check the benchmark API
  console.log('Fetching benchmark data...');
  const benchmarkData = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/orders/f450ae02-d830-4152-a661-228d6ccbb6b1/benchmark?comparison=true', {
        credentials: 'include'
      });
      const data = await response.json();
      return {
        success: true,
        totalSites: data.totalSites,
        confirmedSites: data.confirmedSites,
        submittedSites: data.submittedSites,
        liveSites: data.liveSites,
        orderDetails: data.orderDetails,
        hasLineItems: data.hasLineItems,
        lineItemsCount: data.lineItems?.length,
        firstLineItem: data.lineItems?.[0],
        sites: data.sites?.slice(0, 3).map(site => ({
          domain: site.domain,
          status: site.status,
          submissionStatus: site.submissionStatus,
          hasLineItemId: !!site.lineItemId
        }))
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('Benchmark API Response:', JSON.stringify(benchmarkData, null, 2));
  
  // Navigate to the order page and check what's displayed
  console.log('\nNavigating to order page...');
  await page.goto('http://localhost:3000/orders/f450ae02-d830-4152-a661-228d6ccbb6b1/internal', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Wait for React to render
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Find the benchmark display on the page
  const benchmarkDisplay = await page.evaluate(() => {
    // Look for benchmark section
    const benchmarkSection = Array.from(document.querySelectorAll('div')).find(div => 
      div.textContent && div.textContent.includes('Benchmark') && 
      (div.textContent.includes('Confirmed') || div.textContent.includes('Submitted'))
    );
    
    if (!benchmarkSection) {
      return { found: false };
    }
    
    // Extract numbers from the benchmark display
    const text = benchmarkSection.textContent;
    const numbers = text.match(/\d+/g);
    
    return {
      found: true,
      textContent: text.substring(0, 500),
      numbers: numbers
    };
  });
  
  console.log('\nBenchmark Display on Page:', JSON.stringify(benchmarkDisplay, null, 2));
  
  await browser.close();
})();