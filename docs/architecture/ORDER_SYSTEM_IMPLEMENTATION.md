# Order System Implementation Guide

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

### Phase 1: Order Builder Interface (Priority 1)

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

### Phase 2: Bulk Analysis Integration

#### 2.1 Auto-trigger Analysis
**API Endpoint**: `/api/orders/[id]/trigger-analysis`

When order moves to "confirmed" state:
```typescript
async function triggerBulkAnalysis(orderGroup: OrderGroup) {
  // 1. Create bulk_analysis_project
  const project = await createBulkAnalysisProject({
    clientId: orderGroup.clientId,
    targetPages: orderGroup.targetPages,
    keywords: extractKeywordsFromTargetPages(orderGroup.targetPages),
    requirements: orderGroup.requirements
  });
  
  // 2. Link to order group
  await updateOrderGroup(orderGroup.id, {
    bulkAnalysisProjectId: project.id
  });
  
  // 3. Start analysis process
  await startBulkAnalysis(project.id);
}
```

#### 2.2 Analysis Status Tracking
**File**: `/app/orders/[id]/analysis/page.tsx`

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

### Phase 3: Site Selection Interface (Critical)

#### 3.1 Full Transparency View
**File**: `/app/account/orders/[id]/sites/page.tsx`

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
**Endpoint**: `/api/orders/[orderId]/groups/[groupId]/site-selections`

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

### Phase 4: Workflow Generation

#### 4.1 Auto-create on Approval
**File**: `/app/api/orders/[id]/approve/route.ts`

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

### Phase 5: Share Token System

#### 5.1 Public Preview Page
**File**: `/share/order/[token]/page.tsx`

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

## Next Steps

1. **Immediate**: Build order creation UI with client selection
2. **Week 1**: Implement site selection interface with full transparency
3. **Week 2**: Add workflow generation and progress tracking
4. **Week 3**: Launch share token system for sales
5. **Week 4**: Polish and optimize based on usage

This architecture provides a complete, data-driven order system that leverages existing client data while providing unprecedented transparency and flexibility for accounts.