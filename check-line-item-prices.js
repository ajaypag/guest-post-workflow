const { db } = require('./lib/db/connection');
const { orderLineItems } = require('./lib/db/orderLineItemSchema');
const { eq } = require('drizzle-orm');

async function checkPrices() {
  const orderId = 'ac5740f6-d035-4557-9199-91833046b40d';
  
  const items = await db
    .select({
      id: orderLineItems.id,
      assignedDomain: orderLineItems.assignedDomain,
      estimatedPrice: orderLineItems.estimatedPrice,
      wholesalePrice: orderLineItems.wholesalePrice,
      approvedPrice: orderLineItems.approvedPrice,
      status: orderLineItems.status,
      targetPageUrl: orderLineItems.targetPageUrl
    })
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId));
  
  console.log('\n=== LINE ITEMS PRICING ===\n');
  items.forEach((item, i) => {
    console.log(`Item ${i + 1}:`);
    console.log(`  ID: ${item.id}`);
    console.log(`  Domain: ${item.assignedDomain || 'NOT ASSIGNED'}`);
    console.log(`  Estimated Price: $${item.estimatedPrice ? (item.estimatedPrice / 100).toFixed(2) : '0.00'}`);
    console.log(`  Wholesale Price: $${item.wholesalePrice ? (item.wholesalePrice / 100).toFixed(2) : '0.00'}`);
    console.log(`  Approved Price: $${item.approvedPrice ? (item.approvedPrice / 100).toFixed(2) : '0.00'}`);
    console.log(`  Status: ${item.status}`);
    console.log(`  Target URL: ${item.targetPageUrl || 'NONE'}`);
    console.log('---');
  });
  
  process.exit(0);
}

checkPrices().catch(console.error);