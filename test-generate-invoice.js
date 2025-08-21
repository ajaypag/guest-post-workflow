// Test the Generate Invoice button functionality

async function testGenerateInvoice() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  console.log('🧾 TESTING GENERATE INVOICE BUTTON');
  console.log('=' . repeat(60));
  
  try {
    // Login
    console.log('\n🔐 Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'orders@outreachlabs.com',
        password: 'TempPassword123!'
      })
    });
    
    const authCookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
    
    // Get current line items
    const itemsResponse = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const itemsData = await itemsResponse.json();
    const includedItems = itemsData.lineItems?.filter(item => 
      item.assignedDomain && (item.metadata?.inclusionStatus === 'included' || 
      (!item.metadata?.inclusionStatus && item.assignedDomain))
    ) || [];
    
    console.log(`\n📊 Current State:`);
    console.log(`Total items: ${itemsData.lineItems?.length || 0}`);
    console.log(`Included items: ${includedItems.length}`);
    
    if (includedItems.length === 0) {
      console.log('\n⚠️ No items included - button would not generate invoice');
      console.log('Make sure some items are marked as "Included" first');
      return;
    }
    
    console.log('\n🚀 Clicking "Generate Invoice for ' + includedItems.length + ' Sites"...');
    
    // Simulate the invoice generation API call
    const invoiceResponse = await fetch(`${baseUrl}/api/orders/${orderId}/invoice`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({ action: 'generate_invoice' })
    });
    
    console.log(`\n📝 Invoice API Response:`);
    console.log(`Status: ${invoiceResponse.status} ${invoiceResponse.statusText}`);
    
    if (invoiceResponse.ok) {
      const result = await invoiceResponse.json();
      console.log('✅ Success:', JSON.stringify(result, null, 2));
      console.log('\n🎯 Next step: Would redirect to /orders/' + orderId + '/invoice');
    } else {
      let errorData;
      try {
        errorData = await invoiceResponse.json();
      } catch {
        errorData = { error: 'Could not parse error response' };
      }
      console.log('❌ Error:', JSON.stringify(errorData, null, 2));
      console.log('\n⚠️ The button would show an alert with the error message');
    }
    
    console.log('\n📍 WHAT HAPPENS WHEN YOU CLICK THE BUTTON:');
    console.log('1. Counts items with metadata.inclusionStatus === "included"');
    console.log('2. Calls POST /api/orders/{id}/invoice');
    console.log('3. If successful → redirects to /orders/{id}/invoice');
    console.log('4. If error → shows alert with error message');
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  }
}

testGenerateInvoice();