import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:3002/login');
  await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
  await page.fill('input[name="password"]', 'FA64!I$nrbCauS^d');
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await page.waitForURL('http://localhost:3002/', { timeout: 5000 });
  
  // Get cookies
  const cookies = await context.cookies();
  const authCookie = cookies.find(c => c.name === 'auth-session');
  
  if (authCookie) {
    console.log('Auth cookie obtained:', authCookie.value);
    
    // Now check the order details
    const orderResponse = await page.request.get('http://localhost:3002/api/orders/7ae30c7b-d318-4963-98a4-4274680070b6');
    const orderData = await orderResponse.json();
    console.log('\nOrder details:');
    console.log('Status:', orderData.status);
    console.log('Account ID:', orderData.accountId);
    console.log('Line items count:', orderData.lineItems?.length || 0);
    
    if (orderData.lineItems?.length > 0) {
      console.log('First line item client:', orderData.lineItems[0].clientId);
    }
    
    // Check available orders API
    const availableResponse = await page.request.get('http://localhost:3002/api/orders/available-for-domains?domainIds=test');
    const availableData = await availableResponse.json();
    console.log('\nAvailable orders for adding domains:');
    console.log('Total available:', availableData.total || 0);
    console.log('Orders:', availableData.orders?.map((o: any) => ({
      id: o.id,
      status: o.status,
      itemCount: o.itemCount,
      clients: o.clientNames
    })));
    
    // Get all orders to see what's available
    const allOrdersResponse = await page.request.get('http://localhost:3002/api/orders?status=draft,pending_confirmation');
    const allOrders = await allOrdersResponse.json();
    console.log('\nAll draft/pending_confirmation orders:');
    console.log('Total:', allOrders.orders?.length || 0);
    allOrders.orders?.forEach((o: any) => {
      console.log(`- ${o.id.slice(-8)}: status=${o.status}, items=${o.lineItemsCount || 0}`);
    });
  } else {
    console.log('Failed to obtain auth cookie');
  }

  await browser.close();
})();