/**
 * Test Order Creation Flow
 * 
 * This script tests the complete order creation flow:
 * 1. Create a new order
 * 2. Add 2 target URLs (like user described)
 * 3. Submit the order
 * 4. Try to confirm the order (should fail with "No line items found")
 * 5. Debug what's happening
 */

const BASE_URL = 'http://localhost:3002';

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

async function testOrderCreationFlow() {
  console.log('🧪 Testing Order Creation Flow...\n');
  
  try {
    // Step 1: Create a new order (simulate what happens when user goes to /orders/new)
    console.log('📝 Step 1: Creating a new order...');
    const newOrder = await makeRequest(`${BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        accountEmail: 'test@example.com',
        accountName: 'Test User',
        accountCompany: 'Test Company',
        totalPrice: 99800, // $998.00
        subtotal: 99800,
        totalWholesale: 79800,
        profitMargin: 20000,
        // Simulate line items for 2 target URLs
        orderGroups: [
          {
            clientId: 'test-client-123',
            clientName: 'Test Client',
            linkCount: 2,
            targetPages: [
              { url: 'https://example.com/page1', anchorText: 'test anchor 1' },
              { url: 'https://example.com/page2', anchorText: 'test anchor 2' }
            ]
          }
        ]
      })
    });
    
    const orderId = newOrder.order?.id;
    if (!orderId) {
      throw new Error('No order ID returned');
    }
    
    console.log(`   Order created: ${orderId}\n`);
    
    // Step 2: Check if line items were created
    console.log('🔍 Step 2: Checking line items...');
    try {
      const lineItemsResponse = await makeRequest(`${BASE_URL}/api/orders/${orderId}/line-items`);
      console.log(`   Line items found: ${lineItemsResponse.lineItems?.length || 0}`);
      if (lineItemsResponse.lineItems?.length > 0) {
        console.log('   Line items:', lineItemsResponse.lineItems.map(li => ({
          id: li.id.slice(0, 8),
          clientId: li.clientId.slice(0, 8),
          targetPageUrl: li.targetPageUrl,
          anchorText: li.anchorText
        })));
      }
    } catch (error) {
      console.log(`   ❌ Failed to get line items: ${error.message}`);
    }
    
    // Step 3: Submit the order
    console.log('\n📤 Step 3: Submitting order...');
    const submitResult = await makeRequest(`${BASE_URL}/api/orders/${orderId}/submit`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    console.log(`   Order status: ${submitResult.order?.status}`);
    
    // Step 4: Try to confirm the order (this should fail)
    console.log('\n⚠️  Step 4: Attempting to confirm order (should fail)...');
    try {
      const confirmResult = await makeRequest(`${BASE_URL}/api/orders/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          assignedTo: 'test-user-123'
        })
      });
      
      console.log('   ✅ Order confirmed successfully!');
      console.log(`   Projects created: ${confirmResult.projectsCreated}`);
      
    } catch (error) {
      console.log(`   ❌ Confirmation failed (as expected): ${error.message}`);
      
      // Step 5: Debug - check what's in the database
      console.log('\n🔍 Step 5: Debugging - checking database state...');
      
      // Check order details
      try {
        const orderDetails = await makeRequest(`${BASE_URL}/api/orders/${orderId}`);
        console.log('   Order details:');
        console.log(`     Status: ${orderDetails.status}`);
        console.log(`     Order groups: ${orderDetails.orderGroups?.length || 0}`);
        console.log(`     Line items: ${orderDetails.lineItems?.length || 0}`);
        
        if (orderDetails.orderGroups?.length > 0) {
          console.log('   Order groups found:', orderDetails.orderGroups.map(og => ({
            id: og.id.slice(0, 8),
            clientId: og.clientId?.slice(0, 8),
            linkCount: og.linkCount
          })));
        }
        
        if (orderDetails.lineItems?.length > 0) {
          console.log('   Line items found:', orderDetails.lineItems.map(li => ({
            id: li.id.slice(0, 8),
            clientId: li.clientId?.slice(0, 8),
            targetPageUrl: li.targetPageUrl
          })));
        }
        
      } catch (dbError) {
        console.log(`   ❌ Failed to get order details: ${dbError.message}`);
      }
    }
    
    console.log('\n🎯 Test Complete! Analysis:');
    console.log('   - If order confirmation failed with "No line items found", the issue is confirmed');
    console.log('   - Check the database state above to see what was actually created');
    console.log('   - The order creation process may be using order_groups instead of line_items');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

// Run the test
testOrderCreationFlow().catch(console.error);