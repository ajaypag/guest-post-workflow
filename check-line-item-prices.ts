import { db } from './lib/db/connection';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { eq } from 'drizzle-orm';

async function checkPrices() {
  const orderId = 'ac5740f6-d035-4557-9199-91833046b40d';
  
  const items = await db
    .select({
      id: orderLineItems.id,
      assignedDomain: orderLineItems.assignedDomain,
      assignedDomainId: orderLineItems.assignedDomainId,
      estimatedPrice: orderLineItems.estimatedPrice,
      wholesalePrice: orderLineItems.wholesalePrice,
      approvedPrice: orderLineItems.approvedPrice,
      status: orderLineItems.status,
      targetPageUrl: orderLineItems.targetPageUrl,
      metadata: orderLineItems.metadata
    })
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId));
  
  console.log('\n=== LINE ITEMS PRICING CHECK ===\n');
  console.log(`Found ${items.length} line items for order ${orderId}\n`);
  
  items.forEach((item, i) => {
    console.log(`Item ${i + 1}:`);
    console.log(`  ID: ${item.id}`);
    console.log(`  Domain: ${item.assignedDomain || 'NOT ASSIGNED'}`);
    console.log(`  Domain ID: ${item.assignedDomainId || 'NONE'}`);
    console.log(`  Estimated Price: $${item.estimatedPrice ? (item.estimatedPrice / 100).toFixed(2) : '0.00'} (cents: ${item.estimatedPrice})`);
    console.log(`  Wholesale Price: $${item.wholesalePrice ? (item.wholesalePrice / 100).toFixed(2) : '0.00'} (cents: ${item.wholesalePrice})`);
    console.log(`  Approved Price: $${item.approvedPrice ? (item.approvedPrice / 100).toFixed(2) : '0.00'}`);
    console.log(`  Status: ${item.status}`);
    console.log(`  Target URL: ${item.targetPageUrl || 'NONE'}`);
    
    // Check metadata
    const metadata = item.metadata as any;
    if (metadata) {
      console.log(`  Metadata DR: ${metadata.domainRating || 'N/A'}`);
      console.log(`  Metadata Traffic: ${metadata.traffic || 'N/A'}`);
    }
    console.log('---');
  });
  
  process.exit(0);
}

checkPrices().catch(console.error);