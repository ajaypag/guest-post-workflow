import { db } from './lib/db/connection';
import { orders } from './lib/db/orderSchema';
import { payments } from './lib/db/paymentSchema';
import { eq } from 'drizzle-orm';

async function markOrderAsPaid() {
  const orderId = 'ac5740f6-d035-4557-9199-91833046b40d';
  const paymentIntentId = 'pi_3Ryb2iLCEW4iT...'; // The transaction ID you saw
  
  try {
    console.log('🔍 Checking current order status...');
    
    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    
    console.log('Current order state:', order.state);
    console.log('Paid at:', order.paidAt);
    
    // Update order to paid
    console.log('💰 Marking order as paid...');
    await db
      .update(orders)
      .set({
        state: 'payment_received',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
    
    // Create payment record if it doesn't exist
    console.log('📝 Creating payment record...');
    const existingPayment = await db.query.payments.findFirst({
      where: eq(payments.orderId, orderId)
    });
    
    if (!existingPayment) {
      await db.insert(payments).values({
        orderId,
        accountId: order.accountId!,
        amount: 244500, // $2445.00 in cents
        currency: 'USD',
        status: 'completed',
        method: 'stripe',
        transactionId: paymentIntentId,
        stripePaymentIntentId: paymentIntentId,
        processorResponse: JSON.stringify({ 
          note: 'Manually created for testing',
          originalAmount: '$2445.00'
        }),
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Payment record created');
    } else {
      console.log('ℹ️ Payment record already exists');
    }
    
    console.log('✅ Order successfully marked as paid!');
    console.log('Order ID:', orderId);
    console.log('New state: payment_received');
    
  } catch (error) {
    console.error('❌ Error marking order as paid:', error);
  }
}

// Run the function
markOrderAsPaid().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});