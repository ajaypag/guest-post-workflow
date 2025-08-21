// Access specific order review page

async function accessOrderReview() {
  const baseUrl = 'http://localhost:3000';
  const orderId = 'aacfa0e6-945f-4b20-81cf-c92af0f6b5c5';
  
  try {
    // Step 1: Login
    console.log('🔐 Logging in as orders@outreachlabs.com...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'orders@outreachlabs.com',
        password: 'TempPassword123!'
      })
    });

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');

    // Extract auth cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const authCookie = setCookieHeader.split(',')
      .find(c => c.includes('auth-token'))
      ?.trim() || setCookieHeader;

    // Step 2: Access the order review page
    console.log(`\n📄 Accessing order review page: ${baseUrl}/orders/${orderId}/review`);
    const reviewPageResponse = await fetch(`${baseUrl}/orders/${orderId}/review`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie.split(';')[0]
      }
    });

    if (reviewPageResponse.ok) {
      console.log('✅ Successfully accessed order review page (Status: 200)');
      const pageHtml = await reviewPageResponse.text();
      console.log(`Page size: ${pageHtml.length} bytes`);
      
      // Check page content
      if (pageHtml.includes('Review Order') || pageHtml.includes('order-review')) {
        console.log('✅ Confirmed: This is the order review page');
      }
    } else {
      console.log('❌ Could not access review page:', reviewPageResponse.status);
    }

    // Step 3: Get order details via API
    console.log(`\n📋 Fetching order details for: ${orderId}`);
    const orderDetailsResponse = await fetch(`${baseUrl}/api/orders/${orderId}?skipOrderGroups=true`, {
      method: 'GET', 
      headers: {
        'Cookie': authCookie.split(';')[0]
      }
    });

    if (orderDetailsResponse.ok) {
      const orderData = await orderDetailsResponse.json();
      console.log('\n📦 Order Details:');
      console.log('  ID:', orderData.id);
      console.log('  Status:', orderData.status);
      console.log('  Created:', orderData.created_at);
      console.log('  Account ID:', orderData.account_id);
      console.log('  Package Type:', orderData.package_type || 'Not set');
      console.log('  Total Amount:', orderData.total_amount || 0);
      console.log('  Line Items:', orderData.line_items?.length || 0);
    }

    // Step 4: Get line items
    console.log(`\n📝 Fetching line items for order...`);
    const lineItemsResponse = await fetch(`${baseUrl}/api/orders/${orderId}/line-items`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie.split(';')[0]
      }
    });

    if (lineItemsResponse.ok) {
      const lineItemsData = await lineItemsResponse.json();
      console.log(`\n📋 Line Items (${lineItemsData.lineItems?.length || 0} total):`);
      
      if (lineItemsData.lineItems?.length > 0) {
        lineItemsData.lineItems.forEach((item, index) => {
          console.log(`\n  Item #${index + 1}:`);
          console.log(`    Target URL: ${item.target_url || 'Not set'}`);
          console.log(`    Quantity: ${item.quantity}`);
          console.log(`    Domains: ${item.domains?.length || 0}`);
          if (item.domains?.length > 0) {
            console.log(`    Sample domains: ${item.domains.slice(0, 3).map(d => d.domain).join(', ')}`);
          }
        });
      } else {
        console.log('  No line items found');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

accessOrderReview();