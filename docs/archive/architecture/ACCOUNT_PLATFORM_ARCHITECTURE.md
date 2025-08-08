# PostFlow Account Platform Architecture

## Overview
PostFlow is an order fulfillment platform, NOT a multi-tenant SaaS. We maintain clear separation between internal operations and account-facing features.

## Core Concepts

### Two User Types
1. **Internal Team (Users)**
   - Full operational access
   - Create bulk analysis, workflows, manage fulfillment
   - See all data across all clients
   - Login via `/login`

2. **Accounts (Currently Advertisers)**
   - Order placement and tracking
   - Curated visibility into fulfillment process
   - See only their order-related data
   - Login via `/account/login` (renamed from `/advertiser/login`)

### Key Principle: Selective Transparency
Accounts get "behind the curtain" visibility as a selling point, but with:
- Read-only access to relevant data
- Hidden operational complexity
- No creation/editing capabilities for operational tools

## What Accounts See

### Order-Centric View
Everything is accessed through their orders, supporting multi-client bundles:

```
Order #123 (Multi-Client)
├── Client A Group (2 links)
│   ├── Site Analysis (20 domains analyzed)
│   ├── Site Review (pick from ALL 20)
│   └── 2 Workflows (1 per link)
├── Client B Group (3 links)
│   ├── Site Analysis (25 domains analyzed)
│   ├── Site Review (pick from ALL 25)
│   └── 3 Workflows (1 per link)
└── Total: 5 link placements across 2 clients
```

### Specific Visibility by Stage

**Order Configuration**: FULL ACCESS
- Set number of links
- Choose target pages from their clients
- Specify anchor text preferences
- Define site requirements

**Site Analysis**: FULL TRANSPARENCY
- See ALL domains analyzed (not just suggested)
- Browse complete results to pick alternatives
- View quality metrics (DR, traffic) for all
- Full categorization visibility
- HIDDEN: Internal costs and scoring algorithms

**Workflow Progress**: READ-ONLY TRACKING
- Current status per site
- Content preview when available
- Estimated completion
- HIDDEN: AI agents, internal tools, team assignments

## What Internal Team Sees
- Everything - full operational access
- All bulk analysis projects
- All workflows across all clients
- All accounts and their orders
- System administration

## Implementation Approach

### 1. Component Reuse with Permissions
```typescript
// Same component, different view based on user type
{session.userType === 'internal' && <CreateButton />}
{session.userType === 'account' && <ReadOnlyBadge />}
```

### 2. API-Level Filtering
- Accounts only see data related to their orders
- Internal users see everything
- No special account flags - just userType checking

### 3. Route Structure

**Internal Routes** (`/app/*`):
- `/app/bulk-analysis` - Create/manage all projects
- `/app/workflows` - All workflows across accounts
- `/app/orders` - Manage all orders

**Account Routes** (`/account/*`):
- `/account/orders` - Their orders only
- `/account/orders/[id]/sites` - Site analysis for specific order
- `/account/orders/[id]/progress` - Workflow tracking
- `/account/clients` - Manage their clients/targets

**Share Routes** (`/share/*`):
- `/share/order/[token]` - Public order preview for sales

## Benefits of This Architecture

1. **Efficiency**: Multi-client orders save agencies time (10 clients, 1 checkout)
2. **Full Transparency**: Browse all analyzed sites, not just pre-selected
3. **Sales Advantage**: "See your content being created" + pick your own sites
4. **Flexibility**: Not locked into system suggestions
5. **Clean Separation**: Operations vs order management
6. **True Dogfooding**: OutreachLabs as an account uses same interface

## What This Is NOT

- NOT a multi-tenant system where users switch contexts
- NOT exposing full operational tools to accounts
- NOT treating OutreachLabs differently (no special flags)
- NOT duplicating functionality for different user types

## Migration Path

### Phase 1: Database Structure
1. Rename advertisers → accounts
2. Add order state tracking
3. Create order_site_selections table
4. Add share_tokens table

### Phase 2: Order-Centric Refactor
1. Create order_groups table for multi-client support
2. Link bulk_analysis_projects to order_groups (not orders)
3. Link workflows to individual site_selections
4. Implement flexible site review with full browsing
5. Add client-level default requirements

### Phase 3: Account Experience
1. Build order-centric UI
2. Implement site review flow
3. Add progress tracking
4. Enable share links for sales

### Phase 4: Launch
1. Create OutreachLabs account
2. Migrate existing advertiser data
3. Test all three use cases
4. Deploy with rollback plan