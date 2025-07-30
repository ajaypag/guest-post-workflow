# Order System Implementation Guide

## Implementation Status Summary

| Phase | Status | Completion Date | Notes |
|-------|--------|-----------------|-------|
| **Phase 1: Order Builder** | ✅ COMPLETED | 2025-01-30 | Multi-client order creation page fully functional |
| **Phase 2: Bulk Analysis** | ✅ COMPLETED | 2025-01-30 | Human-driven projects with notification system |
| **Phase 3: Site Selection** | ✅ COMPLETED | 2025-01-30 | Account-facing site browser with full transparency |
| **Phase 4: Workflow Gen** | ❌ NOT STARTED | - | Auto-create workflows from approved sites |
| **Phase 5: Share Tokens** | ❌ NOT STARTED | - | Public preview and conversion flow |

### Completed Features

#### Phase 1: Order Builder
- ✅ Account selection with search and new account creation
- ✅ Multi-client selection with expandable details  
- ✅ Target page selection per client
- ✅ Requirements override capability
- ✅ Real-time pricing calculation with volume discounts
- ✅ API endpoints for order creation and pricing
- ✅ OrdersTableMultiClient integration

#### Phase 2: Bulk Analysis Integration
- ✅ Order confirmation endpoint that creates projects
- ✅ Bulk analysis projects assigned to internal users
- ✅ Dashboard notification widget for assigned projects
- ✅ Dedicated page for viewing all assigned projects
- ✅ Status tracking for projects (pending, in progress, ready)
- ✅ Direct integration with order groups

#### Phase 3: Site Selection Interface
- ✅ Account-facing site browser at `/account/orders/[id]/sites`
- ✅ Comprehensive filtering by status, DR, traffic, niche
- ✅ Search functionality across domains
- ✅ Suggested vs browse all sites tabs
- ✅ Site selection with target page assignment
- ✅ Real-time selection count tracking
- ✅ API endpoints for fetching and updating selections
- ✅ Database migration for order_site_selections table
- ✅ Multi-client order group support

### Known Issues
- ⚠️ `createdBy` field uses placeholder system user ID until auth implemented
- ⚠️ No account authentication on endpoints yet

### Required Migrations
- ✅ **Phase 2**: Run migration at `/admin/order-groups-migration` (completed)
- ✅ **Phase 3**: Run migration at `/admin/site-selections-migration` (required for site selection)
- 🔴 **IMPORTANT**: Both migrations must be run before using site selection features

## Overview
This document provides the complete implementation guide for the PostFlow order system, incorporating multi-client support, full site transparency, and data-driven bulk analysis.

## Data Flow Architecture

### Complete Data Relationships
```
┌─────────────────────────────────────────────────────────────────────┐
│                        Data Relationships                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Clients Table                    Bulk Analysis                    │
│  ┌─────────────┐                 ┌──────────────┐                 │
│  │ name        │                 │ project_id   │                 │
│  │ website     │ ─────┐          │ client_id    │ ◄───┐           │
│  │ target_pages│      │          │ target_pages │     │           │
│  └─────────────┘      │          │ keywords     │     │           │
│         │              │          └──────────────┘     │           │
│         │              │                 │              │           │
│         ▼              │                 ▼              │           │
│  Target Pages          └───────► Bulk Analysis ────────┘           │
│  ┌─────────────┐              Creates Project                      │
│  │ url         │              (uses client data)                   │
│  │ keywords    │                        │                          │
│  │ description │                        ▼                          │
│  └─────────────┘              Analyzed Domains                     │
│                               ┌──────────────┐                     │
│                               │ domain       │                     │
│                               │ DR/traffic   │                     │
│                               │ status       │                     │
│                               │ niche        │                     │
│                               └──────────────┘                     │
│                                        │                           │
│                    ┌───────────────────┴──────────────────┐        │
│                    ▼                                      ▼        │
│           Website Database                       Order Creation     │
│           ┌──────────────┐                    ┌──────────────┐    │
│           │ suggestions  │                    │ order_groups │    │
│           │ by niche     │ ──────────────────►│ site_select  │    │
│           │ by price     │     (provides      │ (ALL sites)  │    │
│           │ by DR/traffic│      initial)      └──────────────┘    │
│           └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Order Builder Interface ✅ COMPLETED (2025-01-30)

#### 1.1 Order Creation Flow
**File**: `/app/orders/new/page.tsx`

```typescript
interface OrderBuilderState {
  account: Account | null;
  orderGroups: OrderGroup[];
  totalLinks: number;
  estimatedCost: number;
}

interface OrderGroup {
  clientId: string;
  client: Client;
  linkCount: number;
  targetPages: TargetPage[];
  requirements: {
    minDR?: number;
    minTraffic?: number;
    niches?: string[];
    customGuidelines?: string;
  };
}
```

**Key Features:**
- Account selection/creation with auto-complete
- Multi-client support from the start
- Pull target pages directly from clients table
- Show client's default requirements (can override)
- Real-time cost calculation

#### 1.2 Client Selection Component
```typescript
// Component: ClientSelector
// Pulls from existing clients table
<ClientSelector 
  onSelect={(client) => {
    // Auto-populate:
    // - Target pages from client.target_pages
    // - Default requirements from client.default_requirements
    // - Keywords from target pages
  }}
/>
```

**Data Pre-population Logic:**
1. When client selected → fetch from clients table
2. Populate target page dropdown with client's pages
3. Show default requirements (editable)
4. Calculate suggested link distribution

### Phase 2: Bulk Analysis Integration ✅ COMPLETED (2025-01-30)

**Status**: Human-driven bulk analysis projects created on order confirmation
**Implementation**: Projects assigned to internal users for manual analysis

#### 2.1 Order Confirmation & Project Creation
**API Endpoint**: `/api/orders/[id]/confirm` ✅ IMPLEMENTED

When order moves to "confirmed" state:
```typescript
// Creates bulk analysis projects for manual domain selection
const [project] = await tx
  .insert(bulkAnalysisProjects)
  .values({
    id: projectId,
    clientId: orderGroup.clientId,
    name: `Order #${orderId.slice(0, 8)} - ${client.name}`,
    description: `Bulk analysis for ${orderGroup.linkCount} links`,
    icon: '📊',
    color: '#3B82F6',
    status: 'active',
    tags: ['order', `${orderGroup.linkCount} links`, `order-group:${orderGroup.id}`],
    createdBy: assignedTo || '00000000-0000-0000-0000-000000000000',
  });
```

#### 2.2 Internal User Notifications
**Files**: 
- `/components/AssignedProjectsNotification.tsx` ✅ IMPLEMENTED
- `/app/bulk-analysis/assigned/page.tsx` ✅ IMPLEMENTED
- `/app/api/bulk-analysis/assigned-projects/route.ts` ✅ IMPLEMENTED

**Features**:
- Dashboard notification widget showing assigned projects
- Dedicated page for viewing all assigned projects
- Status tracking (pending, in progress, ready)
- Direct links to bulk analysis projects

```typescript
interface AnalysisProgress {
  orderGroup: {
    client: Client;
    linkCount: number;
    analysisProject: {
      status: 'pending' | 'running' | 'complete';
      totalAnalyzed: number;
      suggestedCount: number;
      qualityBreakdown: {
        highQuality: number;
        good: number;
        marginal: number;
        disqualified: number;
      };
    };
  }[];
}
```

### Phase 3: Site Selection Interface ✅ COMPLETED (2025-01-30)

#### 3.1 Full Transparency View
**File**: `/app/account/orders/[id]/sites/page.tsx` ✅ IMPLEMENTED

```typescript
interface SiteSelectionView {
  orderGroup: OrderGroup;
  sites: {
    suggested: AnalyzedDomain[]; // From website DB + analysis
    all: AnalyzedDomain[];       // ALL analyzed sites
    selected: SiteSelection[];   // Current selections
  };
  filters: {
    status: 'all' | 'high_quality' | 'good' | 'marginal';
    minDR?: number;
    minTraffic?: number;
    niche?: string;
  };
}
```

#### 3.2 Site Browser Component
```typescript
<SiteBrowser>
  <Tabs defaultValue="suggested">
    <TabsList>
      <TabsTrigger value="suggested">
        Suggested ({suggestedCount})
      </TabsTrigger>
      <TabsTrigger value="all">
        Browse All ({totalAnalyzed})
      </TabsTrigger>
    </TabsList>
    
    <TabsContent value="suggested">
      <SiteGrid sites={suggestedSites} />
    </TabsContent>
    
    <TabsContent value="all">
      <FilterBar>
        <Select options={['High Quality', 'Good', 'Marginal']} />
        <RangeSlider label="DR" min={0} max={100} />
        <RangeSlider label="Traffic" min={0} max={1000000} />
      </FilterBar>
      <SiteGrid sites={filteredSites} />
    </TabsContent>
  </Tabs>
  
  <SelectionSummary>
    <h3>Selected: {selections.length} / {requiredLinks}</h3>
    <TargetPageAssignment 
      selections={selections}
      targetPages={orderGroup.targetPages}
    />
  </SelectionSummary>
</SiteBrowser>
```

#### 3.3 Site Selection API
**Endpoint**: `/api/orders/[id]/groups/[groupId]/site-selections` ✅ IMPLEMENTED

```typescript
// GET - Fetch all available sites
interface GetSitesResponse {
  suggested: {
    fromWebsiteDB: AnalyzedDomain[];
    fromAnalysis: AnalyzedDomain[];
  };
  all: AnalyzedDomain[];
  currentSelections: SiteSelection[];
}

// POST - Update selections
interface UpdateSelectionsRequest {
  selections: Array<{
    domainId: string;
    targetPageUrl: string;
    anchorText: string;
    status: 'approved' | 'rejected';
  }>;
}
```

### Phase 4: Workflow Generation ❌ NOT STARTED

#### 4.1 Auto-create on Approval
**File**: `/app/api/orders/[id]/approve/route.ts` ❌ NOT IMPLEMENTED

```typescript
async function approveOrderAndCreateWorkflows(orderId: string) {
  // 1. Get all approved site selections
  const orderGroups = await getOrderGroupsWithSelections(orderId);
  
  // 2. Create workflow for each selection
  for (const group of orderGroups) {
    for (const selection of group.approvedSelections) {
      await createWorkflow({
        orderItemId: selection.id,
        domain: selection.domain,
        targetPage: selection.targetPageUrl,
        anchorText: selection.anchorText,
        clientId: group.clientId,
        metadata: {
          orderId,
          orderGroupId: group.id,
          selectionId: selection.id
        }
      });
    }
  }
  
  // 3. Update order status
  await updateOrderStatus(orderId, 'in_progress');
}
```

### Phase 5: Share Token System ❌ NOT STARTED

#### 5.1 Public Preview Page
**File**: `/share/order/[token]/page.tsx` ❌ NOT IMPLEMENTED

```typescript
export default function OrderPreview({ token }: { token: string }) {
  const order = await validateTokenAndGetOrder(token);
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <OrderHeader order={order} />
      
      <AccountCTA>
        <h2>Ready to proceed?</h2>
        <p>Create an account to approve this order and track progress</p>
        <Button href={`/auth/signup/account?token=${token}`}>
          Create Account & Approve
        </Button>
      </AccountCTA>
      
      {order.groups.map(group => (
        <ClientSection key={group.id}>
          <h3>{group.client.name} - {group.linkCount} links</h3>
          <p>Target: {group.targetPages.join(', ')}</p>
          
          <SuggestedSitesPreview sites={group.suggestedSites.slice(0, 5)} />
          
          <Note>
            After approval, you'll be able to browse all {group.totalAnalyzed} 
            analyzed sites and make changes before we begin work.
          </Note>
        </ClientSection>
      ))}
      
      <OrderSummary total={order.total} />
    </div>
  );
}
```

#### 5.2 Token Generation API
**File**: `/app/api/orders/[id]/share/route.ts`

```typescript
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { expiresIn = '7d', allowedActions = ['view', 'convert'] } = await request.json();
  
  const token = generateSecureToken();
  
  await db.insert(orderShareTokens).values({
    orderId: params.id,
    token,
    expiresAt: addDays(new Date(), 7),
    allowedActions,
    createdBy: session.userId,
    metadata: { source: 'manual_share' }
  });
  
  return NextResponse.json({
    shareUrl: `${process.env.NEXTAUTH_URL}/share/order/${token}`,
    expiresAt: token.expiresAt
  });
}
```

## Critical Implementation Details

### 1. Data Pre-population Strategy
When creating orders, the system should intelligently use existing data:

```typescript
// Order creation flow
const populateFromClient = (client: Client) => {
  return {
    targetPages: client.target_pages || [],
    keywords: extractKeywordsFromPages(client.target_pages),
    requirements: client.default_requirements || {},
    suggestedLinkCount: calculateOptimalLinks(client)
  };
};
```

### 2. Site Selection UX Principles
- **Suggested First**: Always show AI/system suggestions prominently
- **Full Access**: Make "Browse All" easily discoverable
- **Clear Metrics**: Display DR, traffic, niche, status for every site
- **Selection Tracking**: Real-time count of selected vs required
- **Target Assignment**: Clear UI for assigning sites to specific target pages

### 3. Multi-client Order Handling
```typescript
// Each client group is independent
interface OrderStructure {
  order: {
    id: string;
    accountId: string;
    total: number;
    groups: Array<{
      clientId: string;
      linkCount: number;
      bulkAnalysisProjectId: string; // Separate analysis per group
      siteSelections: SiteSelection[]; // Independent selections
    }>;
  };
}
```

### 4. Account View Restrictions
All queries must filter by account ownership:

```typescript
// Example: Get orders for account
const getAccountOrders = async (accountId: string) => {
  return db.query.orders.findMany({
    where: eq(orders.accountId, accountId),
    with: {
      orderGroups: {
        with: {
          client: true,
          bulkAnalysisProject: true,
          siteSelections: {
            with: {
              domain: true
            }
          }
        }
      }
    }
  });
};
```

### 5. Workflow Status Aggregation
```typescript
// Show progress at order level
interface OrderProgress {
  totalWorkflows: number;
  completedWorkflows: number;
  activeWorkflows: number;
  estimatedCompletion: Date;
  
  byClient: Array<{
    client: Client;
    workflows: WorkflowSummary[];
  }>;
}
```

## Security Considerations

### Token Security
- Tokens expire after use or time limit
- Tokens are cryptographically secure (32+ chars)
- Token usage is logged for audit trail
- Expired tokens return helpful error messages

### Data Access Control
```typescript
// Middleware for account routes
export async function accountAuthMiddleware(request: Request) {
  const session = await getSession(request);
  
  if (session?.userType !== 'account') {
    return NextResponse.redirect('/account/login');
  }
  
  // Ensure account can only access their own data
  request.headers.set('X-Account-ID', session.accountId);
}
```

## Migration from Current System

### 1. Preserve Existing Orders
```sql
-- Orders already have account_id (renamed from advertiser_id)
-- Just need to add new relationships
UPDATE orders SET state = 'legacy' WHERE state IS NULL;
```

### 2. Create Order Groups for Existing Orders
```sql
-- For each existing order, create a single order group
INSERT INTO order_groups (order_id, client_id, link_count)
SELECT o.id, oi.client_id, COUNT(*)
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, oi.client_id;
```

### 3. Remove Legacy Components
- `OrdersTableSimple.tsx` → Replace with new multi-client table
- Old order creation form → Replace with new builder
- Legacy order detail page → Update to show groups

## Success Metrics

### Technical Metrics
- Order creation time < 2 minutes
- Site selection load time < 1 second
- Bulk analysis trigger success rate > 99%
- Workflow creation success rate = 100%

### Business Metrics
- Multi-client order adoption rate
- Average sites reviewed before selection
- Time from order to approval
- Account self-service rate

## Next Steps & Priority

### Immediate Priorities
1. **Run Database Migrations** (Required for Phase 3)
   - Go to `/admin/order-groups-migration` (Phase 2 - completed)
   - Go to `/admin/site-selections-migration` (Phase 3 - required)
   - Verify both migrations completed successfully

2. **Fix Authentication** (Blocker)
   - Implement proper user authentication for order creation
   - Replace placeholder system user ID with actual user context
   - Add session management for account users

3. **Phase 4: Workflow Generation** (Next Priority)
   - Build auto-workflow creation from approved sites
   - Implement workflow assignment logic
   - Add order status tracking

### Week-by-Week Plan
- ✅ **Week 1**: Complete Phase 1 (Order Builder) + Phase 2 (Bulk Analysis)
- ✅ **Week 2**: Complete Phase 3 (Site Selection Interface)
- **Week 3**: Implement Phase 4 (Workflow Generation) + Authentication
- **Week 4**: Launch Phase 5 (Share Token System)
- **Week 5**: Polish and optimize based on usage

This architecture provides a complete, data-driven order system that leverages existing client data while providing unprecedented transparency and flexibility for accounts.