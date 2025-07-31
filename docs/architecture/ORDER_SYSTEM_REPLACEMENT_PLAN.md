# Order System Replacement Plan

## Overview
Complete replacement of the current simple order system (`OrdersTableSimple.tsx`) with a new order-centric architecture supporting multi-client orders, full site transparency, and share tokens for sales.

## Current System Problems
- `OrdersTableSimple.tsx` has basic order display but no multi-client support
- Orders exist but disconnected from bulk analysis projects  
- No site selection/review mechanism for accounts
- No share tokens for sales process
- No order groups for multi-client orders

## Implementation Phases

### Phase 1: New Schema Implementation ✅ IN PROGRESS

**1. Create `order_groups` table**
- Links orders to clients with specific requirements
- Enables multi-client orders (Agency: 2 clients, 5 total links)
- Connects to bulk analysis projects per client group

**2. Create `order_site_selections` table**
- Tracks which domains accounts can choose from
- Supports full transparency - accounts see ALL analyzed sites
- Enables swapping suggested sites with alternatives

**3. Create `order_share_tokens` table**
- Share links for sales process
- Time-limited access for prospects
- Conversion tracking

**4. Update existing `orders` table**
- Add `state` column (draft, pending_review, in_progress, completed)
- Add `requires_client_review` boolean
- Remove single `analysis_project_id` (replaced by order_groups)

### Phase 2: Replace OrdersTableSimple.tsx

**Current:** Simple table showing order basics (ID, account, status, value)
**Replace with:** Order-centric dashboard supporting:

```typescript
// New OrdersTable.tsx structure
interface OrderWithGroups {
  id: string;
  state: 'draft' | 'pending_review' | 'in_progress' | 'completed';
  totalLinks: number;
  groups: Array<{
    client: { name: string; website: string };
    linkCount: number;
    bulkAnalysisStatus: 'pending' | 'analyzing' | 'ready_for_review';
    siteSelections: number; // approved sites
    workflows: Array<{ status: string; site: string }>;
  }>;
}
```

### Phase 3: Build Account Experience UI

**Route Structure:**
- `/account/orders` - Account's orders list
- `/account/orders/[id]` - Order details with groups
- `/account/orders/[id]/groups/[groupId]/sites` - Site review interface
- `/share/order/[token]` - Public order preview

**Key Components:**
1. **MultiClientOrderView** - Show all client groups in one order
2. **SiteReviewInterface** - Browse ALL analyzed sites, not just suggested
3. **OrderProgressTracking** - Workflow status per site placement
4. **ShareOrderPreview** - Public view for sales process

### Phase 4: API Updates

**New Endpoints:**
- `GET /api/account/orders/[id]` - Multi-client order view
- `GET /api/account/orders/[id]/groups/[groupId]/available-sites` - ALL analyzed domains
- `POST /api/account/orders/[id]/groups/[groupId]/review-sites` - Site selections
- `POST /api/orders/[id]/share` - Generate share tokens

## Implementation Priority

1. **Schema tables** (order_groups, order_site_selections, order_share_tokens) - CURRENT
2. **Order state management** (draft → review → progress → completed)
3. **Multi-client support** (order groups with separate analysis projects)
4. **Site review interface** (full transparency, browse all analyzed sites)
5. **Share tokens** (sales process support)

## Key Benefits

1. **Efficiency**: Multi-client orders save agencies time (10 clients, 1 checkout)
2. **Full Transparency**: Browse all analyzed sites, not just pre-selected
3. **Sales Advantage**: "See your content being created" + pick your own sites
4. **Flexibility**: Not locked into system suggestions
5. **Clean Separation**: Operations vs order management

## Notes

- No existing production orders to migrate (only test data)
- This replaces the simple order table with a comprehensive order-centric platform
- Supports the core vision: multi-client orders with full site analysis transparency
- Read `ORDER_SCHEMA_DESIGN.md` for detailed schema specifications