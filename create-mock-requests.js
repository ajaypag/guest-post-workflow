const { chromium } = require('playwright');

async function createMockRequests() {
  console.log('Creating mock vetted sites requests for testing...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login first
    console.log('1. Logging in...');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3003/');
    console.log('✅ Logged in successfully');
    
    // Get session cookie for API calls
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'auth-session');
    
    if (!sessionCookie) {
      throw new Error('No session cookie found');
    }
    
    // Mock requests data
    const mockRequests = [
      {
        targetUrls: ['https://techcrunch.com/category/startups', 'https://techcrunch.com/category/apps'],
        notes: 'Looking for tech and startup focused sites for our SaaS product launch',
        status: 'submitted'
      },
      {
        targetUrls: ['https://www.healthline.com/health/fitness', 'https://www.webmd.com/fitness-exercise'],
        notes: 'Need health and fitness related sites for our wellness app',
        status: 'reviewing'
      },
      {
        targetUrls: ['https://www.foodnetwork.com/recipes', 'https://www.allrecipes.com/recipes'],
        notes: 'Food and recipe sites for our cooking platform',
        status: 'approved'
      },
      {
        targetUrls: ['https://www.travelandleisure.com/travel-tips', 'https://www.lonelyplanet.com'],
        notes: 'Travel blogs and sites for our booking platform',
        status: 'submitted'
      },
      {
        targetUrls: ['https://www.entrepreneur.com/topic/marketing', 'https://blog.hubspot.com/marketing'],
        notes: 'Marketing and business sites for our B2B tool',
        status: 'reviewing'
      }
    ];
    
    console.log('2. Creating mock requests via API...');
    
    for (let i = 0; i < mockRequests.length; i++) {
      const mockRequest = mockRequests[i];
      console.log(`Creating request ${i + 1}: ${mockRequest.notes.substring(0, 50)}...`);
      
      try {
        // Create the request
        const response = await page.evaluate(async ({ requestData, cookie }) => {
          const response = await fetch('/api/vetted-sites/requests', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': `auth-session=${cookie}`
            },
            body: JSON.stringify({
              targetUrls: requestData.targetUrls,
              notes: requestData.notes,
              filters: {
                topics: [],
                keywords: []
              }
            })
          });
          
          return {
            ok: response.ok,
            status: response.status,
            text: await response.text()
          };
        }, { requestData: mockRequest, cookie: sessionCookie.value });
        
        if (response.ok) {
          const createdRequest = JSON.parse(response.text);
          console.log(`✅ Created request: ${createdRequest.request.id}`);
          
          // If the request should have a different status, update it
          if (mockRequest.status !== 'submitted') {
            const updateResponse = await page.evaluate(async ({ requestId, status, cookie }) => {
              const response = await fetch(`/api/vetted-sites/requests/${requestId}`, {
                method: 'PATCH',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cookie': `auth-session=${cookie}`
                },
                body: JSON.stringify({ status: status })
              });
              
              return {
                ok: response.ok,
                status: response.status
              };
            }, { requestId: createdRequest.request.id, status: mockRequest.status, cookie: sessionCookie.value });
            
            if (updateResponse.ok) {
              console.log(`✅ Updated status to: ${mockRequest.status}`);
            } else {
              console.log(`❌ Failed to update status: ${updateResponse.status}`);
            }
          }
        } else {
          console.log(`❌ Failed to create request: ${response.status}`);
          console.log(`Response: ${response.text}`);
        }
        
        // Wait between requests
        await page.waitForTimeout(1000);
        
      } catch (error) {
        console.log(`❌ Error creating request ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n=== Mock Requests Created ===');
    console.log('✅ Created 5 mock vetted sites requests');
    console.log('✅ Requests have different statuses for testing');
    console.log('✅ You can now test email notifications by changing statuses');
    
    // Go to the requests page to show the results
    console.log('\n3. Going to requests page to show results...');
    await page.goto('http://localhost:3003/internal/vetted-sites/requests');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Requests page loaded - you can now test the email notifications!');
    
  } catch (error) {
    console.error('Error creating mock requests:', error.message);
  } finally {
    console.log('\nKeeping browser open for you to test...');
    // Keep browser open for manual testing
    await page.waitForTimeout(5000);
    // Don't close browser so user can test
    // await browser.close();
  }
}

createMockRequests();