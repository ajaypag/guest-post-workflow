// Check the actual status of line items

async function checkLineItemStatus() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  try {
    // Login
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
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const data = await response.json();
    
    console.log('🔍 LINE ITEM STATUS CHECK');
    console.log('=' . repeat(50));
    
    data.lineItems?.forEach((item, i) => {
      console.log(`\nItem ${i + 1}:`);
      console.log(`  ID: ${item.id.substring(0, 8)}...`);
      console.log(`  status: "${item.status}"`);
      console.log(`  metadata.inclusionStatus: "${item.metadata?.inclusionStatus || 'null'}"`);
      console.log(`  assignedDomainId: ${item.assignedDomainId ? '✓ Has domain' : '✗ No domain'}`);
    });
    
    console.log('\n❌ THE PROBLEM:');
    console.log('Invoice API expects status to be: "approved", "assigned", or "confirmed"');
    console.log('But our items have status: "' + (data.lineItems?.[0]?.status || 'unknown') + '"');
    
    console.log('\n💡 SOLUTION:');
    console.log('We need to update line items to have status "approved" when included');
    console.log('Currently using metadata.inclusionStatus instead of the main status field');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLineItemStatus();