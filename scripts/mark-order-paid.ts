import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from '../lib/db/connection';
import { orders } from '../lib/db/orderSchema';
import { eq } from 'drizzle-orm';

async function markOrderAsPaid() {
  const orderId = '4c89c946-b008-442a-b8c1-74c57b27e0dd';
  
  try {
    console.log(`Marking order ${orderId} as paid...`);
    
    const [updatedOrder] = await db.update(orders)
      .set({
        status: 'paid',
        state: 'payment_received',
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    if (updatedOrder) {
      console.log('✅ Order marked as paid successfully!');
      console.log('Order details:', {
        id: updatedOrder.id,
        status: updatedOrder.status,
        state: updatedOrder.state,
        paidAt: updatedOrder.paidAt,
        total: updatedOrder.totalRetail
      });
    } else {
      console.log('❌ Order not found');
    }
  } catch (error) {
    console.error('Error marking order as paid:', error);
  } finally {
    process.exit(0);
  }
}

markOrderAsPaid();