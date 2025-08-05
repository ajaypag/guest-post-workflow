-- Add Chatwoot conversation tracking to order items
ALTER TABLE guest_post_items
ADD COLUMN IF NOT EXISTS chatwoot_conversation_id INTEGER,
ADD COLUMN IF NOT EXISTS has_publisher_response BOOLEAN DEFAULT FALSE;

-- Create index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_guest_post_items_chatwoot_conversation_id 
ON guest_post_items(chatwoot_conversation_id);

-- Create order communications log table
CREATE TABLE IF NOT EXISTS order_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES guest_post_items(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- email_sent, email_reply, internal_note, status_update
  direction VARCHAR(20) NOT NULL, -- incoming, outgoing
  chatwoot_conversation_id INTEGER,
  chatwoot_message_id INTEGER,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_order_communications_order_id ON order_communications(order_id);
CREATE INDEX idx_order_communications_order_item_id ON order_communications(order_item_id);
CREATE INDEX idx_order_communications_type ON order_communications(type);
CREATE INDEX idx_order_communications_created_at ON order_communications(created_at DESC);

-- Create workflow email logs table
CREATE TABLE IF NOT EXISTS workflow_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES guest_post_items(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR(50) NOT NULL, -- sent, failed, bounced, replied
  chatwoot_conversation_id INTEGER,
  chatwoot_message_id INTEGER,
  error_message TEXT,
  sent_at TIMESTAMP,
  replied_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_workflow_email_logs_workflow_id ON workflow_email_logs(workflow_id);
CREATE INDEX idx_workflow_email_logs_status ON workflow_email_logs(status);
CREATE INDEX idx_workflow_email_logs_sent_at ON workflow_email_logs(sent_at);

-- Add Chatwoot contact IDs to accounts and websites
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS chatwoot_contact_id INTEGER;

ALTER TABLE websites
ADD COLUMN IF NOT EXISTS chatwoot_contact_id INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_chatwoot_contact_id ON accounts(chatwoot_contact_id);
CREATE INDEX IF NOT EXISTS idx_websites_chatwoot_contact_id ON websites(chatwoot_contact_id);