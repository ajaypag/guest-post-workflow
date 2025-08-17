-- Migration: Publisher Payment System
-- Creates tables for publisher payment profiles and invoice management

-- Publisher Payment Profiles
CREATE TABLE IF NOT EXISTS publisher_payment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  
  -- Payment Method Preferences
  preferred_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer', -- bank_transfer, paypal, check, stripe
  
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
  tax_id VARCHAR(50), -- SSN or EIN
  tax_form_type VARCHAR(10), -- W9, W8, etc
  is_business BOOLEAN DEFAULT false,
  business_name VARCHAR(255),
  
  -- Payment Schedule Preferences
  minimum_payout_amount INTEGER DEFAULT 5000, -- In cents ($50 minimum)
  payment_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, biweekly, monthly
  preferred_payment_day INTEGER DEFAULT 1, -- Day of month or week
  
  -- Status and Metadata
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Publisher Invoices (Manual Submission System)
CREATE TABLE IF NOT EXISTS publisher_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  
  -- Invoice Details
  invoice_number VARCHAR(100) NOT NULL, -- Publisher's invoice number
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Amount Details
  gross_amount INTEGER NOT NULL, -- In cents
  tax_amount INTEGER DEFAULT 0, -- In cents
  total_amount INTEGER NOT NULL, -- In cents
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Invoice Content
  description TEXT NOT NULL,
  line_items JSONB, -- Detailed breakdown
  notes TEXT,
  
  -- File Attachments
  invoice_file_url VARCHAR(500), -- Link to uploaded invoice PDF
  supporting_documents JSONB, -- Array of file URLs
  
  -- Review and Approval
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, under_review, approved, rejected, paid
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  approved_amount INTEGER, -- May be different from requested amount
  
  -- Payment Tracking
  paid_by UUID REFERENCES users(id),
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  payment_notes TEXT,
  
  -- Order Associations (optional - for tracking)
  related_order_line_items JSONB, -- Array of order line item IDs
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(publisher_id, invoice_number),
  CHECK (total_amount > 0),
  CHECK (gross_amount > 0)
);

-- Automatic Earnings Records (Enhanced)
CREATE TABLE IF NOT EXISTS publisher_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  order_line_item_id UUID REFERENCES order_line_items(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Earnings Details
  gross_amount INTEGER NOT NULL, -- In cents
  platform_fee INTEGER NOT NULL DEFAULT 0, -- In cents
  net_amount INTEGER NOT NULL, -- In cents
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Status Tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, invoiced, paid
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
);

-- Payment Batches (for bulk payments)
CREATE TABLE IF NOT EXISTS publisher_payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(100) NOT NULL UNIQUE,
  
  -- Batch Details
  payment_method VARCHAR(50) NOT NULL, -- bank_transfer, paypal, check
  total_amount INTEGER NOT NULL, -- In cents
  total_invoices INTEGER NOT NULL DEFAULT 0,
  total_publishers INTEGER NOT NULL DEFAULT 0,
  
  -- Processing
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, processing, completed, failed
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP,
  
  -- External References
  external_batch_id VARCHAR(255), -- Reference from payment processor
  external_transaction_ids JSONB, -- Array of external transaction IDs
  
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_publisher_payment_profiles_publisher_id ON publisher_payment_profiles(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_invoices_publisher_id ON publisher_invoices(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_invoices_status ON publisher_invoices(status);
CREATE INDEX IF NOT EXISTS idx_publisher_invoices_created_at ON publisher_invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_publisher_earnings_publisher_id ON publisher_earnings(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_earnings_status ON publisher_earnings(status);
CREATE INDEX IF NOT EXISTS idx_publisher_earnings_created_at ON publisher_earnings(created_at);

-- Comments for Documentation
COMMENT ON TABLE publisher_payment_profiles IS 'Publisher payment method preferences and tax information';
COMMENT ON TABLE publisher_invoices IS 'Manual invoices submitted by publishers for review and payment';
COMMENT ON TABLE publisher_earnings IS 'Automatic earnings tracking from completed orders';
COMMENT ON TABLE publisher_payment_batches IS 'Bulk payment processing batches';

COMMENT ON COLUMN publisher_invoices.status IS 'pending: awaiting review, under_review: being reviewed, approved: ready for payment, rejected: denied, paid: payment completed';
COMMENT ON COLUMN publisher_earnings.status IS 'pending: order completed but not confirmed, confirmed: ready for payment, invoiced: included in invoice, paid: payment sent';