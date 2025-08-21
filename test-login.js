// Using native fetch (Node 18+)

async function loginAndAccessOrders() {
  const baseUrl = 'http://localhost:3000';
  
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

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Login failed:', loginResponse.status, errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('User:', loginData.user);

    // Extract cookies from response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('❌ No auth cookie received');
      return;
    }
    
    // Extract just the auth-token cookie
    const authCookie = setCookieHeader.split(',')
      .find(c => c.includes('auth-token'))
      ?.trim() || setCookieHeader;

    console.log('🍪 Auth cookie received');

    // Step 2: Access orders page
    console.log('\n📋 Accessing orders page...');
    const ordersResponse = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie.split(';')[0] // Use only the auth-token part
      }
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('❌ Failed to fetch orders:', ordersResponse.status, errorText);
      return;
    }

    const ordersData = await ordersResponse.json();
    console.log('✅ Orders fetched successfully!');
    console.log(`Found ${ordersData.orders?.length || 0} orders`);
    
    if (ordersData.orders?.length > 0) {
      console.log('\n📦 Orders summary:');
      ordersData.orders.slice(0, 5).forEach(order => {
        console.log(`  - Order ${order.order_number}: ${order.status} (${order.total_line_items || 0} items)`);
      });
    }

    // Step 3: Try to access the orders page HTML
    console.log('\n🌐 Accessing orders page HTML...');
    const pageResponse = await fetch(`${baseUrl}/orders`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie.split(';')[0]
      }
    });

    if (pageResponse.ok) {
      console.log('✅ Orders page HTML accessible (Status: 200)');
      const pageHtml = await pageResponse.text();
      console.log(`Page size: ${pageHtml.length} bytes`);
      
      // Check if it's the actual orders page or a redirect
      if (pageHtml.includes('Orders') || pageHtml.includes('order')) {
        console.log('✅ Confirmed: This is the orders page');
      } else if (pageHtml.includes('login') || pageHtml.includes('sign in')) {
        console.log('⚠️  Page appears to be a login page - authentication may be required');
      }
    } else {
      console.log('❌ Could not access orders page:', pageResponse.status);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

loginAndAccessOrders();