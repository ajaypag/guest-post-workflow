// Test why counts aren't updating

async function testCountIssue() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'orders@outreachlabs.com',
        password: 'TempPassword123!'
      })
    });
    
    const authCookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
    
    // Get line items
    console.log('📋 Fetching line items...\n');
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const data = await response.json();
    
    console.log('Line Items Data Structure:');
    console.log('=' . repeat(50));
    
    data.lineItems?.slice(0, 3).forEach((item, i) => {
      console.log(`\nItem ${i + 1}:`);
      console.log(`  ID: ${item.id.substring(0, 8)}...`);
      console.log(`  inclusionStatus (top level): ${item.inclusionStatus || 'undefined'}`);
      console.log(`  metadata.inclusionStatus: ${item.metadata?.inclusionStatus || 'undefined'}`);
      console.log(`  metadata object:`, JSON.stringify(item.metadata, null, 2));
    });
    
    // Count using different methods
    console.log('\n\nCount Analysis:');
    console.log('=' . repeat(50));
    
    // Method 1: Using item.inclusionStatus (wrong field)
    const includedCount1 = data.lineItems.filter(item => 
      item.inclusionStatus === 'included'
    ).length;
    const excludedCount1 = data.lineItems.filter(item => 
      item.inclusionStatus === 'excluded'
    ).length;
    const savedCount1 = data.lineItems.filter(item => 
      item.inclusionStatus === 'saved_for_later'
    ).length;
    
    console.log('\nMethod 1 - Using item.inclusionStatus:');
    console.log(`  Included: ${includedCount1}`);
    console.log(`  Excluded: ${excludedCount1}`);
    console.log(`  Saved: ${savedCount1}`);
    
    // Method 2: Using item.metadata.inclusionStatus (correct field)
    const includedCount2 = data.lineItems.filter(item => 
      item.metadata?.inclusionStatus === 'included'
    ).length;
    const excludedCount2 = data.lineItems.filter(item => 
      item.metadata?.inclusionStatus === 'excluded'
    ).length;
    const savedCount2 = data.lineItems.filter(item => 
      item.metadata?.inclusionStatus === 'saved_for_later'
    ).length;
    
    console.log('\nMethod 2 - Using item.metadata.inclusionStatus:');
    console.log(`  Included: ${includedCount2}`);
    console.log(`  Excluded: ${excludedCount2}`);
    console.log(`  Saved: ${savedCount2}`);
    
    console.log('\n🔍 DIAGNOSIS:');
    if (includedCount1 === 0 && excludedCount1 === 0 && savedCount1 === 0) {
      console.log('❌ The review page is using item.inclusionStatus (which doesn\'t exist)');
      console.log('✅ It should use item.metadata.inclusionStatus instead');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCountIssue();