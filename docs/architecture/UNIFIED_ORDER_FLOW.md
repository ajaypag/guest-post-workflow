# Unified Order Flow Design

## Core Principle
One flexible order system that scales from simple (1 client, 5 links) to complex (10 clients, 50 links) without feeling overwhelming.

## Order Flow Steps

### 1. Order Creation
```
User clicks "New Order"
└── System asks: "How many clients for this order?"
    ├── [1 client] → Simple flow (most common)
    └── [Multiple] → Power user flow
```

### 2. Simple Flow (Single Client)
```
Select Client → Set Link Count → Configure Requirements
                                          ↓
                              System runs bulk analysis
                                          ↓
                              Review sites (optional)
                                          ↓
                                    Checkout
```

**User Experience:**
- Feels like current single-client flow
- No mention of "groups" or complex concepts
- Just pick client, set links, go

### 2. Power User Flow (Multi-Client)
```
Add Client A (2 links) → Add Client B (3 links) → Add more...
                    ↓
        System runs separate analysis per client
                    ↓
        Review sites per client group (optional)
                    ↓
              Single checkout for all
```

**User Experience:**
- "Add another client" button
- Each client configured independently
- One payment for everything

## Database Design (Supports Both)

```sql
-- Orders table stays mostly the same
orders (
  id,
  account_id,  -- renamed from advertiser_id
  status,
  total_amount,
  -- Remove client_id (moved to groups)
)

-- Order groups (always used, even for single client)
order_groups (
  id,
  order_id,
  client_id,
  link_count,
  bulk_analysis_project_id,
  -- Single client order = 1 group
  -- Multi-client order = multiple groups
)

-- Site selections (per group)
order_site_selections (
  id,
  order_group_id,
  domain_id,
  status,  -- suggested, approved, rejected, alternate
  target_page,
  anchor_text,
)
```

## UI Design Principles

### For Single Client Orders:
- Hide complexity
- Don't mention "groups"
- Streamlined 3-step process

### For Multi-Client Orders:
- Progressive disclosure
- "Add another client" reveals more sections
- Clear visual separation per client

## Site Review Interface

### Single Client View:
```
Your Sites (20 analyzed)
├── Suggested (5)
│   ├── ✓ example.com - DR: 45
│   └── ✓ site.com - DR: 50
└── More Options (15)
    ├── other.com - DR: 40
    └── [Browse all...]
```

### Multi-Client View:
```
Client A - 2 links needed
├── Suggested Sites (5 of 20 analyzed)
└── [Browse all 20 sites]

Client B - 3 links needed
├── Suggested Sites (7 of 25 analyzed)
└── [Browse all 25 sites]
```

## API Design

### Create Order (Works for Both)
```typescript
POST /api/orders/create
{
  groups: [
    {
      clientId: "123",
      linkCount: 2,
      requirements: {...}  // Optional overrides
    }
    // Single client = 1 group
    // Multi-client = multiple groups
  ]
}
```

### Get Order (Unified Response)
```typescript
GET /api/orders/[id]
{
  id: "order-123",
  totalLinks: 2,  // Sum across all groups
  groups: [
    {
      client: { name: "Client A" },
      linkCount: 2,
      siteAnalysis: { total: 20, suggested: 5 },
      selections: [...]
    }
  ]
}
```

## Workflow Creation

Always creates workflows per link placement:
- Single client with 2 links = 2 workflows
- Multi-client (A: 2 links, B: 3 links) = 5 workflows

Each workflow tracks:
- Which client
- Which target page
- Which domain
- Which anchor text

## Benefits

1. **Intuitive for Everyone**
   - Simple orders feel simple
   - Complex orders feel manageable

2. **No Feature Walls**
   - Single-client users never see multi-client complexity
   - Power users get advanced features when needed

3. **Consistent Data Model**
   - Same tables/APIs for both
   - Single client is just multi-client with 1 group

4. **Future Proof**
   - Easy to add more features
   - Scales with user needs

## Implementation Priority

1. Build the unified schema (supports both from day 1)
2. Create simple single-client UI first
3. Add multi-client UI as progressive enhancement
4. Same backend handles both seamlessly

This design treats multi-client as the general case and single-client as the optimized common case, but users only see the complexity they need.