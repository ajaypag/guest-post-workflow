-- Add refunds table
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
);

-- Add indexes
CREATE UNIQUE INDEX idx_refunds_stripe_id ON refunds(stripe_refund_id);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_order ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- Add refund columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS partial_refund_amount INTEGER;

-- Add comments
COMMENT ON TABLE refunds IS 'Tracks all refunds processed for orders';
COMMENT ON COLUMN refunds.amount IS 'Refund amount in cents';
COMMENT ON COLUMN refunds.status IS 'Refund status: pending, succeeded, failed, canceled';
COMMENT ON COLUMN refunds.reason IS 'Refund reason: duplicate, fraudulent, requested_by_customer, other';
COMMENT ON COLUMN orders.partial_refund_amount IS 'Total amount refunded for partial refunds';
COMMENT ON COLUMN orders.refunded_at IS 'Timestamp when order was fully refunded';