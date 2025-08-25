// Direct database update script
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/guest_post_workflow?sslmode=disable';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { orders } from '../lib/db/orderSchema';
import { eq } from 'drizzle-orm';

async function markOrderAsPaid() {
  const orderId = '4c89c946-b008-442a-b8c1-74c57b27e0dd';
  
  try {
    console.log(`Marking order ${orderId} as paid...`);
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const db = drizzle(pool);
    
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
        total: updatedOrder.totalRetail / 100 // Convert cents to dollars
      });
    } else {
      console.log('❌ Order not found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error marking order as paid:', error);
  } finally {
    process.exit(0);
  }
}

markOrderAsPaid();