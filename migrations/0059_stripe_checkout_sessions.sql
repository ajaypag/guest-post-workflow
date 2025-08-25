-- Migration: Add Stripe Checkout Sessions support
-- Date: 2025-01-24
-- Purpose: Add table to track Stripe Checkout Sessions for migration from Elements to Checkout

-- Create the stripe_checkout_sessions table
CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Stripe session identifiers
    stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL, -- open, complete, expired
    mode VARCHAR(20) NOT NULL DEFAULT 'payment', -- payment, subscription, setup
    
    -- URLs for redirects
    success_url TEXT NOT NULL,
    cancel_url TEXT NOT NULL,
    
    -- Customer details
    customer_email VARCHAR(255),
    
    -- Payment details  
    payment_intent_id VARCHAR(255), -- Links to payment intent when completed
    amount_total INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Metadata and tracking
    metadata JSONB,
    
    -- Expiration and timestamps
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP -- When session was completed
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_order_id ON stripe_checkout_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe_id ON stripe_checkout_sessions(stripe_session_id);  
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON stripe_checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires_at ON stripe_checkout_sessions(expires_at);

-- Add comment for documentation
COMMENT ON TABLE stripe_checkout_sessions IS 'Tracks Stripe Checkout Sessions for hosted payment processing';