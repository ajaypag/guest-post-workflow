# Project-Order Flexibility Analysis

## Executive Summary

After target selection in orders, the internal team needs flexible project-order associations to efficiently evaluate and suggest sites across multiple orders. Current rigid 1:1 mapping prevents site data reuse and creates inefficiencies.

**Key Requirements**:
- Projects should support multiple orders for data reuse
- Internal team leverages bulk analysis AI for site evaluation  
- Need new status layer for order-specific site submissions
- Unified UI approach vs individual components

## Current Architecture Analysis

### Current Project-Order Association (Rigid 1:1)

**Table**: `order_groups`
```sql
bulkAnalysisProjectId: uuid references bulkAnalysisProjects.id
```

**Issues**:
1. **Rigid Association**: Each order group creates new project, no reuse
2. **Data Isolation**: Site analysis can't be shared between orders
3. **Inefficient**: Re-analyzing same domains for each order
4. **Limited Flexibility**: Can't leverage existing project insights

### Current Site Selection Infrastructure

**Existing Capabilities** (Already Built):
- ✅ Dual user type support (internal/account)
- ✅ Order-specific site selections table (`orderSiteSelections`)
- ✅ Status tracking (suggested, approved, rejected)
- ✅ API supports both creation and modification of selections
- ✅ Bulk analysis domains with qualification statuses

**Key Finding**: Site selection infrastructure already supports flexible associations via `orderSiteSelections` table.

### Bulk Analysis Project Structure

**Current Schema** (`bulkAnalysisProjects`):
- Associated with single client (`clientId`)
- Contains analyzed domains (`bulkAnalysisDomains`)
- Domain qualification statuses (high_quality, good_quality, etc.)
- Project metadata (name, description, tags)

**Current Workflow**:
1. Order confirmed → Creates new project per order group
2. Internal user assigned to project
3. Bulk analysis AI evaluates domains
4. Results stored in `bulkAnalysisDomains`
5. Site selection uses project domains

## Flexible Association Requirements

### User's Updated Requirements (2025-08-02)

1. **Internal Team Takeover**: After target selection, internal users control site selection
2. **Project Flexibility**: Projects should associate with multiple orders for reuse
3. **Unified UI**: Less individual components, more unified bulk analysis integration
4. **New Status Layer**: Order-specific submission statuses beyond basic qualification
5. **AI Leverage**: Use existing bulk analysis AI for site evaluation

### Proposed Many-to-Many Architecture

**New Association Pattern**:
```
Projects ←→ Orders (Many-to-Many)
    ↓
Domain Analysis (Shared)
    ↓  
Order-Specific Selections (Per Order)
```

**Benefits**:
- Same project can serve multiple orders
- Domain analysis reused across orders
- Order-specific selections maintain independence
- Efficient resource utilization

## Solution Architecture

### Option 1: Project-Order Junction Table

**New Table**: `project_order_associations`
```sql
CREATE TABLE project_order_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES bulk_analysis_projects(id),
  order_group_id uuid REFERENCES order_groups(id),
  association_type varchar(50) DEFAULT 'primary', -- primary, shared, reference
  created_at timestamp DEFAULT now(),
  created_by uuid REFERENCES users(id)
);
```

**Migration Strategy**:
1. Create junction table
2. Migrate existing 1:1 associations to junction table
3. Update `order_groups` to remove `bulkAnalysisProjectId`
4. Update APIs to use junction table for associations

### Option 2: Enhanced Order Groups (Minimal Change)

**Keep Current Structure** but add flexibility:
```sql
-- Add to order_groups
shared_project_id uuid REFERENCES bulk_analysis_projects(id),
project_association_type varchar(50) DEFAULT 'dedicated'
```

**Benefits**:
- Minimal schema changes
- Backward compatibility maintained
- Easy migration path

### Option 3: Project Tags & Filtering (User's Preference)

**Leverage Existing Tags System**:
- Use `bulkAnalysisProjects.tags` to associate with orders
- Tags like `["order:uuid", "client:client-name", "shared"]`
- Filter projects by tags in UI
- No schema changes required

## Unified UI Integration Plan

### Current Bulk Analysis Interface

**Files Reviewed**:
- `/app/bulk-analysis/page.tsx` - Dashboard with client/prospect filtering
- Bulk analysis project detail pages
- Site selection API (`/api/orders/[id]/groups/[groupId]/site-selections`)

**Current Features**:
- Client-based project organization
- Filtering by assignment and project type
- Stats dashboard (prospects, clients, projects, domains)
- Project detail views with domain analysis

### Proposed Unified Interface

**Integration Strategy**:
1. **Extend Bulk Analysis Dashboard**: Add "Order Projects" section
2. **Order-Aware Project Views**: Show which orders are associated
3. **Cross-Order Site Suggestions**: Suggest sites from related projects
4. **Unified Site Selection**: Same interface for order-specific and general analysis

**New UI Components**:
```typescript
interface OrderProjectView {
  project: BulkAnalysisProject;
  associatedOrders: OrderGroup[];
  availableDomains: BulkAnalysisDomain[];
  orderSpecificSelections: Map<string, OrderSiteSelection[]>;
}
```

## New Status Layer Design

### Current Status System

**Bulk Analysis Domain Status**:
- `qualificationStatus`: pending, high_quality, good_quality, marginal_quality, disqualified

**Order Site Selection Status**:
- `status`: suggested, approved, rejected, alternate

### Enhanced Status Layer

**Proposed Order-Specific Statuses**:
```typescript
type OrderSubmissionStatus = 
  | 'suggested'    // AI/team suggested for this order
  | 'backup'       // Backup option for this order
  | 'approved'     // Client approved for this order
  | 'rejected'     // Client rejected for this order
  | 'alternate'    // Alternative suggestion
  | 'reserved'     // Reserved but not yet suggested
  | 'pending_review' // Needs internal review before suggestion
```

**Implementation**:
- Extend `orderSiteSelections.status` field
- Add `submissionPriority` (1=primary, 2=backup, etc.)
- Track `suggestedAt`, `reviewedAt` timestamps

## Implementation Roadmap

### Phase 1: Foundation (Current)
- ✅ Research current architecture constraints
- ✅ Document flexible association requirements
- ✅ Analyze bulk analysis infrastructure
- 🔄 Create solution architecture proposal

### Phase 2: Schema Evolution
- [ ] Choose association pattern (recommend Option 3: Tags)
- [ ] Create migration scripts for chosen approach
- [ ] Update APIs to support flexible associations
- [ ] Test backward compatibility

### Phase 3: UI Integration
- [ ] Extend bulk analysis dashboard for order projects
- [ ] Create unified site selection interface
- [ ] Implement order-aware project filtering
- [ ] Add cross-order site suggestions

### Phase 4: Enhanced Status Layer
- [ ] Extend order site selection statuses
- [ ] Add priority and timing fields
- [ ] Update UI to show enhanced statuses
- [ ] Create internal workflow for status management

### Phase 5: Testing & Optimization
- [ ] End-to-end testing of flexible associations
- [ ] Performance optimization for cross-order queries
- [ ] User acceptance testing with internal team
- [ ] Documentation and training materials

## Recommended Approach

### Primary Recommendation: Option 3 (Project Tags)

**Rationale**:
1. **Zero Schema Changes**: Uses existing `tags` JSONB field
2. **Immediate Implementation**: No migration required
3. **Maximum Flexibility**: Tags can encode any association pattern
4. **User's Preference**: Aligns with unified UI approach

**Implementation**:
```typescript
// Tag format for order associations
const orderTags = [
  `order:${orderId}`,
  `order-group:${orderGroupId}`,
  `client:${clientName}`,
  'shared', // Indicates project can be shared
  'active'  // Current status
];

// Query projects for order
const orderProjects = await db.query.bulkAnalysisProjects.findMany({
  where: sql`tags @> ${JSON.stringify([`order:${orderId}`])}`
});
```

### Integration Priority

1. **Start with Bulk Analysis Dashboard**: Add order-aware filtering
2. **Extend Site Selection API**: Support project tag filtering  
3. **Unify Site Selection UI**: Single interface for all selection scenarios
4. **Add Enhanced Status Layer**: Order-specific submission tracking

This approach provides maximum flexibility with minimal technical risk while aligning with the user's preference for unified interfaces over separate components.

## Success Metrics

**Technical Metrics**:
- Project reuse rate: % of projects associated with multiple orders
- Site suggestion efficiency: Reduction in duplicate domain analysis
- Query performance: Response time for cross-order site suggestions

**Business Metrics**:
- Internal team efficiency: Time from order confirmation to site suggestions
- Site suggestion quality: Acceptance rate of cross-order suggestions
- Order processing speed: Time from target selection to internal takeover

## Next Steps

1. **Get User Approval**: Confirm approach aligns with requirements
2. **Start Implementation**: Begin with project tags approach
3. **Create Unified UI Mock**: Design order-aware bulk analysis interface
4. **Test Integration**: Ensure existing functionality remains intact
5. **Document New Workflow**: Internal team processes for flexible associations