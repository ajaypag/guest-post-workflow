# Updated Order Flow Requirements (2025-08-01)

## Key Requirement Changes

### Previous Understanding (Incorrect)
- After target selection → Site selection by account users
- One order → One set of projects
- Site selection happens immediately after order confirmation

### New Understanding (Correct)
- After target selection → **Internal team takes over**
- Projects can be **associated with multiple orders** (not 1:1)
- Projects contain valuable analysis data that can be reused for months
- Need flexibility in project-order associations

## Updated Flow After Target Selection

### 1. Order Submission
When user completes target selection and submits order:
- Order moves from `draft` → `confirmed`
- Order is assigned to internal team
- **Projects are triggered for each client in the order**

### 2. Project-Order Association Model

**Current Model**: One order → One project per client (rigid)

**Required Model**: Flexible association
- Projects can be associated with multiple orders
- Projects contain sites and analysis that remain useful for months
- Internal users decide which project to use for each client's order
- Option to create new project OR use existing project

### 3. Internal Team Workflow

After order confirmation, internal users:
1. **Access bulk analysis tools**
2. **Leverage internal database** of sites
3. **Use bulk analysis AI** to evaluate sites
4. **Decide which sites to suggest** for the order

### 4. Status Layer Requirements

**Current bulk analysis domain statuses**:
- `high_quality`
- `good` 
- `marginal`
- `disqualified`

**New layer needed for account orders**:
- "Submit for this order" status
- Backup site selections
- Order-specific approval states
- Multi-order tracking (same site used in multiple orders)

## Technical Architecture Considerations

### Project Flexibility
```typescript
// Current (Rigid)
order_groups.bulkAnalysisProjectId // One project per order group

// Needed (Flexible)
project_order_associations {
  projectId: string
  orderId: string
  orderGroupId: string
  createdAt: Date
  createdBy: string
}
```

### Unified UI Requirements
- **Less individual components** - Stop building separate UIs for each feature
- **More unification** - Single interface that handles multiple workflows
- **Bulk analysis integration** - Seamless connection between orders and analysis

### Site Submission Layer
```typescript
// New table needed
order_site_submissions {
  id: string
  orderId: string
  orderGroupId: string
  bulkAnalysisDomainId: string
  status: 'suggested' | 'backup' | 'rejected' | 'approved'
  suggestedAt: Date
  suggestedBy: string
  approvedAt?: Date
  approvedBy?: string
  notes?: string
}
```

## Research Questions to Answer

1. **Can bulk analysis UI be unified with order management?**
   - Review current bulk analysis components
   - Identify reusable patterns
   - Plan unified interface

2. **How to handle project reusability?**
   - Projects contain months of valuable data
   - Same project can serve multiple orders
   - Need efficient lookup and association

3. **Status management complexity**
   - Site can have internal analysis status
   - Site can have order-specific status
   - Need to track both without confusion

## Implementation Priority

### Phase 1: Foundation (Immediate)
- [ ] Review bulk analysis codebase
- [ ] Document current project structure
- [ ] Identify integration points

### Phase 2: Architecture (This Week)
- [ ] Design flexible project-order association
- [ ] Plan unified UI approach
- [ ] Create status layer schema

### Phase 3: Implementation (Next Sprint)
- [ ] Build project selection interface
- [ ] Create site submission workflow
- [ ] Integrate with existing bulk analysis

## Next Steps

1. **Deep dive into bulk analysis code**
   - Understand current architecture
   - Identify constraints and opportunities
   - Document findings

2. **Design unified interface mockup**
   - Single view for project management
   - Integrated site selection
   - Order-specific actions

3. **Plan database changes**
   - Project-order associations
   - Site submission tracking
   - Status layer implementation