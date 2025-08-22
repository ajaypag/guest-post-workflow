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

## Next Steps

1. Design the "super table" interface mockup
2. Define exact filtering capabilities needed
3. Determine permission model for external access
4. Build Phase 1 read-only view
5. Add selection/order creation capabilities

## Success Metrics

- Less back-and-forth on domain selection
- Higher order values (clients add more domains)
- Faster order creation
- Better domain utilization
- Client self-service reducing support load