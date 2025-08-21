/**
 * Test Order Creation Flow with Authentication
 */

const BASE_URL = 'http://localhost:3002';

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

async function testWithAuth() {
  console.log('🧪 Testing Order Creation Flow with Authentication...\n');
  
  let sessionCookies = '';
  
  try {
    // Step 1: Register/Login as an account user
    console.log('🔐 Step 1: Creating account user...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    try {
      const registerResponse = await makeRequest(`${BASE_URL}/api/register`, {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
          company: 'Test Company',
          userType: 'account'
        })
      });
      
      sessionCookies = registerResponse.cookies;
      console.log(`   Account created: ${testEmail}`);
      
    } catch (registerError) {
      console.log(`   Registration failed, trying login: ${registerError.message}`);
      
      // Try to login with existing account
      const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      
      sessionCookies = loginResponse.cookies;
    }
    
    console.log('   Session established\n');
    
    // Step 2: Create a new order
    console.log('📝 Step 2: Creating new order...');
    const orderResponse = await makeRequest(`${BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        accountEmail: testEmail,
        accountName: 'Test User',
        accountCompany: 'Test Company',
        totalPrice: 99800,
        subtotal: 99800,
        estimatedLinksCount: 2,
        orderGroups: []  // Start with empty - will add via edit page
      })
    }, sessionCookies);
    
    const orderId = orderResponse.data.order?.id;
    console.log(`   Order created: ${orderId}\n`);
    
    // Step 3: Simulate adding line items via the edit page
    console.log('📝 Step 3: Adding line items via edit page simulation...');
    
    // This simulates what happens when user adds target URLs in the edit page
    const editResponse = await makeRequest(`${BASE_URL}/api/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({
        // Line items data
        totalPrice: 158000, // $1580 for 2 links
        subtotal: 158000,
        totalWholesale: 118000,
        profitMargin: 40000,
        // In the new system, we should also send line items data
        // But the edit page might not be doing this correctly
      })
    }, sessionCookies);
    
    console.log('   Order updated');
    
    // Step 4: Check what was actually created
    console.log('\n🔍 Step 4: Checking order state...');
    const orderDetails = await makeRequest(`${BASE_URL}/api/orders/${orderId}`, {}, sessionCookies);
    
    console.log('   Order details:');
    console.log(`     Status: ${orderDetails.data.status}`);
    console.log(`     Order groups: ${orderDetails.data.orderGroups?.length || 0}`);
    console.log(`     Line items: ${orderDetails.data.lineItems?.length || 0}`);
    
    // Step 5: Check line items specifically
    try {
      const lineItemsResponse = await makeRequest(`${BASE_URL}/api/orders/${orderId}/line-items`, {}, sessionCookies);
      console.log(`   Direct line items check: ${lineItemsResponse.data.lineItems?.length || 0} items`);
      
      if (lineItemsResponse.data.lineItems?.length > 0) {
        console.log('   Line items found:', lineItemsResponse.data.lineItems.map(li => ({
          id: li.id.slice(0, 8),
          clientId: li.clientId?.slice(0, 8),
          targetPageUrl: li.targetPageUrl
        })));
      }
    } catch (error) {
      console.log(`   ❌ Line items check failed: ${error.message}`);
    }
    
    // Step 6: Submit the order
    console.log('\n📤 Step 6: Submitting order...');
    const submitResponse = await makeRequest(`${BASE_URL}/api/orders/${orderId}/submit`, {
      method: 'POST',
      body: JSON.stringify({})
    }, sessionCookies);
    
    console.log(`   Order submitted, status: ${submitResponse.data.order?.status}`);
    
    // Step 7: Try to confirm (this should fail with "No line items found")
    console.log('\n⚠️  Step 7: Attempting confirmation...');
    try {
      const confirmResponse = await makeRequest(`${BASE_URL}/api/orders/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          assignedTo: 'test-user-123'
        })
      }, sessionCookies);
      
      console.log('   ✅ Order confirmed successfully!');
      
    } catch (confirmError) {
      console.log(`   ❌ Confirmation failed: ${confirmError.message}`);
      
      // This confirms the bug - the order was created but has no line items
      console.log('\n🐛 BUG CONFIRMED:');
      console.log('   - Order was created successfully');
      console.log('   - Order was submitted successfully');
      console.log('   - But confirmation fails because no line items exist');
      console.log('   - The edit page is not properly creating line items from target URLs');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

testWithAuth().catch(console.error);