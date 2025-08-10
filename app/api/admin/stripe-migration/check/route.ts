import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal users can check migrations
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can check migrations' }, { status: 403 });
    }

    // Check refunds table
    const refundsTableResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'refunds'
      ) as exists
    `);
    
    // Check if refund columns exist in orders table
    const ordersColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('refunded_at', 'partial_refund_amount')
    `);
    
    // Check if stripe_payment_intent_id exists in payments table
    const paymentsColumnResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'stripe_payment_intent_id'
      ) as exists
    `);
    
    const refundsTableExists = refundsTableResult.rows[0]?.exists === true;
    const refundColumnsCount = ordersColumnsResult.rows.length;
    const paymentIntentColumnExists = paymentsColumnResult.rows[0]?.exists === true;
    
    // Determine migration status
    const refundsComplete = refundsTableExists && refundColumnsCount === 2;
    const paymentIntentComplete = paymentIntentColumnExists;

    const tableStatus: Record<string, boolean> = {
      'refunds_table': refundsComplete,
      'payment_intent_column': paymentIntentComplete
    };

    return NextResponse.json({
      success: true,
      tables: tableStatus,
      details: {
        refunds_table_exists: refundsTableExists,
        refund_columns_count: refundColumnsCount,
        payment_intent_column_exists: paymentIntentColumnExists
      },
      allComplete: refundsComplete && paymentIntentComplete
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error },
      { status: 500 }
    );
  }
}