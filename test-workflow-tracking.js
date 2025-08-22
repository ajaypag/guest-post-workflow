const puppeteer = require('puppeteer');

async function testWorkflowTracking() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Login first
    console.log('Logging in...');
    await page.goto('http://localhost:4001/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Debug: Check what's on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'login-page-debug.png' });
    
    // Try to find input fields
    const inputs = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input');
      return Array.from(allInputs).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder
      }));
    });
    console.log('Found inputs:', inputs);
    
    if (inputs.length === 0) {
      console.log('No inputs found on page. Page might not have loaded correctly.');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Page text:', bodyText.substring(0, 200));
      throw new Error('Login page did not load correctly');
    }
    
    // Use the actual selectors found
    const emailInput = inputs.find(i => i.type === 'email' || i.name === 'email' || i.placeholder?.toLowerCase().includes('email'));
    const passwordInput = inputs.find(i => i.type === 'password');
    
    if (emailInput && emailInput.id) {
      await page.type(`#${emailInput.id}`, 'ajay@outreachlabs.com');
    } else if (emailInput && emailInput.name) {
      await page.type(`input[name="${emailInput.name}"]`, 'ajay@outreachlabs.com');
    } else {
      await page.type('input[type="email"]', 'ajay@outreachlabs.com');
    }
    
    await page.type('input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Login successful!');

    // Navigate to the order page
    const orderId = 'ac5740f6-d035-4557-9199-91833046b40d';
    console.log(`\nNavigating to order ${orderId}...`);
    await page.goto(`http://localhost:4001/orders/${orderId}/internal`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Check current state before generation
    console.log('\n=== BEFORE WORKFLOW GENERATION ===');
    const beforeState = await page.evaluate(() => {
      // Look for timeline elements
      const timelineText = document.querySelector('[class*="Timeline"]')?.parentElement?.innerText || '';
      
      // Look for workflow progress in Internal Activity
      const activitySection = Array.from(document.querySelectorAll('h3')).find(el => 
        el.textContent?.includes('Internal Activity')
      )?.parentElement;
      
      const workflowProgress = activitySection?.querySelector('[class*="Workflow Progress"]')?.textContent || 'No workflow progress shown';
      
      return {
        timeline: timelineText,
        workflowProgress: workflowProgress,
        hasWorkflowTracking: timelineText.includes('Fulfillment') || workflowProgress.includes('Workflow Progress')
      };
    });

    console.log('Timeline content:', beforeState.timeline ? 'Found' : 'Not found');
    console.log('Workflow tracking:', beforeState.hasWorkflowTracking ? 'Present' : 'Not present');
    console.log('Workflow progress:', beforeState.workflowProgress);

    // Click the Generate Workflows button
    console.log('\n=== GENERATING WORKFLOWS ===');
    const generateButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(btn => btn.textContent?.includes('Generate Workflows'));
      return button ? true : false;
    });
    
    if (!generateButton) {
      console.log('Generate Workflows button not found or already generated');
      
      // Check if workflows already exist
      const workflowsExist = await page.evaluate(() => {
        return document.body.innerText.includes('Workflow Progress') || 
               document.body.innerText.includes('Fulfillment Started');
      });
      
      if (workflowsExist) {
        console.log('Workflows appear to already be generated for this order');
        console.log('\n=== CHECKING EXISTING WORKFLOW TRACKING ===');
      } else {
        return;
      }
    } else {
      // Click the button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn => btn.textContent?.includes('Generate Workflows'));
        if (button) button.click();
      });
      console.log('Clicked Generate Workflows button...');
      
      // Wait for the generation to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Refresh the page to see updated data
      console.log('Refreshing page to see updates...');
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Check state after generation
    console.log('\n=== AFTER WORKFLOW GENERATION ===');
    const afterState = await page.evaluate(() => {
      // Look for Fulfillment Started in timeline
      const fulfillmentStarted = Array.from(document.querySelectorAll('p')).find(el => 
        el.textContent === 'Fulfillment Started'
      );
      
      // Look for workflow progress
      const workflowProgressElement = Array.from(document.querySelectorAll('p')).find(el => 
        el.textContent?.includes('Workflow Progress:')
      );
      
      const progressBar = document.querySelector('[style*="width"]')?.getAttribute('style');
      
      return {
        hasFulfillmentStarted: !!fulfillmentStarted,
        fulfillmentDate: fulfillmentStarted?.nextElementSibling?.textContent || null,
        workflowProgressText: workflowProgressElement?.textContent || null,
        progressBarWidth: progressBar || null,
        allText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('Fulfillment Started shown:', afterState.hasFulfillmentStarted ? 'Yes' : 'No');
    if (afterState.fulfillmentDate) {
      console.log('Fulfillment date:', afterState.fulfillmentDate);
    }
    if (afterState.workflowProgressText) {
      console.log('Workflow progress:', afterState.workflowProgressText);
    }
    if (afterState.progressBarWidth) {
      console.log('Progress bar:', afterState.progressBarWidth);
    }

    // Check database for tracking fields
    console.log('\n=== DATABASE CHECK ===');
    const cookies = await page.cookies();
    const authToken = cookies.find(c => c.name === 'auth-token')?.value;
    
    if (authToken) {
      const orderData = await page.evaluate(async (token, orderId) => {
        const res = await fetch(`http://localhost:4001/api/orders/${orderId}`, {
          headers: {
            'Cookie': `auth-token=${token}`
          }
        });
        const data = await res.json();
        return {
          totalWorkflows: data.totalWorkflows,
          completedWorkflows: data.completedWorkflows,
          workflowCompletionPercentage: data.workflowCompletionPercentage,
          fulfillmentStartedAt: data.fulfillmentStartedAt,
          fulfillmentCompletedAt: data.fulfillmentCompletedAt
        };
      }, authToken, orderId);

      console.log('Order tracking data:');
      console.log('  Total workflows:', orderData.totalWorkflows || 0);
      console.log('  Completed workflows:', orderData.completedWorkflows || 0);
      console.log('  Completion percentage:', orderData.workflowCompletionPercentage || 0);
      console.log('  Fulfillment started:', orderData.fulfillmentStartedAt || 'Not set');
      console.log('  Fulfillment completed:', orderData.fulfillmentCompletedAt || 'Not set');
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testWorkflowTracking();