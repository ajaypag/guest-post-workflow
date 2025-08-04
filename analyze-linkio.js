const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function analyzeLinkioPage() {
  let browser;
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to false to see what's happening
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Navigating to Linkio health blogs page...');
    
    try {
      await page.goto('https://www.linkio.com/guest-posting-sites/health-blogs/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    } catch (navError) {
      console.log('First navigation attempt failed, trying with different settings...');
      await page.goto('https://www.linkio.com/guest-posting-sites/health-blogs/', {
        waitUntil: 'load',
        timeout: 60000
      });
    }

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Taking initial screenshot...');
    await page.screenshot({
      path: 'linkio-initial.png',
      fullPage: false
    });

    // Based on WebFetch analysis, look for filter/search functionality
    console.log('Analyzing the page structure and search/filter functionality...');
    
    // Take initial full page screenshot
    console.log('Taking full page screenshot...');
    await page.screenshot({
      path: 'linkio-full-page.png',
      fullPage: true
    });
    
    // Analyze the search and filter elements
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {
        title: document.title,
        url: window.location.href,
        searchElements: [],
        filterElements: [],
        tableInfo: null,
        uiComponents: []
      };
      
      // Look for search/filter related elements
      const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
      searchInputs.forEach((input, index) => {
        const rect = input.getBoundingClientRect();
        const styles = window.getComputedStyle(input);
        analysis.searchElements.push({
          index,
          tagName: input.tagName,
          type: input.type,
          placeholder: input.placeholder,
          value: input.value,
          className: input.className,
          id: input.id,
          boundingRect: rect,
          styles: {
            display: styles.display,
            width: styles.width,
            height: styles.height,
            border: styles.border,
            borderRadius: styles.borderRadius,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          }
        });
      });
      
      // Look for select/dropdown elements (filters)
      const selects = document.querySelectorAll('select');
      selects.forEach((select, index) => {
        const rect = select.getBoundingClientRect();
        const styles = window.getComputedStyle(select);
        const options = Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        }));
        
        analysis.filterElements.push({
          index,
          tagName: select.tagName,
          className: select.className,
          id: select.id,
          options: options,
          boundingRect: rect,
          styles: {
            display: styles.display,
            width: styles.width,
            height: styles.height,
            border: styles.border,
            borderRadius: styles.borderRadius,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          }
        });
      });
      
      // Analyze table structure
      const table = document.querySelector('table');
      if (table) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const rowCount = table.querySelectorAll('tbody tr').length;
        const rect = table.getBoundingClientRect();
        
        analysis.tableInfo = {
          headers,
          rowCount,
          boundingRect: rect,
          className: table.className,
          id: table.id
        };
      }
      
      // Look for button-like elements that might be part of the UI
      const buttons = document.querySelectorAll('button, .btn, [role="button"]');
      buttons.forEach((btn, index) => {
        const rect = btn.getBoundingClientRect();
        const styles = window.getComputedStyle(btn);
        analysis.uiComponents.push({
          type: 'button',
          index,
          tagName: btn.tagName,
          textContent: btn.textContent.trim().substring(0, 50),
          className: btn.className,
          id: btn.id,
          boundingRect: rect,
          styles: {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            border: styles.border,
            borderRadius: styles.borderRadius,
            padding: styles.padding,
            fontSize: styles.fontSize
          }
        });
      });
      
      // Look for any elements with "search" or "filter" in their text or attributes
      const searchRelated = document.querySelectorAll('*');
      const relevantElements = [];
      
      for (let element of searchRelated) {
        const text = (element.textContent || '').toLowerCase();
        const className = (element.className || '').toString().toLowerCase();
        const id = (element.id || '').toLowerCase();
        
        if ((text.includes('search') || text.includes('filter') || 
             className.includes('search') || className.includes('filter') ||
             id.includes('search') || id.includes('filter')) && 
            element.getBoundingClientRect().width > 0) {
          
          const rect = element.getBoundingClientRect();
          relevantElements.push({
            tagName: element.tagName,
            textContent: text.substring(0, 100),
            className: element.className,
            id: element.id,
            boundingRect: rect
          });
        }
      }
      
      analysis.searchRelatedElements = relevantElements.slice(0, 10); // Limit to avoid too much data
      
      return analysis;
    });
    
    console.log('Page Analysis Results:');
    console.log(JSON.stringify(pageAnalysis, null, 2));
    
    // Take a screenshot of the top section (likely contains filters)
    console.log('Taking screenshot of top section...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({
      path: 'linkio-top-section.png',
      clip: { x: 0, y: 0, width: 1920, height: 800 }
    });
    
    // Scroll to middle and take another screenshot
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Taking screenshot of middle section...');
    await page.screenshot({
      path: 'linkio-middle-section.png',
      fullPage: false
    });
    
    // Try to interact with filters if they exist
    if (pageAnalysis.filterElements.length > 0) {
      console.log('Found filter elements, trying to interact with them...');
      
      try {
        // Click on first dropdown to see options
        await page.click('select');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.screenshot({
          path: 'linkio-filter-dropdown.png',
          fullPage: false
        });
      } catch (e) {
        console.log('Could not interact with dropdown:', e.message);
      }
    }

  } catch (error) {
    console.error('Error during analysis:', error);
    
    if (browser) {
      try {
        const page = browser.pages()[0];
        if (page) {
          await page.screenshot({
            path: 'linkio-error.png',
            fullPage: false
          });
        }
      } catch (screenshotError) {
        console.error('Could not take error screenshot:', screenshotError);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the analysis
analyzeLinkioPage().then(() => {
  console.log('Analysis complete. Check the generated PNG files for screenshots.');
}).catch(console.error);