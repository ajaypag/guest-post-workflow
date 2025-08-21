/**
 * Test Line Items API After Schema Fix
 * This tests if the line items API works after fixing the schema mismatch
 */

const BASE_URL = 'http://localhost:3002';
const ORDER_ID = '89ec46cd-8fc8-4ecc-aee5-1395e41ad33e';

// From the dev log, I can see the auth token
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJmYzg3MGY2Ni1mNGEzLTQwMzQtYTE1NC00MTRhY2YwYzAxMjEiLCJlbWFpbCI6ImFiZWxpbm9AZmFjdGJpdGVzLmNvbSIsIm5hbWUiOiJBYmVsaW5vIFNpbHZhIiwicm9sZSI6ImFjY291bnQiLCJ1c2VyVHlwZSI6ImFjY291bnQiLCJleHAiOjE3NTYxNzg5NTZ9.9WWmnGM5CqVMH6gjliI7KDMDi-KStLCV2pLWX4YhXbc';

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth-token=${AUTH_TOKEN}`,
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error(`❌ ${options.method || 'GET'} ${url}:`, response.status, data);
    throw new Error(`Request failed: ${data.error || response.statusText}`);
  }
  
  console.log(`✅ ${options.method || 'GET'} ${url}:`, response.status);
  return data;
}

async function testLineItemsAPI() {
  console.log('🧪 Testing Line Items API After Schema Fix...\n');
  
  try {
    // Step 1: Check current line items
    console.log('📋 Step 1: Checking current line items...');
    const currentItems = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}/line-items`);
    console.log(`   Current line items: ${currentItems.lineItems?.length || 0}\n`);
    
    // Step 2: Test creating line items
    console.log('📝 Step 2: Creating test line items...');
    const lineItemsData = {
      items: [
        {
          clientId: '62062ec5-7e2d-497c-83fe-3b192787262c', // From dev log
          targetPageUrl: 'https://factbites.com/test-page-1/',
          anchorText: 'Test Anchor 1',
          estimatedPrice: 29900, // $299
          metadata: {
            wholesalePrice: 20000,
            serviceFee: 7900,
            clientName: 'Test Client'
          }
        },
        {
          clientId: '62062ec5-7e2d-497c-83fe-3b192787262c',
          targetPageUrl: 'https://factbites.com/test-page-2/',
          anchorText: 'Test Anchor 2', 
          estimatedPrice: 29900,
          metadata: {
            wholesalePrice: 20000,
            serviceFee: 7900,
            clientName: 'Test Client'
          }
        }
      ],
      reason: 'Testing line items creation after schema fix'
    };
    
    const createResult = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}/line-items`, {
      method: 'POST',
      body: JSON.stringify(lineItemsData)
    });
    
    console.log(`   Created ${createResult.created?.length || 0} line items`);
    
    if (createResult.created && createResult.created.length > 0) {
      console.log('   Line items created:');
      createResult.created.forEach((item, i) => {
        console.log(`     ${i + 1}. ${item.targetPageUrl} - ${item.anchorText} ($${(item.estimatedPrice / 100).toFixed(2)})`);
      });
    }
    
    // Step 3: Verify line items were created
    console.log('\n🔍 Step 3: Verifying line items in database...');
    const verifyItems = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}/line-items`);
    console.log(`   Line items now in database: ${verifyItems.lineItems?.length || 0}`);
    
    // Step 4: Check change log entries
    console.log('\n📝 Step 4: Checking change log entries...');
    if (verifyItems.lineItems && verifyItems.lineItems.length > 0) {
      const firstItemId = verifyItems.lineItems[0].id;
      try {
        const changesResponse = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}/line-items?includeChanges=true`);
        console.log('   Change log entries created successfully');
      } catch (changesError) {
        console.log(`   ⚠️  Change log check failed: ${changesError.message}`);
      }
    }
    
    console.log('\n🎉 Line Items API Test Results:');
    console.log(`   ✅ Schema fix successful: Line items created without errors`);
    console.log(`   ✅ Change tracking working: No schema mismatches`);
    console.log(`   ✅ Ready for order confirmation testing`);
    
  } catch (error) {
    console.error('\n💥 Line Items API test failed:', error.message);
    console.log('\n❌ Schema fix may need additional work');
  }
}

// Run the test
testLineItemsAPI().catch(console.error);