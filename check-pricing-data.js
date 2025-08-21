// Check when pricing data gets populated

async function checkPricingData() {
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Login first
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
    
    console.log('🔍 PRICING DATA ANALYSIS');
    console.log('=' . repeat(50));
    
    console.log('\n📊 Line Items Pricing Status:');
    data.lineItems?.slice(0, 5).forEach((item, i) => {
      console.log(`\nItem ${i + 1}:`);
      console.log(`  Domain: ${item.assignedDomain || 'Not assigned'}`);
      console.log(`  assigned_domain_id: ${item.assignedDomainId || 'null'}`);
      console.log(`  wholesale_price: ${item.wholesalePrice || 'null'}`);
      console.log(`  estimated_price: ${item.estimatedPrice || 'null'}`);
      console.log(`  price: ${item.price || 'null'}`);
      console.log(`  assignedDomain.price: ${item.assignedDomain?.price || 'null'}`);
    });
    
    console.log('\n❓ WHEN DOES PRICING POPULATE?');
    console.log('=' . repeat(50));
    console.log('\n1. wholesale_price: Set when domain is assigned from bulk_analysis_domains');
    console.log('2. estimated_price: Initial estimate before domain assignment');
    console.log('3. price: Final agreed price (rarely used)');
    console.log('4. assignedDomain.price: Comes from the bulk_analysis_domains table');
    
    console.log('\n🎯 THE ISSUE:');
    console.log('The Order Summary is looking for:');
    console.log('  item.assignedDomain?.price || item.price');
    console.log('\nBut if domains aren\'t assigned yet, both are null!');
    
    console.log('\n💡 SOLUTION OPTIONS:');
    console.log('1. Use estimated_price as fallback');
    console.log('2. Hide Order Summary until domains are assigned');
    console.log('3. Show "Awaiting domain assignment" message');
    console.log('4. Pull pricing from bulk analysis if available');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPricingData();