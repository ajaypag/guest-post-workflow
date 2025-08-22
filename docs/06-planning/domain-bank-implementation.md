# Domain Bank Implementation Plan

## Overview
Build a single, flexible domain bank view that serves as the unified interface for all qualified domains across clients and projects.

## Phase 1: MVP - Read-Only View with User Actions
**Goal**: Get a working domain bank view deployed quickly

### 1.1 Database Schema Addition
Add user curation fields to `bulk_analysis_domains`:
```sql
ALTER TABLE bulk_analysis_domains 
ADD COLUMN user_bookmarked BOOLEAN DEFAULT FALSE,
ADD COLUMN user_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN user_bookmarked_at TIMESTAMP,
ADD COLUMN user_hidden_at TIMESTAMP,
ADD COLUMN user_bookmarked_by UUID REFERENCES users(id),
ADD COLUMN user_hidden_by UUID REFERENCES users(id);
```

### 1.2 Basic API Endpoint
**File**: `/app/api/domain-bank/route.ts`

```typescript
GET /api/domain-bank
  ?clientId=abc,def  // Optional - filter by client(s)
  ?projectId=123     // Optional - filter by project
  ?status=qualified  // Filter by qualification status
  ?available=true    // Filter by availability
  ?view=all          // 'all', 'bookmarked', 'hidden'
  ?page=1&limit=50   // Pagination
```

**Query Logic**:
- Fetch from `bulk_analysis_domains`
- LEFT JOIN `websites` for metrics
- LEFT JOIN `order_line_items` for availability
- LEFT JOIN `clients` for client names
- LEFT JOIN `bulk_analysis_projects` for project names
- Support multi-client filtering for agencies

### 1.3 User Action API
**File**: `/app/api/domain-bank/[domainId]/route.ts`

```typescript
PATCH /api/domain-bank/[domainId]
Body: {
  action: 'bookmark' | 'unbookmark' | 'hide' | 'unhide'
}
```

### 1.4 Basic UI Component
**File**: `/app/domain-bank/page.tsx`

Features:
- Server component with initial data fetch
- Client filter dropdown (context-aware default)
- View filter: [All] [Bookmarked] [Hidden]
- Basic table with:
  - Domain name (⭐ for bookmarked)
  - Client (if showing multiple)
  - DR/Traffic/Price (when available)
  - Qualification status
  - Availability status
  - Quick actions: [⭐] [×] (bookmark/hide)
- Search and basic filters
- Pagination
- Status bar: "Showing 247 (23 bookmarked, 15 hidden)"

### 1.3 Navigation Integration
- Add to main nav: "Domain Bank"
- Add to client pages: "View Domain Bank" (pre-filtered)
- Add to project pages: Link to domain bank

## Phase 2: Interactivity
**Goal**: Enable selection and basic actions

### 2.1 Selection System
- Checkbox multi-select
- Selection summary bar
- Bulk select helpers (all, none, qualified only)

### 2.2 Order Integration
- "Add to Order" dropdown (lists active orders)
- "Create New Order" button
- Pass selections to order creation flow

### 2.3 Context Menu
- Right-click on domains for quick actions
- View full analysis
- Copy domain
- Open in new tab

## Phase 3: Advanced Features
**Goal**: Full-featured domain management

### 3.1 Advanced Filtering
- Multi-select filters for all fields
- Saved filter sets
- Filter by date ranges
- Complex queries (AND/OR)

### 3.2 Real-time Updates
- WebSocket for live availability updates
- Auto-refresh metrics from APIs
- Show "updating" states

### 3.3 Bulk Operations
- Export to CSV/Excel
- Bulk status updates
- Bulk re-qualification
- Move between projects

## Technical Stack

### Frontend
- Next.js App Router
- Server Components for initial load
- Client Components for interactivity
- Tailwind CSS for styling
- React Query for data fetching
- Zustand for selection state

### Backend
- PostgreSQL with existing schema
- Drizzle ORM for queries
- Edge runtime for API routes
- Redis for caching (later)

### Key Components
```
/app/domain-bank/
  ├── page.tsx                 // Main page (server component)
  ├── DomainBankTable.tsx      // Client component for table
  ├── DomainFilters.tsx        // Filter sidebar
  ├── DomainSelectionBar.tsx   // Selection actions
  └── hooks/
      ├── useDomainSelection.ts
      └── useDomainFilters.ts
```

## Data Flow

1. **Initial Load** (Server):
   - Get user session
   - Determine client context
   - Fetch initial data with filters
   - Render table

2. **Filter Change** (Client):
   - Update URL params
   - Fetch filtered data
   - Update table

3. **Selection** (Client):
   - Track in local state
   - Show selection bar
   - Enable bulk actions

4. **Action** (Client → Server):
   - Send selected IDs
   - Perform action
   - Update UI

## Permissions

### Internal Users
- See all clients
- See all domains
- Access all actions
- See wholesale prices

### Agency Users
- See their clients only
- Client filter shows their clients
- Can create orders for any of their clients

### Single Client Users
- See only their client
- Client filter hidden/disabled
- Limited actions

## Migration Strategy

No database changes needed! Just:
1. Deploy API endpoint
2. Deploy UI component
3. Add navigation links
4. Test with small group
5. Roll out to all users

## Success Metrics

- **Adoption**: % of users accessing domain bank weekly
- **Efficiency**: Time to create order (before vs after)
- **Discovery**: Domains used that weren't in active project
- **Reuse**: Same domain used across multiple orders

## Timeline

- **Week 1**: Phase 1 (MVP)
  - Day 1-2: API endpoint
  - Day 3-4: Basic UI
  - Day 5: Testing & deployment

- **Week 2**: Phase 2 (Interactivity)
  - Day 1-2: Selection system
  - Day 3-4: Order integration
  - Day 5: Testing

- **Week 3+**: Phase 3 (Advanced)
  - Gradual feature rollout

## Next Steps

1. Create API endpoint (`/app/api/domain-bank/route.ts`)
2. Create basic UI page (`/app/domain-bank/page.tsx`)
3. Add to navigation
4. Test with internal team
5. Iterate based on feedback