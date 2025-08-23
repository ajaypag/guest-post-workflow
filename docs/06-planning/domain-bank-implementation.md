# Domain Bank Implementation Plan

## Current Status Overview

### ✅ Completed Features (Vetted Sites Foundation)

#### Page Structure
- [x] `/app/vetted-sites/page.tsx` - Main server component with data fetching
- [x] `/app/vetted-sites/components/VettedSitesTable.tsx` - Client-side table component
- [x] `/app/vetted-sites/components/VettedSitesFilters.tsx` - Filter sidebar component
- [x] `/app/vetted-sites/VettedSitesWrapper.tsx` - Layout wrapper

#### Core Functionality
- [x] Unified view of all qualified domains from `bulk_analysis_domains` table
- [x] Server-side data fetching with proper permissions
- [x] Client/Account filtering for internal users
- [x] Account user access (external users see their domains)
- [x] Quality status filtering (high_quality, good_quality, marginal_quality)
- [x] Search functionality across domain names
- [x] DR (Domain Rating) range filtering
- [x] Traffic range filtering
- [x] Bookmarking domains (user_bookmarked field)
- [x] Hiding domains (user_hidden field)
- [x] Wide screen optimization (up to 1920px)
- [x] Responsive design with breakpoints

#### Data Display
- [x] Qualification score with DR and traffic
- [x] Evidence display (keyword counts, positions)
- [x] Target match information
- [x] Pricing display (retail for external, wholesale for internal)
- [x] Expandable row details with full analysis
- [x] Vetting context (original target URLs and keywords)
- [x] Publisher performance metrics
- [x] Data quality indicators

#### Technical Implementation
- [x] URL-based filtering (searchParams)
- [x] Real-time filter updates with page refresh
- [x] Proper TypeScript types
- [x] Database queries with Drizzle ORM
- [x] JWT authentication integration

### 🚧 In Progress

- [ ] Selection UI (checkboxes)
- [ ] Export functionality

### ❌ Not Started (Pending Features)

#### Selection & Cart System
- [ ] Multi-select checkboxes on each row
- [ ] Selection persistence (session/local storage)
- [ ] Selection summary bar
- [ ] Bulk actions menu
- [ ] Shopping cart implementation

#### Order Integration
- [ ] "Create Quick Order" from selection
- [ ] "Add to Existing Order" functionality
- [ ] Order line item generation
- [ ] Target URL context preservation
- [ ] Pricing calculation at order creation

#### Advanced Features
- [ ] Domain reservation system
- [ ] Availability tracking (used/available)
- [ ] Export to CSV/Excel
- [ ] Collaborative selection
- [ ] Package/bulk pricing rules

## Detailed Implementation Plan

### Phase 1: Selection Infrastructure (3-4 days)

#### Task 1.0: Pre-Implementation Database & Type Analysis
**Actions:**
```bash
# Check existing domain data structure
- Query bulk_analysis_domains table schema
- Verify targetPageIds field type and contents
- Check order_line_items structure for integration points
- Document actual price fields and calculations
- Review existing Domain interface in VettedSitesTable.tsx
```

#### Task 1.1: Add Selection State Management
**File: `/app/vetted-sites/hooks/useSelection.ts`** (NEW)
```typescript
PREREQ: Verify Domain type from VettedSitesTable.tsx
- Create custom hook for selection state
- Use Map<domainId, selectionData> for O(1) lookups
- Include: domainId, domain, price, targetPageIds, clientId
- Match exact types from existing Domain interface
- Persist to sessionStorage on change
- Restore from sessionStorage on mount
- Export selection utilities (add, remove, clear, toggle)
- Run npx tsc --noEmit after creation
```

#### Task 1.2: Update Table Component with Checkboxes
**File: `/app/vetted-sites/components/VettedSitesTable.tsx`**
```typescript
- Import useSelection hook
- Add checkbox column (first column)
- Add "select all" checkbox in header
- Handle individual row selection
- Show selected state visually (highlight row)
- Disable selection for unavailable domains
VALIDATION: Run npx tsc --noEmit after changes
```

#### Task 1.3: Create Selection Summary Component
**File: `/app/vetted-sites/components/SelectionSummary.tsx`** (NEW)
```typescript
- Sticky bottom bar (or floating)
- Show: "X domains selected • Total: $Y"
- Actions: Clear Selection, Export, Create Order
- Collapsible list of selected domains
- Remove individual items from selection
VALIDATION: Ensure price calculations match EnhancedOrderPricingService logic
```

#### Task 1.4: Integrate Selection Summary
**File: `/app/vetted-sites/page.tsx`**
```typescript
- Import and render SelectionSummary
- Position at bottom of viewport
- Pass selection data and callbacks
VALIDATION: Full TypeScript check - npm run build (with timeout)
```

#### Task 1.5: Mid-Phase Validation
**Actions:**
```bash
- Run full TypeScript compilation
- Test selection persistence in browser
- Verify sessionStorage data structure
- Check for console errors
- Fix any type mismatches before proceeding
```

### Phase 2: Export Functionality (2 days)

#### Task 2.0: Pre-Export Database Analysis
**Actions:**
```bash
# Understand what data to export
- Query sample bulk_analysis_domains with all joins
- List all fields that should be exportable
- Check data types for CSV conversion (JSONB fields)
- Verify pricing calculations from EnhancedOrderPricingService
- Test query performance with 500+ domains
```

#### Task 2.1: Create Export API Route
**File: `/app/api/vetted-sites/export/route.ts`** (NEW)
```typescript
PREREQ: Test the exact SQL query with joins first
- Accept array of domain IDs
- Fetch full domain data with proper joins (clients, websites, targetPages)
- Handle JSONB fields (evidence, targetMatchData) properly
- Generate CSV with all fields
- Return as downloadable file with proper headers
- Add rate limiting
VALIDATION: Test with Postman/curl before UI integration
```

#### Task 2.2: Add Export UI
**File: `/app/vetted-sites/components/ExportModal.tsx`** (NEW)
```typescript
- Modal with export options
- Format selection (CSV, Excel, JSON)
- Field selection checkboxes
- Include qualification data toggle
- Include pricing toggle
- Email option
```

#### Task 2.3: Connect Export to Selection
**File: `/app/vetted-sites/components/SelectionSummary.tsx`**
```typescript
- Add Export button
- Open ExportModal on click
- Handle export API call
- Show loading/success states
```

### Phase 3: Order Creation - Quick Order (4-5 days)

#### Task 3.0: Pre-Order Integration Analysis
**Actions:**
```bash
# Understand existing order system
- Review orders table schema and required fields
- Review order_line_items table structure
- Check existing order creation flow at /api/orders/route.ts
- Understand orderLineItems vs guestPostItems (legacy)
- Map bulk_analysis_domains fields to order_line_items fields
- Verify pricing service integration points
- Check order status workflow (draft, pending, confirmed)
```

#### Task 3.1: Create Quick Order API
**File: `/app/api/orders/quick-create/route.ts`** (NEW)
```typescript
PREREQ: Analyze existing order creation in /api/orders/route.ts
POST endpoint accepting:
{
  domainAnalysisIds: string[],
  clientId: string,
  orderName?: string,
  notes?: string
}

Logic:
- Validate user can create orders for client (check session)
- Fetch domain analysis data with targetPages join
- Group domains by target URL
- Create order with status: 'draft' and proper defaults
- Create order_line_items matching existing schema:
  - assignedDomain (from bulk_analysis_domains.domain)
  - targetUrl (from targetPages.url) 
  - keywords (from targetPages.keywords)
  - metadata (preserve qualification data)
- Use EnhancedOrderPricingService.getWebsitePrice()
- Return order ID
VALIDATION: Test transaction rollback on failure
```

#### Task 3.2: Create Order Creation Modal
**File: `/app/vetted-sites/components/CreateOrderModal.tsx`** (NEW)
```typescript
- Modal with minimal form
- Order name (auto-generated default)
- Due date picker (optional)
- Special instructions (optional)
- Show selected domains list
- Total price calculation
- Confirm/Cancel buttons
```

#### Task 3.3: Fetch Required Order Data
**File: `/app/vetted-sites/utils/orderHelpers.ts`** (NEW)
```typescript
- getTargetPagesForDomains()
- calculateOrderPricing()
- validateDomainAvailability()
- generateOrderName()
- prepareLineItemsData()
```

#### Task 3.4: Connect Quick Order Flow
**File: `/app/vetted-sites/components/SelectionSummary.tsx`**
```typescript
- Add "Create Order" button
- Open CreateOrderModal
- Handle order creation API call
- Show success message
- Redirect to order page
- Clear selection after success
VALIDATION: End-to-end test of full flow
```

#### Task 3.5: Phase 3 Complete Validation
**Actions:**
```bash
- Full TypeScript compilation check
- Test order creation with 1, 10, 50 domains
- Verify order appears in /orders page
- Check order_line_items are properly created
- Verify pricing calculations match expectations
- Test error handling (invalid domains, network errors)
```

### Phase 4: Add to Existing Order (3-4 days)

#### Task 4.1: Create Order Selection API
**File: `/app/api/orders/available-for-domains/route.ts`** (NEW)
```typescript
GET endpoint:
- Accept clientId parameter
- Return draft/pending orders for client
- Include order name, item count, created date
- Filter orders user can edit
```

#### Task 4.2: Create Add to Order Modal
**File: `/app/vetted-sites/components/AddToOrderModal.tsx`** (NEW)
```typescript
- List of available orders
- Radio button selection
- Show order details on hover
- "Create New Order" option
- Validate client match
- Add button
```

#### Task 4.3: Add Domains to Order API
**File: `/app/api/orders/[id]/add-domains/route.ts`** (NEW)
```typescript
POST endpoint:
- Accept orderId and domainAnalysisIds
- Validate order status (must be draft/pending)
- Validate client match
- Create new line items
- Recalculate order totals
- Return updated order
```

#### Task 4.4: Connect Add to Order Flow
**File: `/app/vetted-sites/components/SelectionSummary.tsx`**
```typescript
- Add "Add to Order" dropdown button
- Fetch available orders on click
- Show AddToOrderModal
- Handle add to order API call
- Show success message
- Optional: redirect to order
```

### Phase 5: Availability & Status Tracking (2-3 days)

#### Task 5.0: Pre-Availability Database Analysis
**Actions:**
```bash
# Understand domain usage tracking
- Query order_line_items to see how domains are stored
- Check if same domain can appear in multiple orders
- Verify assignedDomain field format (normalized?)
- Test query performance for availability checks
- Consider index needs for domain lookups
```

#### Task 5.1: Create Availability Check Service
**File: `/lib/services/domainAvailabilityService.ts`** (NEW)
```typescript
class DomainAvailabilityService {
  - checkAvailability(domainIds: string[])
  - getDomainUsage(domain: string)
  - getOrdersUsingDomain(domain: string)
  - reserveDomain(domainId: string, duration: number)
  - releaseReservation(domainId: string)
}
```

#### Task 5.2: Update Table with Availability
**File: `/app/vetted-sites/components/VettedSitesTable.tsx`**
```typescript
- Add availability status column
- Show: Available, Used (Order #123), Reserved
- Color coding (green, yellow, red)
- Disable selection for used domains
- Show tooltip with order details
```

#### Task 5.3: Add Real-time Availability Check
**File: `/app/vetted-sites/page.tsx`**
```typescript
- Query order_line_items for domain usage
- Add to main data query
- Pass availability data to table
- Consider caching strategy
```

### Phase 6: Shopping Cart System (4-5 days)

#### Task 6.0: Cart Architecture Decision & Validation
**Actions:**
```bash
# Decide on cart approach before building
- Review existing draft order functionality
- Check if draft orders can serve as cart
- Decide: Session storage vs Database cart vs Draft orders
- If database: Design migration SQL and test it
- Check for existing cart-like patterns in codebase
```

#### Task 6.1: Design Cart Schema
**File: `/migrations/00XX_add_shopping_cart.sql`** (NEW)
```sql
CREATE TABLE domain_cart (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE domain_cart_items (
  id UUID PRIMARY KEY,
  cart_id UUID REFERENCES domain_cart(id),
  domain_analysis_id UUID REFERENCES bulk_analysis_domains(id),
  target_page_id UUID REFERENCES target_pages(id),
  quantity INTEGER DEFAULT 1,
  added_at TIMESTAMP
);
```

#### Task 6.2: Create Cart API Routes
**File: `/app/api/cart/route.ts`** (NEW)
```typescript
- GET /api/cart - Get current cart
- POST /api/cart/items - Add item
- DELETE /api/cart/items/[id] - Remove item
- PUT /api/cart/items/[id] - Update quantity
- POST /api/cart/clear - Clear cart
- POST /api/cart/checkout - Convert to order
```

#### Task 6.3: Create Cart UI Components
**File: `/app/vetted-sites/components/Cart.tsx`** (NEW)
```typescript
- Sliding panel from right
- List cart items with prices
- Quantity adjustment
- Remove items
- Total calculation
- Checkout button
- Save for later option
```

#### Task 6.4: Add Cart Icon to Header
**File: `/components/Header.tsx`**
```typescript
- Add cart icon with item count badge
- Click opens cart panel
- Show mini preview on hover
- Update count on changes
```

#### Task 6.5: Integrate Cart with Selection
**File: `/app/vetted-sites/components/SelectionSummary.tsx`**
```typescript
- Add "Add to Cart" button
- Move items from selection to cart
- Clear selection after adding
- Show success toast
```

### Phase 7: Context & Target URL Handling (3 days)

#### Task 7.1: Create Target URL Selection Modal
**File: `/app/vetted-sites/components/TargetUrlSelector.tsx`** (NEW)
```typescript
- Show when domain has multiple target URLs
- List all qualified target URLs
- Show match percentage for each
- Radio button selection
- Remember choice for session
```

#### Task 7.2: Update Selection Data Structure
**File: `/app/vetted-sites/hooks/useSelection.ts`**
```typescript
- Add selectedTargetPageId to selection data
- Store target URL choice per domain
- Default to best match
- Allow override
```

#### Task 7.3: Pass Context to Order Creation
**File: `/app/api/orders/quick-create/route.ts`**
```typescript
- Accept targetPageId per domain
- Use for line item creation
- Populate keywords from target page
- Set target URL in line item metadata
```

### Phase 8: UI Polish & Optimization (2-3 days)

#### Task 8.1: Loading States
```typescript
- Skeleton loaders for table
- Loading spinner for actions
- Optimistic updates for selection
- Progress bar for bulk operations
```

#### Task 8.2: Error Handling
```typescript
- Toast notifications for errors
- Retry mechanisms
- Fallback UI for failures
- Clear error messages
```

#### Task 8.3: Performance Optimization
```typescript
- Virtual scrolling for large lists
- Debounce search input
- Lazy load expanded details
- Memoize expensive calculations
- Add pagination options (100, 200, 500)
```

#### Task 8.4: Keyboard Shortcuts
```typescript
- Ctrl+A: Select all visible
- Ctrl+Shift+A: Clear selection
- Space: Toggle current row
- Enter: Open details
- E: Export selected
- C: Create order
```

### Phase 9: Testing & Documentation (2 days)

#### Task 9.1: Write Tests
```typescript
- Unit tests for selection hook
- API route tests
- Integration tests for order creation
- E2E tests for full flow
```

#### Task 9.2: Update Documentation
```markdown
- User guide for domain bank
- API documentation
- Component documentation
- Deployment guide
```

## File Structure Overview

```
/app/vetted-sites/
├── page.tsx                          [EXISTS - needs updates]
├── VettedSitesWrapper.tsx            [EXISTS]
├── components/
│   ├── VettedSitesTable.tsx         [EXISTS - needs updates]
│   ├── VettedSitesFilters.tsx       [EXISTS]
│   ├── SelectionSummary.tsx         [NEW]
│   ├── CreateOrderModal.tsx         [NEW]
│   ├── AddToOrderModal.tsx          [NEW]
│   ├── ExportModal.tsx              [NEW]
│   ├── TargetUrlSelector.tsx       [NEW]
│   └── Cart.tsx                     [NEW]
├── hooks/
│   ├── useSelection.ts              [NEW]
│   └── useCart.ts                   [NEW]
└── utils/
    ├── orderHelpers.ts              [NEW]
    └── exportHelpers.ts             [NEW]

/app/api/
├── vetted-sites/
│   └── export/
│       └── route.ts                 [NEW]
├── orders/
│   ├── quick-create/
│   │   └── route.ts                 [NEW]
│   ├── available-for-domains/
│   │   └── route.ts                 [NEW]
│   └── [id]/
│       └── add-domains/
│           └── route.ts             [NEW]
└── cart/
    ├── route.ts                     [NEW]
    ├── items/
    │   └── [id]/
    │       └── route.ts             [NEW]
    ├── clear/
    │   └── route.ts                 [NEW]
    └── checkout/
        └── route.ts                 [NEW]

/lib/services/
├── domainAvailabilityService.ts    [NEW]
└── cartService.ts                   [NEW]
```

## Validation Checkpoints Summary

### Database Validation Points
1. **Task 1.0**: Analyze bulk_analysis_domains structure
2. **Task 2.0**: Test export query performance
3. **Task 3.0**: Map order system fields
4. **Task 5.0**: Check availability query performance
5. **Task 6.0**: Decide cart architecture

### TypeScript Compilation Checks
1. **Task 1.1**: After useSelection hook creation
2. **Task 1.4**: Full build after Phase 1
3. **Task 1.5**: Mid-phase validation
4. **Task 3.5**: After order creation implementation
5. **Every 2 tasks**: Run `npx tsc --noEmit`
6. **End of each phase**: Run `timeout 60 npm run build`

### Integration Test Points
1. **Task 2.1**: Test export API with curl/Postman
2. **Task 3.1**: Test order creation transaction
3. **Task 3.5**: End-to-end order flow
4. **Task 5.3**: Availability performance test

## Implementation Timeline

### Week 1 (Current)
- Day 1-2: Phase 1 - Selection Infrastructure (with validations)
- Day 3: Phase 2 - Export Functionality (with API tests)
- Day 4-5: Start Phase 3 - Quick Order (with DB analysis)

### Week 2
- Day 1-2: Complete Phase 3 - Quick Order (with E2E test)
- Day 3-4: Phase 4 - Add to Existing Order
- Day 5: Phase 5 - Availability Tracking (with performance test)

### Week 3
- Day 1-3: Phase 6 - Shopping Cart System (architecture decision first)
- Day 4-5: Phase 7 - Context Handling

### Week 4
- Day 1-2: Phase 8 - UI Polish
- Day 3-4: Phase 9 - Testing & Documentation
- Day 5: Buffer/Bug fixes

## Dependencies & Prerequisites

### Required Before Starting
1. Decision on cart persistence approach
2. Pricing strategy for bulk orders
3. Target URL selection UX decision
4. Order status workflow clarification

### Technical Dependencies
- Next.js 15 (installed)
- Drizzle ORM (installed)
- PostgreSQL (configured)
- JWT auth (implemented)
- Resend for emails (configured)

### Database Migrations Needed
1. Shopping cart tables (Phase 6)
2. Domain reservation table (optional)
3. Indexes for performance

## Success Criteria

### Functional Requirements
- [ ] Users can select multiple domains
- [ ] Selection persists during session
- [ ] Export works for 500+ domains
- [ ] Quick order creation < 30 seconds
- [ ] Cart supports 100+ items
- [ ] Availability is real-time accurate

### Performance Requirements
- [ ] Page load < 2 seconds with 1000 domains
- [ ] Selection response < 100ms
- [ ] Export generation < 5 seconds for 500 domains
- [ ] Order creation < 3 seconds

### User Experience
- [ ] Clear selection state
- [ ] Intuitive order creation flow
- [ ] Responsive on mobile
- [ ] Keyboard navigation support
- [ ] Clear error messages

## Risk Mitigation

### Technical Risks
1. **Performance with large datasets**
   - Mitigation: Virtual scrolling, pagination
   
2. **Cart state synchronization**
   - Mitigation: Use database-backed cart

3. **Race conditions in availability**
   - Mitigation: Pessimistic locking, reservations

### Business Risks
1. **Users abandon complex flow**
   - Mitigation: Quick order option
   
2. **Pricing confusion**
   - Mitigation: Clear price display at all steps

3. **Lost selections**
   - Mitigation: Auto-save to session storage

## Next Immediate Steps

1. **Today**: Start Phase 1.1 - Create useSelection hook
2. **Tomorrow**: Complete Phase 1.2-1.3 - Add checkboxes and summary
3. **Day 3**: Phase 1.4 and Phase 2.1 - Integration and export API
4. **Day 4**: Phase 2.2-2.3 - Complete export functionality
5. **Day 5**: Start Phase 3 - Quick order creation

## Questions to Resolve

1. Should cart persist across sessions or just within session?
2. Do we auto-select best target URL or always ask user?
3. Should "Quick Order" skip all configuration or capture basics?
4. How long do we reserve domains after selection?
5. Can same domain be in multiple active orders?
6. Do we need approval workflow for quick orders?
7. Should export include pricing for external users?

## Notes

- Prioritize Quick Order over full wizard integration
- Cart can be added later if needed (not critical for MVP)
- Focus on internal users first, then external
- Keep selection simple - no quantity adjustment initially
- Availability checking can be basic initially (just check if in active order)

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