import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST() {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting migration 0051: Publisher Payments System');

    // Execute the migration SQL
    await db.execute(sql`
      -- Publisher Payment Profiles
      CREATE TABLE IF NOT EXISTS publisher_payment_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
        
        -- Payment Method Preferences
        preferred_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
        
        -- Bank Transfer Details
        bank_name VARCHAR(255),
        bank_account_holder VARCHAR(255),
        bank_account_number VARCHAR(100),
        bank_routing_number VARCHAR(50),
        bank_swift_code VARCHAR(20),
        bank_address TEXT,
        
        -- PayPal Details
        paypal_email VARCHAR(255),
        
        -- Mailing Address (for checks)
        mailing_address TEXT,
        mailing_city VARCHAR(100),
        mailing_state VARCHAR(50),
        mailing_zip VARCHAR(20),
        mailing_country VARCHAR(50) DEFAULT 'US',
        
        -- Tax Information
        tax_id VARCHAR(50),
        tax_form_type VARCHAR(10),
        is_business BOOLEAN DEFAULT false,
        business_name VARCHAR(255),
        
        -- Payment Schedule Preferences
        minimum_payout_amount INTEGER DEFAULT 5000,
        payment_frequency VARCHAR(20) DEFAULT 'monthly',
        preferred_payment_day INTEGER DEFAULT 1,
        
        -- Status and Metadata
        is_verified BOOLEAN DEFAULT false,
        verification_notes TEXT,
        verified_at TIMESTAMP,
        verified_by UUID REFERENCES users(id),
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      -- Publisher Invoices
      CREATE TABLE IF NOT EXISTS publisher_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
        
        -- Invoice Details
        invoice_number VARCHAR(100) NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE,
        
        -- Amount Details
        gross_amount INTEGER NOT NULL,
        tax_amount INTEGER DEFAULT 0,
        total_amount INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        
        -- Invoice Content
        description TEXT NOT NULL,
        line_items JSONB,
        notes TEXT,
        
        -- File Attachments
        invoice_file_url VARCHAR(500),
        supporting_documents JSONB,
        
        -- Review and Approval
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP,
        approved_amount INTEGER,
        
        -- Payment Tracking
        paid_by UUID REFERENCES users(id),
        paid_at TIMESTAMP,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        payment_notes TEXT,
        
        -- Order Associations
        related_order_line_items JSONB,
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        
        -- Constraints
        UNIQUE(publisher_id, invoice_number),
        CHECK (total_amount > 0),
        CHECK (gross_amount > 0)
      )
    `);

    await db.execute(sql`
      -- Enhanced Publisher Earnings
      CREATE TABLE IF NOT EXISTS publisher_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
        order_line_item_id UUID REFERENCES order_line_items(id) ON DELETE SET NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        
        -- Earnings Details
        gross_amount INTEGER NOT NULL,
        platform_fee INTEGER NOT NULL DEFAULT 0,
        net_amount INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        
        -- Status Tracking
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        earned_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Payment Processing
        included_in_invoice_id UUID REFERENCES publisher_invoices(id),
        paid_at TIMESTAMP,
        payment_batch_id VARCHAR(100),
        payment_method VARCHAR(50),
        
        -- Metadata
        description TEXT,
        metadata JSONB,
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        
        -- Constraints
        CHECK (net_amount >= 0),
        CHECK (gross_amount > 0)
      )
    `);

    await db.execute(sql`
      -- Payment Batches
      CREATE TABLE IF NOT EXISTS publisher_payment_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_number VARCHAR(100) NOT NULL UNIQUE,
        
        -- Batch Details
        payment_method VARCHAR(50) NOT NULL,
        total_amount INTEGER NOT NULL,
        total_invoices INTEGER NOT NULL DEFAULT 0,
        total_publishers INTEGER NOT NULL DEFAULT 0,
        
        -- Processing
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        processed_by UUID REFERENCES users(id),
        processed_at TIMESTAMP,
        
        -- External References
        external_batch_id VARCHAR(255),
        external_transaction_ids JSONB,
        
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_publisher_payment_profiles_publisher_id ON publisher_payment_profiles(publisher_id);
      CREATE INDEX IF NOT EXISTS idx_publisher_invoices_publisher_id ON publisher_invoices(publisher_id);
      CREATE INDEX IF NOT EXISTS idx_publisher_invoices_status ON publisher_invoices(status);
      CREATE INDEX IF NOT EXISTS idx_publisher_invoices_created_at ON publisher_invoices(created_at);
      CREATE INDEX IF NOT EXISTS idx_publisher_earnings_publisher_id ON publisher_earnings(publisher_id);
      CREATE INDEX IF NOT EXISTS idx_publisher_earnings_status ON publisher_earnings(status);
      CREATE INDEX IF NOT EXISTS idx_publisher_earnings_created_at ON publisher_earnings(created_at);
    `);

    console.log('✅ Migration 0051 completed successfully');

    // Record migration completion
    await db.execute(sql`
      INSERT INTO migration_history (migration_name, success, applied_by)
      VALUES ('0051_publisher_payments_system', true, 'admin')
      ON CONFLICT (migration_name) DO UPDATE
      SET executed_at = NOW(), success = true
    `);

    return NextResponse.json({
      success: true,
      message: 'Publisher payments system created successfully'
    });

  } catch (error) {
    console.error('Migration 0051 failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}