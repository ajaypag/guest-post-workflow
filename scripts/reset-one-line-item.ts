import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { eq } from 'drizzle-orm';

async function resetOneLineItem() {
  const orderId = 'a3ca24b7-9a92-4c00-952e-bb71606af8b9';
  
  console.log('\n=== RESETTING ONE LINE ITEM FOR TESTING ===\n');
  
  // Find the tekedia.com assignment
  const item = await db.query.orderLineItems.findFirst({
    where: eq(orderLineItems.assignedDomain, 'tekedia.com')
  });
  
  if (!item) {
    console.log('Could not find tekedia.com assignment');
    return;
  }
  
  console.log('Found line item with tekedia.com');
  console.log('  Current wholesale price:', item.wholesalePrice ? `$${(item.wholesalePrice/100).toFixed(2)}` : 'null');
  console.log('  Current estimated price:', item.estimatedPrice ? `$${(item.estimatedPrice/100).toFixed(2)}` : 'null');
  
  // Reset it
  await db
    .update(orderLineItems)
    .set({
      assignedDomainId: null,
      assignedDomain: null,
      assignedAt: null,
      assignedBy: null,
      wholesalePrice: null,
      estimatedPrice: 16900, // Reset to client suggested price
      status: 'pending',
      metadata: {}
    })
    .where(eq(orderLineItems.id, item.id));
  
  console.log('\n✅ Reset successful! Line item is now unassigned.');
  console.log('You can now test assigning tekedia.com through the UI.');
  
  process.exit(0);
}

resetOneLineItem().catch(console.error);