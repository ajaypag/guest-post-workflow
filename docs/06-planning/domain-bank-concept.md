# Domain Bank Concept - Planning Document

## The Problem We're Solving
When we moved from flexible order groups to rigid order line items, we lost the ability to:
- Present extra domain options for clients to choose from
- Have a back-and-forth selection process
- Let clients discover and pick what they like from a larger pool

## Core Concept: Domain Bank
Transform bulk analysis projects from an internal-only tool into a shared "domain bank" where:
- Internal users populate and qualify domains
- Both internal and external users can browse and select
- No stale "suggestions" - just real-time available inventory

## Key Insights from Discussion

### Why Not Another Table?
- Adding a "suggestions" table creates problems:
  - Suggestions go stale over time
  - Pricing changes make old suggestions meaningless
  - Client might want them 6 months later - where did they go?
  - Just adds complexity without solving the real problem

### The Real Need
**"A filtered view of all qualified domains analyzed for this client"**
- Not suggestions that expire
- Just available inventory they can browse anytime
- Pull into orders when needed

### Current Architecture Issues
- Domains analyzed for one target URL don't make sense for another
- Moving domains between projects breaks context
- Need to maintain the relationship between domain → client → target URL

## The Solution: Bulk Analysis Super Table

### What This Is
A unified interface/view that shows:
- All domains analyzed across all projects for a client
- Filtered by qualification status
- Grouped by target URL context
- Real-time availability status

### For Agencies at Scale
When an agency has 30 clients with 60 projects:
- Single interface to browse all analyzed domains
- Filter by client, project, metrics, availability
- See which domains are already used vs available
- Build orders from this unified view

## Key Design Principles

1. **Domain Bank is Just a View** - Not a new system, just a unified view of all qualified domains
2. **Projects Don't Matter Much** - They're organizational folders; domain bank shows everything
3. **Multiple Analyses are Fine** - Same domain analyzed for different target URLs all show up
4. **Real-time Metrics** - Current pricing/DR/traffic, not historical snapshots
5. **Simple Availability** - "Used" means in an active order, not just analyzed
6. **No Complex Duplicate Handling** - Just show all qualified analyses, let user pick

## Single View, Smart Filtering

### One Domain Bank Component
- **Master View**: `/domain-bank` - Shows all clients by default
- **Filtered View**: `/domain-bank?client=abc123` - Same view, pre-filtered
- **Client Context**: `/clients/[id]/domain-bank` - Auto-filters to that client
- User can always change filters - it's the same component

### Access Patterns

#### Agency/Internal User
1. Lands on `/domain-bank` - sees all clients' domains
2. Can filter to specific client(s) using dropdown
3. Can create orders for any client
4. Sees wholesale prices and internal notes

#### Single Client User  
1. Lands on `/domain-bank` - automatically filtered to their client
2. Client filter is hidden or disabled
3. Can only create orders for their client
4. Sees retail prices only

### Navigation Context
- From main nav → All clients
- From client page → Pre-filtered to client
- From order page → Pre-filtered to order's client
- From project page → Pre-filtered to project's client

## Implementation Approach

### Phase 1: The Super Table View
Create a unified interface that queries bulk_analysis_domains with:
- Client filtering
- Project/target URL grouping
- Availability checking (not in active orders)
- Metric filtering (DR, traffic, price)
- Quality filtering

### Phase 2: Availability Tracking
Simple tracking of which domains are used:
- Check against order_line_items
- Show available/used status
- Maybe add reservation system later

### Phase 3: Order Building
- Checkbox selection UI
- "Add to order" functionality
- "Create new order" from selection
- Shopping cart pattern

## Simplified Approach (Post-Discussion)

### What We Learned
- **Duplicates aren't a problem** - They're actually useful (same domain, different contexts)
- **Projects are just folders** - Domain bank shows everything across all projects
- **Multiple analyses are good** - Same domain can be qualified differently for different target URLs

### Example: Domain with Multiple Analyses
```
techcrunch.com (appears 3 times)
├── Analyzed for: /seo-tools → ✅ Qualified (Jan 2024)
├── Analyzed for: /marketing → ❌ Disqualified (Feb 2024)  
└── Analyzed for: /blog → ✅ Qualified (Mar 2024)

User can pick which analysis context to use when adding to order
```

### Simplified Architecture
- **No new tables needed** - Just query existing bulk_analysis_domains
- **No complex duplicate resolution** - Show everything, let user choose
- **No "ownership"** - Domains aren't owned by projects, just analyzed within them
- **Availability = Not in active order** - Simple boolean check
- **User curation** - Two simple actions: bookmark (⭐) and hide (×)

## Order Integration Deep Dive

### The Challenge
We have an existing order creation flow at `/orders/new` that:
- Has a complex multi-step wizard
- Requires target URLs, keywords, requirements
- Creates order line items with specific configurations
- Has pricing tiers and payment processing

The question: How do we bridge from "I selected 10 domains" to "These are now order line items"?

### Two Paths for Order Creation

#### Path A: "Add to Existing Order" 
**Complexity: Medium**

When user selects domains and chooses "Add to Order #123":
1. Check order status - must be draft or pending
2. Validate client matches (domains must be for same client)
3. Create line items with:
   - Domain from selection
   - Target URL from the domain's qualification context
   - Keywords from the original analysis
   - Standard pricing based on domain
4. Redirect to order page to review/edit

**Issues to Solve:**
- What if order already has 50 items and user adds 20 more?
- How do we handle different target URLs in same order?
- Should we group by target URL automatically?

#### Path B: "Create New Order"
**Complexity: High**

Option 1: **Quick Order** (Simplified)
- Skip the wizard entirely
- Create order with minimal config:
  - Client (from domain selection)
  - Domains (from selection)
  - Target URLs (from qualification context)
  - Auto-generate basic requirements
- Mark as "Quick Order" type
- Let user edit details later

Option 2: **Wizard Integration**
- Pass selected domains to `/orders/new` as query params
- Pre-populate the domain selection step
- User still goes through wizard but domains are pre-selected
- More control but more steps

Option 3: **Inline Creation** (Most Complex)
- Embed mini order form in domain bank
- Capture essential fields right there:
  - Order name
  - Due date
  - Special requirements
- Create order in background
- Show success without navigation

### Shopping Cart Pattern

#### Why a Cart Makes Sense
- Users can browse and collect domains over time
- Review total cost before committing
- Adjust quantities (maybe they want 2 posts on same domain?)
- Apply discounts/packages
- Save cart for later

#### Cart Implementation Options

**Option 1: Session Storage** (Simple)
- Store selections in browser
- Persists during session
- Lost on logout
- No backend complexity

**Option 2: Database Cart** (Robust)
```sql
domain_cart_items:
- user_id
- domain_analysis_id (links to bulk_analysis_domains)
- target_page_id (which context to use)
- quantity (usually 1)
- added_at
- notes
```

**Option 3: Draft Order as Cart** (Reuse Existing)
- Auto-create draft order when first item selected
- Keep adding to this draft
- Show "Cart (Draft Order #456)"
- Leverages existing order system

### Context Preservation Problem

When a domain is qualified for multiple target URLs:
```
techcrunch.com qualified for:
- /seo-tools (98% match)
- /marketing (82% match)
- /blog (71% match)
```

**The Challenge:** When adding to order, which context do we use?

**Solutions:**
1. **Default to Best Match** - Auto-pick highest scoring target URL
2. **Ask User** - Modal: "Which target URL for this domain?"
3. **Remember Context** - If filtered by target URL, use that
4. **Multiple Line Items** - Let them add same domain multiple times with different targets

### Workflow Integration Points

#### From Domain Bank to Order
```
Domain Bank → Select Domains → Review Selection → Choose Action:
├─→ Add to Existing Order → Pick Order → Confirm → View Order
├─→ Create Quick Order → Confirm Details → Order Created → View Order
└─→ Start Full Order → Wizard with Pre-selection → Complete Wizard → Order Created
```

#### From Order to Domain Bank
```
Order Page → "Add More Domains" → Domain Bank (filtered to client) → Select → Return to Order
```

### Technical Considerations

#### State Management
- Selected domains need to persist across navigation
- Consider Redux/Zustand for complex selection state
- Or use URL params for stateless approach

#### API Design
```typescript
// Selection to Order
POST /api/orders/from-selection
{
  domainAnalysisIds: string[],
  orderType: 'quick' | 'full',
  existingOrderId?: string
}

// Add to Cart
POST /api/cart/items
{
  domainAnalysisId: string,
  targetPageId: string,
  quantity: number
}

// Cart to Order
POST /api/cart/checkout
{
  cartId: string,
  orderDetails: {...}
}
```

#### Permissions & Validation
- Can user create orders for this client?
- Are domains still available?
- Price changes since qualification?
- Domain already in active order?

### Phased Implementation Approach

#### Phase 1: Selection UI (Week 1)
- Add checkboxes to domain rows
- Selection counter/summary bar
- "Clear selection" button
- Persist selection in session storage

#### Phase 2: Export & Reports (Week 1)
- Export selected domains to CSV
- Include all qualification data
- Email report functionality

#### Phase 3: Simple Order Creation (Week 2)
- "Create Quick Order" from selection
- Minimal order with auto-populated data
- Redirect to order page for review

#### Phase 4: Add to Existing Order (Week 2)
- Dropdown of eligible draft orders
- Add domains as line items
- Handle target URL context

#### Phase 5: Shopping Cart (Week 3)
- Persistent cart across sessions
- Cart review/edit page
- Convert cart to order

#### Phase 6: Advanced Features (Week 4)
- Bulk pricing rules
- Package detection
- Reserved domains
- Collaborative selection (share selections)

### Decision Points Needed

1. **Quick Order vs Full Wizard?**
   - Do we bypass the wizard for domain bank orders?
   - How much configuration is required upfront?

2. **Cart Persistence?**
   - Session only or database backed?
   - How long do we keep cart items?

3. **Target URL Handling?**
   - Auto-select best match or always ask?
   - Allow multiple contexts per domain?

4. **Pricing at Selection?**
   - Show exact price or estimate?
   - When do we lock in pricing?

5. **Availability Checking?**
   - Real-time checks on each page load?
   - Reserve on selection or only on order creation?

## Updated Next Steps

1. ✅ Build the vetted-sites page (Domain Bank view) - DONE
2. Add selection UI with checkboxes and summary
3. Implement "Create Quick Order" flow
4. Add "Export to CSV" for selected domains
5. Build "Add to Existing Order" functionality
6. Create shopping cart system (decide on approach first)
7. Add reservation system for selected domains
8. Implement collaborative selection features

## Success Metrics

- Less back-and-forth on domain selection
- Higher order values (clients add more domains)
- Faster order creation (< 2 minutes from selection to order)
- Better domain utilization (fewer domains sitting unused)
- Client self-service reducing support load by 40%
- Cart abandonment rate < 20%
- Average domains per order increases from 5 to 8