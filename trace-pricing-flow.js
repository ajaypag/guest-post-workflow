// Trace the exact pricing flow from order to invoice

async function tracePricingFlow() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  console.log('💰 TRACING PRICING FLOW');
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
    
    // Get line items
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      headers: { 'Cookie': authCookie }
    });
    
    const data = await response.json();
    
    console.log('\n1️⃣ LINE ITEMS - What prices do we have?');
    console.log('-'.repeat(60));
    data.lineItems?.forEach((item, i) => {
      console.log(`\nItem ${i + 1}: ${item.assignedDomain?.domain || 'No domain'}`);
      console.log(`  wholesalePrice: $${item.wholesalePrice ? (item.wholesalePrice/100).toFixed(2) : 'null'}`);
      console.log(`  estimatedPrice: $${item.estimatedPrice ? (item.estimatedPrice/100).toFixed(2) : 'null'}`);
      console.log(`  approvedPrice: $${item.approvedPrice ? (item.approvedPrice/100).toFixed(2) : 'null'}`);
      console.log(`  finalPrice: $${item.finalPrice ? (item.finalPrice/100).toFixed(2) : 'null'}`);
      console.log(`  price: $${item.price ? (item.price/100).toFixed(2) : 'null'}`);
    });
    
    // Get the order to see invoice data
    const orderResponse = await fetch(`${baseUrl}/api/orders/${orderId}?skipOrderGroups=true`, {
      headers: { 'Cookie': authCookie }
    });
    const orderData = await orderResponse.json();
    
    console.log('\n2️⃣ ORDER TOTALS - What the order says:');
    console.log('-'.repeat(60));
    console.log(`  subtotalRetail: $${orderData.subtotalRetail ? (orderData.subtotalRetail/100).toFixed(2) : 'null'}`);
    console.log(`  totalRetail: $${orderData.totalRetail ? (orderData.totalRetail/100).toFixed(2) : 'null'}`);
    console.log(`  totalWholesale: $${orderData.totalWholesale ? (orderData.totalWholesale/100).toFixed(2) : 'null'}`);
    
    if (orderData.invoiceData) {
      console.log('\n3️⃣ INVOICE DATA - What was invoiced:');
      console.log('-'.repeat(60));
      orderData.invoiceData.items?.forEach((item, i) => {
        console.log(`\nInvoice Item ${i + 1}:`);
        console.log(`  Description: ${item.description}`);
        console.log(`  Unit Price: $${(item.unitPrice/100).toFixed(2)}`);
        console.log(`  Total: $${(item.total/100).toFixed(2)}`);
      });
      console.log(`\n  Invoice Total: $${(orderData.invoiceData.total/100).toFixed(2)}`);
    }
    
    console.log('\n❓ THE CONFUSION:');
    console.log('-'.repeat(60));
    console.log('• Review page shows: wholesalePrice ($190, $140, $70)');
    console.log('• Invoice API wants: approvedPrice || estimatedPrice || $279');
    console.log('• Result: Invoice uses different prices than what user sees!');
    
    console.log('\n🎯 WHAT SHOULD HAPPEN:');
    console.log('-'.repeat(60));
    console.log('Option 1: Use wholesalePrice as the customer price');
    console.log('Option 2: Use estimatedPrice and show that on review page');
    console.log('Option 3: Set approvedPrice when user reviews/approves');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

tracePricingFlow();