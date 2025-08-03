import { db } from '../lib/db/connection';
import { orders } from '../lib/db/orderSchema';
import { orderGroups } from '../lib/db/orderGroupSchema';
import { eq } from 'drizzle-orm';

async function testOrderEditFlow() {
  console.log('🧪 Testing Order Edit Flow\n');

  // Test order ID - you can change this to test a specific order
  const orderId = 'fc2acc67-17f7-442a-b20d-d4bfd2467f7b';

  try {
    // 1. Fetch the order before edit
    console.log('1️⃣ Fetching original order...');
    const originalOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    
    if (!originalOrder) {
      console.error('❌ Order not found');
      return;
    }
    
    console.log('Original order:');
    console.log(`  - Status: ${originalOrder.status}`);
    console.log(`  - Subtotal: $${(originalOrder.subtotalRetail / 100).toFixed(2)}`);
    console.log(`  - Total: $${(originalOrder.totalRetail / 100).toFixed(2)}`);
    
    // 2. Fetch order groups
    console.log('\n2️⃣ Fetching order groups...');
    const originalGroups = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId),
      with: {
        client: true
      }
    });
    
    console.log(`Found ${originalGroups.length} order groups:`);
    originalGroups.forEach(group => {
      const packageInfo = group.requirementOverrides as any;
      console.log(`  - ${group.client.name}: ${group.linkCount} links`);
      console.log(`    Package: ${packageInfo?.packageType || 'not set'} - $${(packageInfo?.packagePrice || 0) / 100}`);
    });
    
    // 3. Simulate an edit (like what the edit page would send)
    console.log('\n3️⃣ Simulating order edit...');
    const editData = {
      // Using correct field names that API expects
      subtotal: 100000, // $1000.00
      totalPrice: 95000, // $950.00 (with discount)
      totalWholesale: 57000, // $570.00 (60% of total)
      profitMargin: 38000, // $380.00
      discountPercent: '5',
      discountAmount: 5000,
      
      // Order groups with package info
      orderGroups: originalGroups.map(group => ({
        clientId: group.clientId,
        linkCount: group.linkCount,
        targetPages: group.targetPages || [],
        anchorTexts: group.anchorTexts || [],
        packageType: 'best', // Upgrading all to 'best' package
        packagePrice: 59900, // $599.00 per link
        requirementOverrides: {
          ...(group.requirementOverrides || {}),
          packageType: 'best',
          packagePrice: 59900
        }
      }))
    };
    
    console.log('Edit data prepared with:');
    console.log(`  - New subtotal: $${(editData.subtotal / 100).toFixed(2)}`);
    console.log(`  - New total: $${(editData.totalPrice / 100).toFixed(2)}`);
    console.log(`  - All packages upgraded to: best ($599.00)`);
    
    // 4. Call the API endpoint
    console.log('\n4️⃣ Calling API to update order...');
    const apiUrl = `http://localhost:3000/api/orders/${orderId}`;
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error(`❌ API returned error: ${response.status}`);
      const error = await response.text();
      console.error(error);
      return;
    }
    
    const updatedOrderFromApi = await response.json();
    console.log('✅ API update successful');
    
    // 5. Fetch the order again to verify changes
    console.log('\n5️⃣ Fetching updated order from database...');
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    
    const updatedGroups = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId),
      with: {
        client: true
      }
    });
    
    // 6. Compare results
    console.log('\n6️⃣ Comparing results:');
    console.log('\nOrder table changes:');
    console.log(`  Subtotal: $${(originalOrder.subtotalRetail / 100).toFixed(2)} → $${(updatedOrder!.subtotalRetail / 100).toFixed(2)}`);
    console.log(`  Total: $${(originalOrder.totalRetail / 100).toFixed(2)} → $${(updatedOrder!.totalRetail / 100).toFixed(2)}`);
    
    console.log('\nOrder groups changes:');
    updatedGroups.forEach((group, idx) => {
      const original = originalGroups[idx];
      const originalPackage = original.requirementOverrides as any;
      const updatedPackage = group.requirementOverrides as any;
      
      console.log(`  ${group.client.name}:`);
      console.log(`    Package: ${originalPackage?.packageType || 'not set'} → ${updatedPackage?.packageType || 'not set'}`);
      console.log(`    Price: $${((originalPackage?.packagePrice || 0) / 100).toFixed(2)} → $${((updatedPackage?.packagePrice || 0) / 100).toFixed(2)}`);
    });
    
    // 7. Test if the order detail page would show the correct data
    console.log('\n7️⃣ Testing order detail page data extraction...');
    const detailPageGroups = updatedGroups.map(({ orderGroup: group, client }) => ({
      ...group,
      client,
      packageType: group.requirementOverrides?.packageType || 'better',
      packagePrice: group.requirementOverrides?.packagePrice || 0
    }));
    
    console.log('\nOrder detail page would show:');
    detailPageGroups.forEach(group => {
      console.log(`  ${group.client.name}: ${group.linkCount} links`);
      console.log(`    Package: ${group.packageType} - $${(group.packagePrice / 100).toFixed(2)}`);
    });
    
    console.log('\n✅ Order edit flow test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testOrderEditFlow();