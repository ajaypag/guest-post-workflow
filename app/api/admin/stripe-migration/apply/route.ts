import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal users can apply migrations
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can apply migrations' }, { status: 403 });
    }

    console.log('Starting Stripe refunds migration...');
    
    // Apply migration in a transaction
    const result = await db.transaction(async (tx) => {
      const applied = {
        migrations: [] as string[],
        errors: [] as string[]
      };

      // Migration 0030: Create refunds table
      try {
        await tx.execute(sql`
          CREATE TABLE IF NOT EXISTS refunds (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            payment_id UUID NOT NULL REFERENCES payments(id),
            order_id UUID NOT NULL REFERENCES orders(id),
            
            -- Refund details
            stripe_refund_id VARCHAR(255) NOT NULL,
            amount INTEGER NOT NULL, -- Amount in cents
            currency VARCHAR(3) NOT NULL DEFAULT 'USD',
            status VARCHAR(50) NOT NULL, -- pending, succeeded, failed, canceled
            
            -- Reason and notes
            reason VARCHAR(50), -- duplicate, fraudulent, requested_by_customer, other
            notes TEXT,
            failure_reason VARCHAR(500),
            
            -- Tracking
            initiated_by UUID NOT NULL REFERENCES users(id),
            metadata JSONB,
            
            -- Timestamps
            processed_at TIMESTAMP,
            canceled_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Add indexes for refunds table
        await tx.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_stripe_id ON refunds(stripe_refund_id)`);
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id)`);
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id)`);
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status)`);
        
        // Add refund columns to orders table
        await tx.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP`);
        await tx.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS partial_refund_amount INTEGER`);
        
        applied.migrations.push('0030_add_refunds_table');
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          applied.errors.push(`0030_add_refunds_table: ${error.message}`);
        }
      }

      // Migration 0031: Add stripe_payment_intent_id to payments table
      try {
        await tx.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)`);
        
        // Add indexes for better query performance
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id)`);
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id)`);
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id)`);
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
        
        applied.migrations.push('0031_add_stripe_payment_intent_to_payments');
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          applied.errors.push(`0031_add_stripe_payment_intent_to_payments: ${error.message}`);
        }
      }

      return applied;
    });

    console.log('Stripe refunds migration completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Stripe refunds migration applied successfully',
      details: {
        migrationsApplied: result.migrations.length,
        errors: result.errors.length
      },
      migrations: result.migrations,
      errors: result.errors.length > 0 ? result.errors : undefined
    });

  } catch (error) {
    console.error('Error applying migration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to apply migration', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}