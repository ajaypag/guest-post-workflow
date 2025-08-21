/**
 * Test Order Line Items Fix
 * 
 * This test verifies that when users create orders and add target URLs through 
 * the edit page, line items are properly created and the order can be confirmed.
 */

const BASE_URL = 'http://localhost:3002';

// Test data from database
const TEST_USER_ID = '43685745-aec5-4728-ae8b-503be428a483';
const TEST_CLIENT_ID = '3712906e-660f-4ca5-b94f-fef98b944259';

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

async function testOrderLineItemsFix() {
  console.log('🧪 Testing Order Line Items Fix...\n');
  
  try {
    // Step 1: Create a simple draft order
    console.log('📝 Step 1: Creating draft order...');
    const draftOrder = await makeRequest(`${BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'draft',
        orderType: 'guest_post'
      })
    });
    
    const orderId = draftOrder.orderId;
    console.log(`   Draft order created: ${orderId}\n`);
    
    // Step 2: Simulate what the edit page does - update order with target URLs
    console.log('📝 Step 2: Adding target URLs via edit page simulation...');
    const editOrder = await makeRequest(`${BASE_URL}/api/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({
        // Account info (required)
        accountEmail: 'test@example.com',
        accountName: 'Test User',
        accountCompany: 'Test Company',
        
        // Pricing info
        subtotal: 59800, // $598 for 2 links
        totalPrice: 59800,
        totalWholesale: 40000,
        profitMargin: 19800,
        
        // Order groups (what the edit page currently sends)
        orderGroups: [{
          clientId: TEST_CLIENT_ID,
          linkCount: 2,
          targetPages: [
            { url: 'https://example.com/page1' },
            { url: 'https://example.com/page2' }
          ],
          anchorTexts: ['test anchor 1', 'test anchor 2'],
          packagePrice: 29900 // $299 per link
        }]
      })
    });
    
    console.log('   Order updated with target URLs\n');
    
    // Step 3: Check if line items were created
    console.log('🔍 Step 3: Checking if line items were created...');
    const orderDetails = await makeRequest(`${BASE_URL}/api/orders/${orderId}`);
    
    console.log('   Order state:');
    console.log(`     Order groups: ${orderDetails.orderGroups?.length || 0}`);
    console.log(`     Line items: ${orderDetails.lineItems?.length || 0}`);
    
    if (orderDetails.lineItems && orderDetails.lineItems.length > 0) {
      console.log('   Line items found:');
      orderDetails.lineItems.forEach((item, i) => {
        console.log(`     ${i + 1}. Target: ${item.targetPageUrl || 'N/A'}`);
        console.log(`        Anchor: ${item.anchorText || 'N/A'}`);
        console.log(`        Price: $${(item.estimatedPrice / 100).toFixed(2)}`);
        console.log(`        Status: ${item.status}`);
      });
    }
    
    // Step 4: Try to submit the order
    console.log('\n📤 Step 4: Submitting order...');
    const submitResult = await makeRequest(`${BASE_URL}/api/orders/${orderId}/submit`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    console.log(`   Order status: ${submitResult.order?.status}`);
    
    // Step 5: Try to confirm the order (this was failing before the fix)
    console.log('\n✅ Step 5: Confirming order...');
    try {
      const confirmResult = await makeRequest(`${BASE_URL}/api/orders/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          assignedTo: TEST_USER_ID
        })
      });
      
      console.log('   🎉 Order confirmed successfully!');
      console.log(`   Projects created: ${confirmResult.projectsCreated}`);
      console.log('\n✅ TEST PASSED: Line items fix working correctly!');
      
    } catch (confirmError) {
      console.log(`   ❌ Confirmation failed: ${confirmError.message}`);
      console.log('\n❌ TEST FAILED: Order confirmation still broken');
      
      // Check what line items exist in the database
      console.log('\n🔍 Debug: Checking database state...');
      try {
        const lineItemsCheck = await makeRequest(`${BASE_URL}/api/orders/${orderId}/line-items`);
        console.log(`   Direct line items API shows: ${lineItemsCheck.lineItems?.length || 0} items`);
      } catch (dbError) {
        console.log(`   Database check failed: ${dbError.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

// Run the test
console.log('🚀 Starting Order Line Items Fix Test...\n');
testOrderLineItemsFix().catch(console.error);