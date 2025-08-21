// Using native fetch (Node 18+)

async function checkOrdersDetails() {
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

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!\n');

    // Extract auth cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const authCookie = setCookieHeader.split(',')
      .find(c => c.includes('auth-token'))
      ?.trim() || setCookieHeader;

    // Step 2: Get detailed orders
    console.log('📋 Fetching detailed orders information...\n');
    const ordersResponse = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie.split(';')[0]
      }
    });

    const ordersData = await ordersResponse.json();
    console.log(`Total orders found: ${ordersData.orders?.length || 0}\n`);
    
    if (ordersData.orders?.length > 0) {
      console.log('📦 Detailed Orders List:');
      console.log('=' . repeat(80));
      
      ordersData.orders.forEach((order, index) => {
        console.log(`\nOrder #${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  Order Number: ${order.order_number || 'Not set'}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Client: ${order.client_name || 'N/A'}`);
        console.log(`  Total Line Items: ${order.total_line_items || 0}`);
        console.log(`  Total Sites: ${order.total_sites || 0}`);
        console.log(`  Created: ${new Date(order.created_at).toLocaleDateString()}`);
        console.log(`  Package: ${order.package_type || 'N/A'}`);
        console.log(`  Total Amount: $${order.total_amount || 0}`);
        
        if (order.line_items?.length > 0) {
          console.log(`  Line Items:`);
          order.line_items.slice(0, 3).forEach(item => {
            console.log(`    - ${item.target_url || 'No target URL'} (${item.quantity || 0} sites)`);
          });
          if (order.line_items.length > 3) {
            console.log(`    ... and ${order.line_items.length - 3} more items`);
          }
        }
      });
      
      console.log('\n' + '=' . repeat(80));
      
      // Status breakdown
      const statusCounts = {};
      ordersData.orders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      
      console.log('\n📊 Orders by Status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkOrdersDetails();