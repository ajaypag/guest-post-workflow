-- Add stripe_payment_intent_id to payments table for refund support
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Add comment
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe Payment Intent ID for refund processing';