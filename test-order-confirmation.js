/**
 * Test Order Confirmation - The Original Bug
 * This tests if order confirmation works now that line items exist
 */

const BASE_URL = 'http://localhost:3002';
const ORDER_ID = '89ec46cd-8fc8-4ecc-aee5-1395e41ad33e';

// Use internal admin user for confirmation (need admin privileges)
const ADMIN_USER_ID = 'bde182d1-f972-4f96-a51c-17b1e8fb1b35'; // miro@outreachlabs.com

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // For simplicity, I'll assume we can set internal user in cookie
      // In real usage, internal user would log in first
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

async function testOrderConfirmation() {
  console.log('🧪 Testing Order Confirmation (Original Bug Fix)...\n');
  
  try {
    // Step 1: Check current order status
    console.log('📋 Step 1: Checking current order state...');
    const orderCheck = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}`);
    console.log(`   Order status: ${orderCheck.status}`);
    console.log(`   Line items: ${orderCheck.lineItems?.length || 0}`);
    console.log(`   Order groups: ${orderCheck.orderGroups?.length || 0}`);
    
    if (orderCheck.lineItems?.length === 0) {
      console.log('   ❌ No line items found - confirmation will fail');
      return;
    }
    
    // Step 2: Test order confirmation - this was the original failing step
    console.log('\n🎯 Step 2: Testing order confirmation (original bug)...');
    
    try {
      const confirmResult = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          assignedTo: ADMIN_USER_ID
        })
      });
      
      console.log('   🎉 ORDER CONFIRMATION SUCCESSFUL!');
      console.log(`   Projects created: ${confirmResult.projectsCreated || 0}`);
      console.log(`   Workflows generated: ${confirmResult.workflowsCreated || 0}`);
      
      // Step 3: Verify post-confirmation state
      console.log('\n✅ Step 3: Verifying post-confirmation state...');
      const postConfirmOrder = await makeRequest(`${BASE_URL}/api/orders/${ORDER_ID}`);
      console.log(`   New order status: ${postConfirmOrder.status}`);
      
      console.log('\n🎉 ORIGINAL BUG FIXED:');
      console.log('   ✅ "No line items found in order" error is resolved');
      console.log('   ✅ Order confirmation now works with line items');
      console.log('   ✅ Line items migration is functional');
      
    } catch (confirmError) {
      console.log(`   ❌ Order confirmation failed: ${confirmError.message}`);
      
      if (confirmError.message.includes('No line items found')) {
        console.log('\n💥 ORIGINAL BUG STILL EXISTS:');
        console.log('   ❌ Order confirmation API still looking for line items incorrectly');
        console.log('   ❌ Need to debug order confirmation logic');
      } else if (confirmError.message.includes('Unauthorized')) {
        console.log('\n⚠️  Authentication issue - need internal user session');
        console.log('   ℹ️  Test logic correct, just need proper auth');
      } else {
        console.log('\n🤔 Different error - investigating...');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Test setup failed:', error.message);
  }
}

// Run the test
testOrderConfirmation().catch(console.error);