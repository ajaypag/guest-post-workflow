const puppeteer = require('puppeteer');

async function deleteTestWorkflows() {
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

    await page.type('input[type="email"]', 'ajay@outreachlabs.com');
    await page.type('input[type="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Login successful!');

    // Get the auth token from cookies
    const cookies = await page.cookies();
    const authToken = cookies.find(c => c.name === 'auth-token')?.value;
    
    if (!authToken) {
      throw new Error('No auth token found');
    }

    // First, get all workflows to find the ones we need to delete
    const response = await page.evaluate(async (token) => {
      const res = await fetch('http://localhost:4001/api/workflows', {
        headers: {
          'Cookie': `auth-token=${token}`
        }
      });
      const data = await res.json();
      return data;
    }, authToken);

    // Handle both array response and object with workflows property
    const workflows = Array.isArray(response) ? response : (response.workflows || []);
    console.log(`Found ${workflows.length} total workflows`);

    // Filter for workflows that were likely created from the order (PPC Masterminds)
    // These would have been created recently and have the domain modernmarketingpartners.com
    const testWorkflows = workflows.filter(w => 
      w.clientName === 'PPC Masterminds' && 
      w.targetDomain === 'modernmarketingpartners.com'
    );

    console.log(`Found ${testWorkflows.length} test workflows to delete:`);
    testWorkflows.forEach(w => {
      console.log(`  - ${w.id} (created: ${new Date(w.createdAt).toLocaleString()})`);
    });

    if (testWorkflows.length === 0) {
      console.log('No test workflows found to delete');
      return;
    }

    // Ask for confirmation
    console.log('\nDeleting these workflows...');

    // Delete each workflow
    for (const workflow of testWorkflows) {
      try {
        const deleteResponse = await page.evaluate(async (workflowId, token) => {
          const res = await fetch(`http://localhost:4001/api/workflows/${workflowId}`, {
            method: 'DELETE',
            headers: {
              'Cookie': `auth-token=${token}`
            }
          });
          return {
            ok: res.ok,
            status: res.status
          };
        }, workflow.id, authToken);

        if (deleteResponse.ok) {
          console.log(`✓ Deleted workflow ${workflow.id}`);
        } else {
          console.log(`✗ Failed to delete workflow ${workflow.id} (status: ${deleteResponse.status})`);
        }
      } catch (error) {
        console.log(`✗ Error deleting workflow ${workflow.id}:`, error.message);
      }
    }

    console.log('\nDone!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

deleteTestWorkflows();