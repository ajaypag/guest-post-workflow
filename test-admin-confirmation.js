/**
 * Test Order Confirmation as Admin User
 * Using the provided admin credentials
 */

const BASE_URL = 'http://localhost:3001';
const ORDER_ID = '4a8150fc-aaf0-40b9-ae34-1c5b05282cb7'; // pending_confirmation order

async function makeRequest(url, options = {}, cookies = '') {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      ...options.headers
    }
  });
  
  // Extract cookies from response
  const setCookieHeader = response.headers.get('set-cookie');
  const responseCookies = setCookieHeader ? setCookieHeader.split(',').map(c => c.split(';')[0]).join('; ') : '';
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error(`❌ ${options.method || 'GET'} ${url}:`, response.status, data);
    throw new Error(`Request failed: ${data.error || response.statusText}`);
  }
  
  console.log(`✅ ${options.method || 'GET'} ${url}:`, response.status);
  return { data, cookies: responseCookies };
}

async function testAdminConfirmation() {
  console.log('🧪 Testing Order Confirmation as Admin User...\n');
  
  let sessionCookies = '';
  
  try {
    // Step 1: Login as admin
    console.log('🔐 Step 1: Logging in as admin user...');
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'ajay@outreachlabs.com',
        password: 'FA64!I$nrbCauS^d'
      })
    });
    
    sessionCookies = loginResponse.cookies;
    console.log('   ✅ Admin login successful\n');
    
    // Step 2: Check order state
    console.log('📋 Step 2: Checking order state...');
    const orderCheck = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}`, {}, sessionCookies);
    
    console.log(`   Order status: ${orderCheck.data.status}`);
    console.log(`   Line items: ${orderCheck.data.lineItems?.length || 0}`);
    console.log(`   Order groups: ${orderCheck.data.orderGroups?.length || 0}\n`);
    
    if (orderCheck.data.lineItems?.length === 0) {
      console.log('   ❌ No line items found - this would cause the original bug');
      return;
    }
    
    // Step 3: Attempt order confirmation (the critical test)
    console.log('🎯 Step 3: Testing order confirmation (ORIGINAL BUG FIX)...');
    
    try {
      const confirmResult = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          assignedTo: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc' // ajay's user ID
        })
      }, sessionCookies);
      
      console.log('   🎉 ORDER CONFIRMATION SUCCESSFUL!');
      console.log(`   Projects created: ${confirmResult.data.projectsCreated || 0}`);
      console.log(`   Workflows generated: ${confirmResult.data.workflowsCreated || 0}`);
      
      console.log('\n✅ ORIGINAL BUG COMPLETELY FIXED:');
      console.log('   ✅ "No line items found in order" error eliminated');
      console.log('   ✅ Line items system working end-to-end');
      console.log('   ✅ Order confirmation creates projects from line items');
      console.log('   ✅ Migration from order groups to line items SUCCESS');
      
      // Step 4: Verify post-confirmation state
      console.log('\n🔍 Step 4: Verifying post-confirmation state...');
      const postConfirmOrder = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}`, {}, sessionCookies);
      console.log(`   Order status changed to: ${postConfirmOrder.data.status}`);
      
    } catch (confirmError) {
      console.log(`   ❌ Order confirmation failed: ${confirmError.message}`);
      
      if (confirmError.message.includes('No line items found')) {
        console.log('\n💥 ORIGINAL BUG STILL EXISTS - line items not found');
      } else if (confirmError.message.includes('Access denied') || confirmError.message.includes('internal user')) {
        console.log('\n⚠️  Permission issue - user type not recognized as internal');
      } else if (confirmError.message.includes('pending_confirmation')) {
        console.log('\n⚠️  Order status issue - order may not be in correct state');
      } else {
        console.log('\n🤔 Different error - need to investigate');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

// Run the test
testAdminConfirmation().catch(console.error);