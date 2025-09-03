import { db } from './lib/db/connection';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { eq, and } from 'drizzle-orm';

async function fixDraftStatus() {
  const items = await db
    .select()
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, '474e3625-4140-4919-870e-94497bc81202'),
        eq(orderLineItems.assignedDomain, 'top4.com.au')
      )
    );

  if (items.length > 0) {
    const item = items[0];
    console.log('Current status:', item.status);
    
    // Update status to 'pending' since it has publisher assigned and is included
    console.log('\nUpdating status to "pending" (ready for review)...');
    
    await db
      .update(orderLineItems)
      .set({
        status: 'pending',
        publisherStatus: 'pending',
        modifiedAt: new Date()
      })
      .where(eq(orderLineItems.id, item.id));
    
    console.log('✅ Status updated successfully!');
    console.log('\nThe line item should now appear as ready for review.');
    console.log('Refresh the page to see the changes.');
  } else {
    console.log('No line item found for top4.com.au');
  }
  
  process.exit(0);
}

fixDraftStatus().catch(console.error);