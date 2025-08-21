// Test review page features

async function testReviewFeatures() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  console.log('🎯 TESTING REVIEW PAGE FEATURES');
  console.log('=' . repeat(60));
  
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
    
    // Get current data
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const data = await response.json();
    const items = data.lineItems || [];
    
    console.log('\n📋 Current State:');
    console.log(`Total items: ${items.length}`);
    
    // Count by status
    const included = items.filter(i => 
      i.metadata?.inclusionStatus === 'included' || 
      (!i.metadata?.inclusionStatus && i.assignedDomain)
    ).length;
    const excluded = items.filter(i => i.metadata?.inclusionStatus === 'excluded').length;
    const saved = items.filter(i => i.metadata?.inclusionStatus === 'saved_for_later').length;
    
    console.log(`Included: ${included}, Excluded: ${excluded}, Saved: ${saved}`);
    
    // Calculate pricing
    const totalPrice = items
      .filter(i => 
        i.metadata?.inclusionStatus === 'included' || 
        (!i.metadata?.inclusionStatus && i.assignedDomain)
      )
      .reduce((sum, item) => sum + (item.wholesalePrice || item.estimatedPrice || 0), 0);
    
    console.log(`Total price: $${(totalPrice / 100).toFixed(2)}`);
    
    console.log('\n✅ WHAT YOU SHOULD SEE ON THE PAGE:');
    console.log('=' . repeat(60));
    
    console.log('\n1️⃣ ORIGINAL REQUEST (Benchmark):');
    console.log(`   • Sites Found: ${included} / 3 requested`);
    console.log(`   • Price/Link: $${totalPrice > 0 ? Math.round(totalPrice / included / 100) : 0} / TBD`);
    console.log(`   • Total Value: $${(totalPrice / 100).toFixed(2)} / TBD`);
    console.log('   • Updates in real-time as you change status! ✨');
    
    console.log('\n2️⃣ STATUS COUNTS (3 boxes):');
    console.log(`   • 🟢 In This Order: ${included}`);
    console.log(`   • 🟣 Site Bank: ${saved}`);
    console.log(`   • ⚫ Not Interested: ${excluded}`);
    
    console.log('\n3️⃣ ORDER SUMMARY:');
    console.log(`   • Team Retreats (${included} sites): $${(totalPrice / 100).toFixed(2)}`);
    console.log(`   • Total: $${(totalPrice / 100).toFixed(2)}`);
    
    console.log('\n4️⃣ ENHANCED TARGET SELECTOR:');
    console.log('   • Click Edit on any item');
    console.log('   • Dropdown-only (no free text!)');
    console.log('   • "Add new target page" saves to database');
    console.log('   • Validates URLs and checks duplicates');
    
    console.log('\n🧪 TRY THIS:');
    console.log('1. Change a status dropdown from "Included" to "Excluded"');
    console.log('2. Watch the Original Request numbers update instantly');
    console.log('3. Watch the Order Summary total change');
    console.log('4. Watch the status counts update');
    console.log('5. Click Edit and try the new target page selector');
    
    console.log('\n📍 Go to: ' + `${baseUrl}/orders/${orderId}/review`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReviewFeatures();