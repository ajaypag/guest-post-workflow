const puppeteer = require('puppeteer');

async function compareWorkflows() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // First, login to the application
    console.log('Logging in...');
    await page.goto('http://localhost:4001/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Fill in login credentials
    await page.type('input[type="email"]', 'ajay@outreachlabs.com');
    await page.type('input[type="password"]', 'FA64!I$nrbCauS^d');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Login successful!');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Visit the first workflow (generated from order)
    console.log('\nVisiting first workflow (generated from order)...');
    await page.goto('http://localhost:4001/workflow/be527202-ce49-430a-8b88-a7fddc59e6d2?step=0', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of the first workflow
    await page.screenshot({ 
      path: 'workflow-from-order.png',
      fullPage: false 
    });
    
    // Get the step content - look for the actual workflow step form
    const orderWorkflowContent = await page.evaluate(() => {
      const stepForm = document.querySelector('[class*="StepForm"]') || document.querySelector('.space-y-6');
      const stepTitle = document.querySelector('h3')?.textContent || document.querySelector('h2')?.textContent;
      const inputs = document.querySelectorAll('input[type="text"], input[type="url"], textarea');
      const savedFields = document.querySelectorAll('[class*="SavedField"]');
      const errorMessage = document.querySelector('[class*="Step configuration not found"]')?.textContent || 
                          document.querySelector('.text-red-500')?.textContent;
      
      // Get values from inputs
      const inputValues = [];
      inputs.forEach(input => {
        if (input.value) {
          inputValues.push(input.value);
        }
      });
      
      return {
        title: stepTitle || 'Not found',
        hasStepForm: !!stepForm,
        inputCount: inputs.length,
        savedFieldCount: savedFields.length,
        inputValues: inputValues,
        errorMessage: errorMessage || null,
        pageContent: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Order workflow step content:', JSON.stringify(orderWorkflowContent, null, 2));

    // Visit the second workflow (normal workflow)
    console.log('\nVisiting second workflow (normal workflow)...');
    await page.goto('http://localhost:4001/workflow/b64d8e48-96d4-4c5e-94b4-ccd8d5d3bd33?step=0', {
      waitUntil: 'networkidle2', 
      timeout: 30000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of the second workflow
    await page.screenshot({ 
      path: 'workflow-normal.png',
      fullPage: false 
    });
    
    // Get the step content
    const normalWorkflowContent = await page.evaluate(() => {
      const stepForm = document.querySelector('[class*="StepForm"]') || document.querySelector('.space-y-6');
      const stepTitle = document.querySelector('h3')?.textContent || document.querySelector('h2')?.textContent;
      const inputs = document.querySelectorAll('input[type="text"], input[type="url"], textarea');
      const savedFields = document.querySelectorAll('[class*="SavedField"]');
      const errorMessage = document.querySelector('[class*="Step configuration not found"]')?.textContent || 
                          document.querySelector('.text-red-500')?.textContent;
      
      // Get values from inputs
      const inputValues = [];
      inputs.forEach(input => {
        if (input.value) {
          inputValues.push(input.value);
        }
      });
      
      return {
        title: stepTitle || 'Not found',
        hasStepForm: !!stepForm,
        inputCount: inputs.length,
        savedFieldCount: savedFields.length,
        inputValues: inputValues,
        errorMessage: errorMessage || null,
        pageContent: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Normal workflow step content:', JSON.stringify(normalWorkflowContent, null, 2));
    
    // Compare the two
    console.log('\n=== COMPARISON ===');
    console.log('Order workflow has step form:', orderWorkflowContent.hasStepForm);
    console.log('Normal workflow has step form:', normalWorkflowContent.hasStepForm);
    console.log('Order workflow inputs:', orderWorkflowContent.inputCount);
    console.log('Normal workflow inputs:', normalWorkflowContent.inputCount);
    console.log('Order workflow saved fields:', orderWorkflowContent.savedFieldCount);
    console.log('Normal workflow saved fields:', normalWorkflowContent.savedFieldCount);
    
    if (orderWorkflowContent.errorMessage) {
      console.log('\n❌ ERROR in order workflow:', orderWorkflowContent.errorMessage);
    }
    if (normalWorkflowContent.errorMessage) {
      console.log('\n❌ ERROR in normal workflow:', normalWorkflowContent.errorMessage);
    }
    
    console.log('\n📸 Screenshots saved as workflow-from-order.png and workflow-normal.png');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

compareWorkflows();