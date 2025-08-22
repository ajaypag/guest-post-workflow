import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { stripePaymentIntents } from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { orderId, testMode } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // For testing purposes, skip auth if testMode is true
    if (!testMode) {
      // Add auth check here in production
      console.log('[ADMIN] Production mode - auth required');
    }

    console.log(`[ADMIN] Clearing payment intent for order: ${orderId}`);
    
    // First check what payment intents exist
    const existingPaymentIntents = await db
      .select()
      .from(stripePaymentIntents)
      .where(eq(stripePaymentIntents.orderId, orderId));
      
    console.log(`[ADMIN] Found ${existingPaymentIntents.length} payment intents for this order`);
    
    const results = {
      clearedPaymentIntents: 0,
      paymentIntentIds: [] as string[],
      orderUpdated: false,
      orderState: null as string | null
    };
    
    // Delete payment intents from our database (but not from Stripe)
    if (existingPaymentIntents.length > 0) {
      results.paymentIntentIds = existingPaymentIntents.map(pi => pi.stripePaymentIntentId);
      
      await db
        .delete(stripePaymentIntents)
        .where(eq(stripePaymentIntents.orderId, orderId));
        
      results.clearedPaymentIntents = existingPaymentIntents.length;
      console.log(`[ADMIN] Deleted ${results.clearedPaymentIntents} payment intent records from database`);
    }
    
    // Reset order payment status
    const orderUpdate = await db
      .update(orders)
      .set({
        paidAt: null,
        state: 'payment_pending',
        status: 'confirmed',
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
      
    if (orderUpdate.length > 0) {
      results.orderUpdated = true;
      results.orderState = orderUpdate[0].state as string;
      console.log(`[ADMIN] Order reset to payment_pending state`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Payment intent cleared successfully',
      orderId,
      results,
      testUrl: `http://localhost:3000/orders/${orderId}/payment`
    });

  } catch (error) {
    console.error('[ADMIN] Error clearing payment intent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear payment intent', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}