import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      success: true,
      tablesCreated: [] as string[],
      enumsCreated: [] as string[],
      errors: [] as string[],
    };

    // Create payment status enum
    try {
      await db.execute(sql`
        CREATE TYPE payment_status AS ENUM (
          'pending',
          'completed',
          'failed',
          'refunded',
          'partial',
          'cancelled'
        )
      `);
      results.enumsCreated.push('payment_status');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('payment_status enum already exists');
      } else {
        results.errors.push(`Failed to create payment_status enum: ${error.message}`);
      }
    }

    // Create payment method enum
    try {
      await db.execute(sql`
        CREATE TYPE payment_method AS ENUM (
          'bank_transfer',
          'credit_card',
          'paypal',
          'check',
          'cash',
          'stripe',
          'other'
        )
      `);
      results.enumsCreated.push('payment_method');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('payment_method enum already exists');
      } else {
        results.errors.push(`Failed to create payment_method enum: ${error.message}`);
      }
    }

    // Create payments table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS payments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          order_id UUID NOT NULL REFERENCES orders(id),
          account_id UUID NOT NULL REFERENCES accounts(id),
          amount INTEGER NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          status payment_status NOT NULL DEFAULT 'pending',
          method payment_method NOT NULL,
          transaction_id VARCHAR(255),
          processor_response JSONB,
          notes VARCHAR(1000),
          failure_reason VARCHAR(500),
          recorded_by UUID REFERENCES accounts(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          processed_at TIMESTAMP,
          is_partial BOOLEAN DEFAULT FALSE,
          remaining_amount INTEGER
        )
      `);
      results.tablesCreated.push('payments');
    } catch (error: any) {
      results.errors.push(`Failed to create payments table: ${error.message}`);
    }

    // Create invoices table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          order_id UUID NOT NULL REFERENCES orders(id),
          payment_id UUID REFERENCES payments(id),
          invoice_number VARCHAR(50) NOT NULL UNIQUE,
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          subtotal INTEGER NOT NULL,
          tax INTEGER DEFAULT 0,
          discount INTEGER DEFAULT 0,
          total INTEGER NOT NULL,
          issue_date TIMESTAMP DEFAULT NOW() NOT NULL,
          due_date TIMESTAMP NOT NULL,
          paid_date TIMESTAMP,
          file_url VARCHAR(500),
          sent_at TIMESTAMP,
          sent_to VARCHAR(255),
          line_items JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      results.tablesCreated.push('invoices');
    } catch (error: any) {
      results.errors.push(`Failed to create invoices table: ${error.message}`);
    }

    // Create indexes
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices(payment_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
    } catch (error: any) {
      results.errors.push(`Failed to create indexes: ${error.message}`);
    }

    // Verify tables exist
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('payments', 'invoices')
    `);

    const existingTables = tableCheck.rows.map((row: any) => row.table_name);

    return NextResponse.json({
      ...results,
      existingTables,
      message: results.errors.length === 0 
        ? 'Payment tables migration completed successfully' 
        : 'Migration completed with some errors',
    });

  } catch (error) {
    console.error('Payment tables migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error },
      { status: 500 }
    );
  }
}