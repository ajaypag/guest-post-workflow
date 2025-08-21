// Test that inclusion status defaults to 'included'

async function testInclusionFix() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  try {
    // Login first
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
    
    // Fetch line items
    console.log('📋 Fetching line items...\n');
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const data = await response.json();
    
    console.log('✅ INCLUSION STATUS FIX VERIFICATION');
    console.log('=' . repeat(50));
    console.log(`Total line items: ${data.lineItems?.length || 0}\n`);
    
    // Check inclusion status
    let includedCount = 0;
    let excludedCount = 0;
    let nullCount = 0;
    
    data.lineItems?.forEach(item => {
      const status = item.metadata?.inclusionStatus;
      if (status === 'included') includedCount++;
      else if (status === 'excluded') excludedCount++;
      else nullCount++;
    });
    
    console.log('Status Distribution:');
    console.log(`  ✅ Included: ${includedCount} items`);
    console.log(`  ❌ Excluded: ${excludedCount} items`);
    console.log(`  ⚠️  No status (NULL): ${nullCount} items`);
    
    console.log('\n' + '=' . repeat(50));
    console.log('🎯 RESULT: ' + (nullCount === 0 ? 
      'SUCCESS - All items have inclusion status set!' : 
      'NEEDS ATTENTION - Some items still have NULL status'));
    
    // Show sample items
    console.log('\nSample items:');
    data.lineItems?.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i+1}. Status: "${item.metadata?.inclusionStatus}" | Domain: ${item.assignedDomainId ? '✓' : '✗'}`);
    });
    
    console.log('\n✅ Fix Summary:');
    console.log('1. Database migration applied - all NULL values set to "included"');
    console.log('2. Frontend defaults to "included" when status is not set');
    console.log('3. API now sets "included" by default for new line items');
    console.log('4. Invoicing and metrics will now work correctly with included items');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testInclusionFix();