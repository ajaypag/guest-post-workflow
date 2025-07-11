const puppeteer = require('puppeteer');

async function verifyChanges() {
  console.log('Starting source code verification...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 500,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('2. Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('3. Checking page source for Topic Generation component...');
    const pageContent = await page.content();
    
    // Check if the new direct link is in the page source
    if (pageContent.includes('https://app.ahrefs.com/keywords-explorer"')) {
      console.log('✅ Found new direct Ahrefs link in page source!');
      
      // Check if the new instructions are there
      if (pageContent.includes('Copy your keyword list from Step 2e above')) {
        console.log('✅ Found new instructions in page source!');
        
        // Check that old dynamic URL code is gone
        if (!pageContent.includes('encodeURIComponent')) {
          console.log('✅ Old dynamic URL code is gone from page source!');
          console.log('🎉 SOURCE CODE VERIFICATION PASSED!');
          return true;
        } else {
          console.log('❌ Old dynamic URL code still exists in page source!');
          return false;
        }
      } else {
        console.log('❌ New instructions not found in page source!');
        return false;
      }
    } else {
      console.log('❌ New direct Ahrefs link not found in page source!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

verifyChanges().then(success => {
  console.log(success ? '✅ VERIFICATION PASSED' : '❌ VERIFICATION FAILED');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Verification crashed:', error);
  process.exit(1);
});