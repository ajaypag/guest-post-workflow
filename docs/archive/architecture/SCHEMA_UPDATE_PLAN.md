# Schema Update Plan for Unified Order System

## Overview
Update existing order schema to support both single and multi-client orders seamlessly, with full site review capabilities.

## Current Schema Analysis

### What We Keep:
- `orders` table structure (minus clientId)
- `orderItems` for final link placements
- Status tracking and pricing
- Share tokens
- Order history

### What We Add:
- `order_groups` - Client segments within orders
- `order_site_selections` - Site review mechanism
- Bulk analysis integration
- State machine for order flow

### What We Modify:
- Remove `clientId` from orders (move to groups)
- Update `orderItems` to link to selections
- Add state tracking to orders

## Schema Changes

### 1. Modify Orders Table
```sql
-- Remove direct client reference (will be in groups)
ALTER TABLE orders DROP COLUMN client_id;

-- Add state machine
ALTER TABLE orders ADD COLUMN state VARCHAR(50) DEFAULT 'configuring';
-- States: configuring → analyzing → reviewing → payment_pending → in_progress → completed

-- Add review preferences
ALTER TABLE orders ADD COLUMN requires_client_review BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN review_completed_at TIMESTAMP;
```

### 2. Create Order Groups Table
```sql
CREATE TABLE order_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  
  -- Configuration
  link_count INTEGER NOT NULL,
  target_pages JSONB DEFAULT '[]', -- Array of {url, pageId}
  anchor_texts JSONB DEFAULT '[]', -- Array of preferred anchors
  requirement_overrides JSONB DEFAULT '{}', -- Override client defaults
  
  -- Analysis link
  bulk_analysis_project_id UUID REFERENCES bulk_analysis_projects(id),
  analysis_started_at TIMESTAMP,
  analysis_completed_at TIMESTAMP,
  
  -- Status
  group_status VARCHAR(50) DEFAULT 'pending',
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_order_groups_order (order_id),
  INDEX idx_order_groups_client (client_id),
  INDEX idx_order_groups_analysis (bulk_analysis_project_id)
);
```

### 3. Create Site Selections Table
```sql
CREATE TABLE order_site_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id),
  
  -- Selection details
  status VARCHAR(50) NOT NULL DEFAULT 'suggested',
  -- Statuses: suggested, approved, rejected, alternate
  
  -- Assignment (once approved)
  target_page_url TEXT,
  anchor_text VARCHAR(255),
  
  -- Review tracking
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  client_notes TEXT,
  internal_notes TEXT,
  
  -- Becomes order_item when approved
  order_item_id UUID REFERENCES order_items(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_selections_group (order_group_id),
  INDEX idx_selections_status (status),
  INDEX idx_selections_domain (domain_id)
);
```

### 4. Update Order Items Table
```sql
-- Add link to selection that created this item
ALTER TABLE order_items ADD COLUMN site_selection_id UUID REFERENCES order_site_selections(id);

-- Add group reference for easier queries
ALTER TABLE order_items ADD COLUMN order_group_id UUID REFERENCES order_groups(id);

-- These now track final placements only (after review/approval)
```

## Data Flow

### Single Client Order:
```
Order created
└── 1 order_group created
    └── Bulk analysis runs
        └── 20 sites analyzed → 5 suggested selections
            └── Client approves 2 → 2 order_items → 2 workflows
```

### Multi-Client Order:
```
Order created
├── Group A (Client A, 2 links)
│   └── Analysis A → Selections A → 2 order_items
└── Group B (Client B, 3 links)
    └── Analysis B → Selections B → 3 order_items
    
Total: 5 order_items → 5 workflows
```

## Migration Strategy

### For Existing Orders:
```sql
-- Create a default group for each existing order
INSERT INTO order_groups (order_id, client_id, link_count)
SELECT id, client_id, 
  (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id)
FROM orders;

-- Link existing order_items to the default group
UPDATE order_items oi
SET order_group_id = (
  SELECT id FROM order_groups 
  WHERE order_id = oi.order_id
);
```

## API Updates

### Order Creation
```typescript
// Supports both single and multi
createOrder({
  groups: [
    { clientId, linkCount, targetPages }
  ]
})
```

### Site Review
```typescript
// Get all available sites for a group
GET /api/orders/[orderId]/groups/[groupId]/sites
Returns: suggested[], available[], rejected[]

// Update selections
POST /api/orders/[orderId]/groups/[groupId]/review
Body: { selections: [...] }
```

## Benefits

1. **Backward Compatible** - Existing single-client logic works
2. **Forward Thinking** - Multi-client is first-class
3. **Flexible Review** - Full transparency into all analyzed sites
4. **Clean Workflow** - Each placement = one workflow
5. **Unified API** - Same endpoints for both modes