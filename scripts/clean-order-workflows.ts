#!/usr/bin/env node
import { db } from '../lib/db/connection.js';
import { workflows, workflowSteps, guestPostItems } from '../lib/db/schema.js';
import { orderLineItems } from '../lib/db/orderLineItemSchema.js';
import { orderItems } from '../lib/db/orderSchema.js';
import { eq } from 'drizzle-orm';

async function cleanOrderWorkflows() {
  const orderId = '474e3625-4140-4919-870e-94497bc81202';

  console.log('🧹 Cleaning up workflows for order:', orderId);

  try {
    // Get line items for this order
    const lineItems = await db.query.orderLineItems.findMany({
      where: eq(orderLineItems.orderId, orderId)
    });

    console.log('Found', lineItems.length, 'line items');

    for (const lineItem of lineItems) {
      if (lineItem.workflowId) {
        console.log('Deleting workflow:', lineItem.workflowId);
        
        // Delete guest post items referencing this workflow
        await db.delete(guestPostItems).where(eq(guestPostItems.workflowId, lineItem.workflowId));
        console.log('- Deleted guest post items');
        
        // Delete workflow steps
        await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, lineItem.workflowId));
        console.log('- Deleted workflow steps');
        
        // Delete workflow
        await db.delete(workflows).where(eq(workflows.id, lineItem.workflowId));
        console.log('- Deleted workflow');
        
        // Clear workflowId from line item
        await db.update(orderLineItems)
          .set({ workflowId: null, modifiedAt: new Date() })
          .where(eq(orderLineItems.id, lineItem.id));
        console.log('- Cleared workflowId from line item');
      }
    }

    // Delete any order items for this order
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    console.log('- Deleted order items');

    console.log('✅ Cleanup complete for order:', orderId);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanOrderWorkflows().catch(console.error);