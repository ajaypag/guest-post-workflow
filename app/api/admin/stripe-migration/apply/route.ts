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

    console.log('Starting Stripe migration...');
    
    // Apply migration in a transaction
    const result = await db.transaction(async (tx) => {
      const created = {
        tables: [] as string[],
        indexes: [] as string[],
        errors: [] as string[]
      };

      // Create stripe_payment_intents table
      try {
        await tx.execute(sql`
          CREATE TABLE IF NOT EXISTS "stripe_payment_intents" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
            "payment_id" uuid REFERENCES "payments"("id"),
            "stripe_payment_intent_id" varchar(255) NOT NULL UNIQUE,
            "stripe_customer_id" varchar(255),
            "amount" integer NOT NULL,
            "currency" varchar(3) NOT NULL DEFAULT 'USD',
            "status" varchar(50) NOT NULL,
            "client_secret" text NOT NULL,
            "metadata" jsonb,
            "idempotency_key" varchar(255) UNIQUE,
            "payment_method_id" varchar(255),
            "setup_future_usage" varchar(50),
            "confirmation_method" varchar(50) DEFAULT 'automatic',
            "amount_capturable" integer,
            "amount_captured" integer DEFAULT 0,
            "amount_received" integer DEFAULT 0,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            "confirmed_at" timestamp,
            "succeeded_at" timestamp,
            "canceled_at" timestamp,
            "last_webhook_event_id" varchar(255),
            "last_error" jsonb,
            "failure_code" varchar(100),
            "failure_message" text
          )
        `);
        created.tables.push('stripe_payment_intents');
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          created.errors.push(`stripe_payment_intents: ${error.message}`);
        }
      }

      // Create stripe_customers table
      try {
        await tx.execute(sql`
          CREATE TABLE IF NOT EXISTS "stripe_customers" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
            "stripe_customer_id" varchar(255) NOT NULL UNIQUE,
            "email" varchar(255) NOT NULL,
            "name" varchar(255),
            "billing_address" jsonb,
            "metadata" jsonb,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          )
        `);
        created.tables.push('stripe_customers');
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          created.errors.push(`stripe_customers: ${error.message}`);
        }
      }

      // Create stripe_webhooks table
      try {
        await tx.execute(sql`
          CREATE TABLE IF NOT EXISTS "stripe_webhooks" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "stripe_event_id" varchar(255) NOT NULL UNIQUE,
            "event_type" varchar(100) NOT NULL,
            "status" varchar(50) NOT NULL DEFAULT 'pending',
            "payment_intent_id" uuid REFERENCES "stripe_payment_intents"("id"),
            "order_id" uuid REFERENCES "orders"("id"),
            "event_data" jsonb NOT NULL,
            "processed_at" timestamp,
            "error_message" text,
            "retry_count" integer DEFAULT 0,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          )
        `);
        created.tables.push('stripe_webhooks');
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          created.errors.push(`stripe_webhooks: ${error.message}`);
        }
      }

      // Create indexes for performance
      const indexes = [
        { name: 'idx_stripe_payment_intents_order_id', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_payment_intents_order_id" ON "stripe_payment_intents"("order_id")' },
        { name: 'idx_stripe_payment_intents_stripe_id', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_payment_intents_stripe_id" ON "stripe_payment_intents"("stripe_payment_intent_id")' },
        { name: 'idx_stripe_payment_intents_status', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_payment_intents_status" ON "stripe_payment_intents"("status")' },
        { name: 'idx_stripe_payment_intents_customer', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_payment_intents_customer" ON "stripe_payment_intents"("stripe_customer_id")' },
        { name: 'idx_stripe_customers_account', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_customers_account" ON "stripe_customers"("account_id")' },
        { name: 'idx_stripe_customers_stripe_id', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_customers_stripe_id" ON "stripe_customers"("stripe_customer_id")' },
        { name: 'idx_stripe_customers_email', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_customers_email" ON "stripe_customers"("email")' },
        { name: 'idx_stripe_webhooks_event_id', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_webhooks_event_id" ON "stripe_webhooks"("stripe_event_id")' },
        { name: 'idx_stripe_webhooks_type', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_webhooks_type" ON "stripe_webhooks"("event_type")' },
        { name: 'idx_stripe_webhooks_status', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_webhooks_status" ON "stripe_webhooks"("status")' },
        { name: 'idx_stripe_webhooks_order', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_webhooks_order" ON "stripe_webhooks"("order_id")' },
        { name: 'idx_stripe_webhooks_created', sql: 'CREATE INDEX IF NOT EXISTS "idx_stripe_webhooks_created" ON "stripe_webhooks"("created_at")' }
      ];

      for (const index of indexes) {
        try {
          await tx.execute(sql.raw(index.sql));
          created.indexes.push(index.name);
        } catch (error: any) {
          if (!error.message?.includes('already exists')) {
            created.errors.push(`${index.name}: ${error.message}`);
          }
        }
      }

      return created;
    });

    console.log('Stripe migration completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Stripe migration applied successfully',
      details: {
        tablesCreated: result.tables.length,
        indexesCreated: result.indexes.length,
        errors: result.errors.length
      },
      created: result.tables,
      indexes: result.indexes,
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