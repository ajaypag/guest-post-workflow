const puppeteer = require('puppeteer');

async function testDirect() {
  console.log('Starting direct test of Topic Generation component...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('1. Navigating directly to workflow/new...');
    await page.goto('http://localhost:3000/workflow/new');
    
    console.log('2. Waiting for page load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('3. Current URL:', page.url());
    
    // Check if we can see the page content at all
    const hasTopicGeneration = await page.$eval('body', body => 
      body.innerText.includes('Topic Generation')
    ).catch(() => false);
    
    if (hasTopicGeneration) {
      console.log('✅ Found Topic Generation text');
      
      console.log('4. Looking for Step 2f section...');
      
      // Try to find and click on Topic Generation
      const topicLink = await page.$('text=Topic Generation');
      if (topicLink) {
        console.log('Found Topic Generation link, clicking...');
        await topicLink.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Look for Step 2f
      const step2f = await page.$('text*=Step 2f');
      if (step2f) {
        console.log('Found Step 2f, clicking to expand...');
        await step2f.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('5. Checking for Ahrefs functionality...');
        
        // Check for the new direct link
        const newLink = await page.$('a[href="https://app.ahrefs.com/keywords-explorer"]');
        if (newLink) {
          console.log('✅ SUCCESS: Found new direct Ahrefs link!');
          
          // Check for new instructions
          const instructions = await page.$eval('body', body => 
            body.innerText.includes('Copy your keyword list from Step 2e above')
          ).catch(() => false);
          
          if (instructions) {
            console.log('✅ SUCCESS: Found new instructions!');
            
            // Check that old dynamic URL is gone
            const oldLink = await page.$('a[href*="encodeURIComponent"]');
            if (!oldLink) {
              console.log('✅ SUCCESS: Old dynamic URL is gone!');
              console.log('🎉 ALL VERIFICATIONS PASSED!');
              
              // Take a screenshot as proof
              await page.screenshot({ path: 'topic-generation-verified.png' });
              console.log('📸 Screenshot saved as topic-generation-verified.png');
              
              return true;
            } else {
              console.log('❌ FAILED: Old dynamic URL still exists!');
              await page.screenshot({ path: 'topic-generation-failed.png' });
              return false;
            }
          } else {
            console.log('❌ FAILED: New instructions not found!');
            return false;
          }
        } else {
          console.log('❌ FAILED: New direct Ahrefs link not found!');
          return false;
        }
      } else {
        console.log('❌ Could not find Step 2f');
        return false;
      }
    } else {
      console.log('❌ Topic Generation not found on page');
      console.log('Page content preview:', await page.$eval('body', body => body.innerText.substring(0, 500)));
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  } finally {
    console.log('Keeping browser open for 20 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    await browser.close();
  }
}

testDirect().then(success => {
  console.log(success ? '✅ VERIFICATION COMPLETE - CHANGES CONFIRMED!' : '❌ VERIFICATION FAILED');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});