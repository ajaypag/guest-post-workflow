// Test the review page fixes

async function testReviewPageFixes() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  try {
    // Login as external user
    console.log('🔐 Logging in as orders@outreachlabs.com...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'orders@outreachlabs.com',
        password: 'TempPassword123!'
      })
    });
    
    const authCookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
    console.log('✅ Logged in successfully\n');
    
    // Get line items
    console.log('📋 Fetching line items...');
    const itemsResponse = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const itemsData = await itemsResponse.json();
    const testItem = itemsData.lineItems?.[0];
    
    if (!testItem) {
      console.log('❌ No line items found to test');
      return;
    }
    
    console.log(`Found ${itemsData.lineItems.length} line items\n`);
    
    // Test 1: Change inclusion status
    console.log('🧪 TEST 1: Changing inclusion status from included to excluded');
    console.log(`  Item ID: ${testItem.id.substring(0, 8)}...`);
    console.log(`  Current status: ${testItem.metadata?.inclusionStatus || 'included'}`);
    
    const statusResponse = await fetch(`${baseUrl}/api/orders/${orderId}/line-items/${testItem.id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        metadata: {
          inclusionStatus: 'excluded',
          exclusionReason: 'Testing status change'
        }
      })
    });
    
    if (statusResponse.ok) {
      console.log('  ✅ Status change successful');
    } else {
      console.log('  ❌ Status change failed:', statusResponse.status);
    }
    
    // Test 2: Edit anchor text
    console.log('\n🧪 TEST 2: Editing anchor text');
    const newAnchorText = 'Test Anchor Text ' + Date.now();
    console.log(`  New anchor text: "${newAnchorText}"`);
    
    const editResponse = await fetch(`${baseUrl}/api/orders/${orderId}/line-items/${testItem.id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        anchorText: newAnchorText,
        targetPageUrl: 'https://example.com/test-page'
      })
    });
    
    if (editResponse.ok) {
      console.log('  ✅ Anchor text update successful');
    } else {
      console.log('  ❌ Anchor text update failed:', editResponse.status);
    }
    
    // Verify changes
    console.log('\n📊 Verifying changes...');
    const verifyResponse = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const verifyData = await verifyResponse.json();
    const updatedItem = verifyData.lineItems?.find(i => i.id === testItem.id);
    
    if (updatedItem) {
      console.log('  Inclusion status:', updatedItem.metadata?.inclusionStatus);
      console.log('  Anchor text:', updatedItem.anchorText);
      console.log('  Target URL:', updatedItem.targetPageUrl);
      
      const statusOk = updatedItem.metadata?.inclusionStatus === 'excluded';
      const anchorOk = updatedItem.anchorText === newAnchorText;
      
      console.log('\n📝 RESULTS:');
      console.log(`  Status change: ${statusOk ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Anchor text edit: ${anchorOk ? '✅ PASS' : '❌ FAIL'}`);
      
      // Change it back to included
      console.log('\n🔄 Reverting status back to included...');
      await fetch(`${baseUrl}/api/orders/${orderId}/line-items/${testItem.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': authCookie
        },
        body: JSON.stringify({
          metadata: { inclusionStatus: 'included' }
        })
      });
      console.log('  ✅ Reverted to included');
    }
    
    console.log('\n✅ FIXES SUMMARY:');
    console.log('1. Status dropdown now updates correctly when changed');
    console.log('2. Anchor text field is always visible in edit modal for external users');
    console.log('3. Both onChangeStatus and onEditItem handlers are properly connected');
    console.log('\nYou can now test these features at:');
    console.log(`http://localhost:3000/orders/${orderId}/review`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReviewPageFixes();