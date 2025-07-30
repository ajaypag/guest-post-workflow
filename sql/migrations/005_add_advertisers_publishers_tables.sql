-- Migration: Add advertisers and publishers tables
-- Date: 2025-01-30
-- Purpose: Create separate tables for external users (advertisers and publishers)

-- Create advertisers table
CREATE TABLE IF NOT EXISTS advertisers (
  id UUID PRIMARY KEY,
  
  -- Authentication fields
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  
  -- Profile information
  contact_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Business information
  tax_id VARCHAR(100),
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_zip VARCHAR(20),
  billing_country VARCHAR(100),
  
  -- Payment terms
  credit_terms VARCHAR(50) DEFAULT 'prepay',
  credit_limit BIGINT DEFAULT 0,
  
  -- Relationship to internal client
  primary_client_id UUID REFERENCES clients(id),
  
  -- Account status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  
  -- Password reset
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  
  -- Notes and preferences
  internal_notes TEXT,
  order_preferences TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Create indexes for advertisers
CREATE UNIQUE INDEX idx_advertisers_email ON advertisers(email);
CREATE INDEX idx_advertisers_status ON advertisers(status);
CREATE INDEX idx_advertisers_client ON advertisers(primary_client_id);

-- Create publishers table
CREATE TABLE IF NOT EXISTS publishers (
  id UUID PRIMARY KEY,
  
  -- Authentication fields
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  
  -- Profile information
  contact_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  
  -- Business information
  tax_id VARCHAR(100),
  payment_email VARCHAR(255),
  payment_method VARCHAR(50) DEFAULT 'paypal',
  
  -- Banking info (encrypted)
  bank_name VARCHAR(255),
  bank_account_number VARCHAR(255),
  bank_routing_number VARCHAR(255),
  
  -- Commission settings
  commission_rate INTEGER DEFAULT 40,
  minimum_payout BIGINT DEFAULT 10000,
  
  -- Account status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  
  -- Password reset
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  
  -- Content guidelines
  content_guidelines TEXT,
  prohibited_topics TEXT,
  turnaround_time INTEGER DEFAULT 7,
  
  -- Notes
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Create indexes for publishers
CREATE UNIQUE INDEX idx_publishers_email ON publishers(email);
CREATE INDEX idx_publishers_status ON publishers(status);

-- Create publisher_websites link table
CREATE TABLE IF NOT EXISTS publisher_websites (
  id UUID PRIMARY KEY,
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  website_id UUID NOT NULL,
  
  -- Permissions
  can_edit_pricing BOOLEAN DEFAULT true,
  can_edit_availability BOOLEAN DEFAULT true,
  can_view_analytics BOOLEAN DEFAULT true,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  
  -- Timestamps
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMP
);

-- Create indexes for publisher_websites
CREATE INDEX idx_publisher_websites_publisher ON publisher_websites(publisher_id);
CREATE INDEX idx_publisher_websites_website ON publisher_websites(website_id);
CREATE UNIQUE INDEX idx_publisher_website_unique ON publisher_websites(publisher_id, website_id);

-- Add advertiser_id column to orders table (for future migration)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advertiser_id UUID REFERENCES advertisers(id);

-- Create index on orders.advertiser_id
CREATE INDEX IF NOT EXISTS idx_orders_advertiser ON orders(advertiser_id);