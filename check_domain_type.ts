import { db } from './lib/db/connection';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { eq } from 'drizzle-orm';

async function checkDomainType() {
  const items = await db.select().from(orderLineItems).where(eq(orderLineItems.orderId, '474e3625-4140-4919-870e-94497bc81202')).limit(3);
  
  console.log('Checking assignedDomain field for each line item:');
  items.forEach((item, index) => {
    console.log(`\nItem ${index + 1}:`);
    console.log('  ID:', item.id);
    console.log('  assignedDomain type:', typeof item.assignedDomain);
    console.log('  assignedDomain value:', item.assignedDomain);
    if (item.assignedDomain && typeof item.assignedDomain === 'object') {
      console.log('  assignedDomain is an OBJECT! Keys:', Object.keys(item.assignedDomain));
      console.log('  Domain field:', (item.assignedDomain as any).domain);
    }
  });
  
  process.exit(0);
}

checkDomainType().catch(console.error);