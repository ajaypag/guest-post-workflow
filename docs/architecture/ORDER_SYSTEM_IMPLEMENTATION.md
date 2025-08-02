# Order System Implementation Guide

## Implementation Status Summary

| Phase | Status | Completion Date | Notes |
|-------|--------|-----------------|-------|
| **Phase 1: Order Builder** | ✅ COMPLETED | 2025-01-30 | Multi-client order creation page fully functional |
| **Phase 2: Bulk Analysis** | ✅ COMPLETED | 2025-01-30 | Human-driven projects with notification system |
| **Phase 3: Site Selection** | ✅ COMPLETED | 2025-01-30 | Account-facing site browser with full transparency |
| **Phase 3.5: Flexible Associations** | ✅ COMPLETED | 2025-08-02 | Projects reusable across orders, unified UI with BulkAnalysisTable |
| **Phase 4: Account Dashboard** | 🚧 IN PROGRESS | - | Auth complete, dashboard pending, needs integration work (see BUYER_PORTAL_IMPLEMENTATION.md) |
| **Phase 5: Workflow Gen** | ✅ COMPLETED | 2025-01-30 | Payment-aware workflow generation |
| **Phase 6: Share Tokens** | ❌ NOT STARTED | - | Public preview and conversion flow |
| **Payment System** | ✅ COMPLETED | 2025-01-31 | Manual payment recording with invoices |
| **Email Integration** | ✅ COMPLETED | 2025-01-31 | Payment confirmations, invitations ready |
| **Archive System** | ✅ COMPLETED | 2025-01-31 | Soft delete with consistent UI/API behavior |
| **AI Permissions** | ✅ COMPLETED | 2025-01-31 | Granular AI feature access control for accounts |
| **Account API Fix** | ✅ COMPLETED | 2025-08-01 | Fixed account users unable to see their clients |
| **Draft Order System** | ✅ COMPLETED | 2025-08-01 | Draft saving, editing, and loading functionality |
| **Project-Order Flexibility** | ✅ COMPLETED | 2025-08-02 | Flexible project associations for site reuse across orders |

### Current Phase: Internal Site Selection & Project Flexibility (2025-08-02)

After user target selection is complete, the internal team takes over for site selection and bulk analysis. This phase requires:

1. **Flexible Project-Order Associations**: Projects should be reusable across multiple orders for maximum efficiency
2. **Unified UI Integration**: Bulk analysis interface integrated with order-specific site selection
3. **New Status Layer**: Order-specific site submission statuses (suggested, backup, approved, rejected)
4. **Internal Workflow**: Leverage existing bulk analysis AI to evaluate and suggest sites

**Current Research Focus**: Analyzing existing architecture constraints and designing flexible many-to-many project-order associations.

**Research Complete**: See [PROJECT_ORDER_FLEXIBILITY_ANALYSIS.md](./PROJECT_ORDER_FLEXIBILITY_ANALYSIS.md) for detailed analysis and solution architecture.

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

### ✅ **SHARED INTERFACE ARCHITECTURE - Site Selection** (IMPLEMENTED 2025-01-30)

**Design Decision**: Use single interface for both internal and account users with different permissions

#### **Current Implementation Analysis**
- **Path**: `/account/orders/[id]/sites/page.tsx` 
- **API**: `/api/orders/[id]/groups/[groupId]/site-selections`
- **Status**: ✅ Dual user type support implemented (2025-01-30)

#### **Shared Interface Requirements**

**Authentication & Access Control**:
```typescript
// API: /api/orders/[id]/groups/[groupId]/site-selections
if (session.userType === 'internal') {
  // Internal: Access any order, full CRUD capabilities
} else if (session.userType === 'account') {
  // Account: Only access orders they own
  if (order.accountId !== session.accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
} else {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**User Capability Differences**:
- **Internal Users**: 
  - Access any order
  - Create new site selections from scratch
  - Full CRUD on selections
  - See all bulk analysis data
  
- **Account Users**:
  - Access only their orders (`order.accountId === session.accountId`)
  - Approve/reject/swap existing suggestions only
  - Cannot create entirely new selections
  - Limited to pre-analyzed suggestions

**UI Adaptations Needed**:
```typescript
const userType = session?.userType;
const canCreateSelections = userType === 'internal';
const canModifyExisting = userType === 'internal' || userType === 'account';

// Show different action buttons based on user type
{userType === 'account' ? (
  <ApproveRejectActions />
) : (
  <FullSelectionInterface />
)}
```

### ✅ **AUTHENTICATION IMPLEMENTATION COMPLETE**
- ✅ **Account authentication system**: Full login flow with HTTP-only cookies
- ✅ **Password reset flow**: Email-based reset with secure tokens
- ✅ **Account settings page**: Profile management and password change
- ✅ **JWT token refresh**: Automatic refresh for expiring tokens
- ✅ **Rate limiting**: Protection against brute force attacks
- ✅ **Role management**: Viewer, editor, admin roles with permissions
- ✅ **XSS protection**: Migrated from localStorage to HTTP-only cookies

### Known Issues
- ⚠️ `createdBy` field uses placeholder system user ID until auth implemented
- 🔴 **"Add Client" button in `/orders/new` returns 404** - Missing client creation endpoint/page

### Related Documentation
- **[BUYER_PORTAL_IMPLEMENTATION.md](./BUYER_PORTAL_IMPLEMENTATION.md)** - Detailed implementation guide for:
  - Client/brand architecture and account integration
  - Order creation workflow redesign
  - Three client creation scenarios
  - Step-by-step implementation plan

### Required Migrations
- ✅ **Phase 2**: Run migration at `/admin/order-groups-migration` (completed)
- ✅ **Phase 3**: Run migration at `/admin/site-selections-migration` (required for site selection)
- 🔴 **IMPORTANT**: Both migrations must be run before using site selection features

## Overview
This document provides the complete implementation guide for the PostFlow order system, incorporating multi-client support, full site transparency, and data-driven bulk analysis.

## 🔐 **CRITICAL: User Architecture Understanding**

**Three Separate User Systems** (NOT a single users table with userType):

### **1. Internal Users (`users` table)**
- **Purpose**: Internal staff, admins, workflow managers
- **Authentication**: JWT via AuthServiceServer 
- **Access**: All orders, admin features, bulk analysis
- **Fields**: email, passwordHash, role ('user'|'admin'), name
- **✅ userType field limited to 'internal' only** (fixed 2025-01-30)

### **2. Account Users (`accounts` table)** 
- **Purpose**: External customers who order guest posts (formerly "advertisers")
- **Authentication**: Separate auth system with own email/password
- **Access**: Only their own orders and site selections
- **Fields**: email, password, contactName, companyName, billing info, etc.
- **Relations**: `orders.accountId → accounts.id`, `accounts.primaryClientId → clients.id`

### **3. Publisher Users (`publishers` table)**
- **Purpose**: External website owners who provide guest post opportunities  
- **Authentication**: Separate auth system with own email/password
- **Access**: Their websites, payment info, content guidelines
- **Fields**: email, password, contactName, paymentEmail, commission rates, etc.
- **Relations**: `publisherWebsites` links to websites

### **CRITICAL AUTH IMPLICATIONS:**
- **Orders system** references `accounts` table, NOT `users` table
- **✅ Site selection API validates account ownership via `accounts` table** (implemented 2025-01-30)
- **✅ Auth system updated to support both internal and account users** (fixed 2025-01-30)
- **Each user type needs separate authentication flow** (account login still missing)

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

### Phase 3: Internal Site Selection & Project Flexibility 🔄 UPDATED (2025-08-02)

**STATUS**: Phase 3 flow redesigned for flexible project-order associations and client access to bulk analysis data.

#### 3.1 Updated Internal Workflow

**Complete Updated Flow**:

1. **Order Confirmation** → Creates project-order association
   - Junction table links project to order group: `project_order_associations`
   - Project can be new (dedicated) or existing (same client only)
   - Internal user assigned for bulk analysis

2. **Bulk Analysis** → Internal user analyzes domains
   - Uses existing bulk analysis AI for domain evaluation
   - Results stored in `bulk_analysis_domains` (reusable across orders for same client)
   - Domain pool created for client (not order-specific)

3. **Site Curation** → Internal user curates order-specific suggestions
   - Selects best domains from analysis for this specific order
   - Creates entries in `order_site_selections` with status "suggested"
   - Each order gets unique domains (no reuse of same domains)
   - Project analysis reused, but domain selections are unique per order

4. **Client Access** → Account users get full bulk analysis access
   - **NEW**: Account users can access project bulk analysis page via order
   - Can review all analyzed domains, not just suggestions
   - Can make their own selections from full domain pool
   - Can modify order (add/remove links, change targets)

#### 3.2 Junction Table Architecture

**New Table**: `project_order_associations`
```sql
CREATE TABLE project_order_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES bulk_analysis_projects(id),
  order_group_id uuid REFERENCES order_groups(id),
  association_type varchar(50) DEFAULT 'primary', -- 'primary', 'shared'
  created_at timestamp DEFAULT now(),
  created_by uuid REFERENCES users(id)
);
```

**Key Benefits**:
- Project analysis reused across multiple orders (same client)
- Each order gets unique domain selections
- Full bulk analysis data accessible to clients
- Flexible associations without schema limitations

#### 3.3 Enhanced Existing Bulk Analysis Project Page with Order Context

**CRITICAL**: NO NEW PAGES. Enhance existing `/clients/[clientId]/bulk-analysis/projects/[projectId]` page.

**Enhanced URL Patterns**:
```typescript
// Base URL (existing)
/clients/[clientId]/bulk-analysis/projects/[projectId]

// With order context (enhanced)  
/clients/[clientId]/bulk-analysis/projects/[projectId]?orderId=abc123

// With guided domain deep-dive (enhanced)
/clients/[clientId]/bulk-analysis/projects/[projectId]?orderId=abc123&guided=domainId
```

**Page Enhancement Requirements**:

##### 3.3.1 Order Context Detection
```typescript
// In existing /clients/[clientId]/bulk-analysis/projects/[projectId]/page.tsx
const searchParams = useSearchParams();
const orderId = searchParams.get('orderId'); // Order context
const guidedDomainId = searchParams.get('guided'); // Specific domain focus

// Load order-specific data if orderId present
if (orderId) {
  const orderContext = await loadOrderContext(orderId, clientId);
  // orderContext includes: selections, remaining links, order targets
}
```

##### 3.3.2 Order-Specific UI Enhancements
**Add to existing page when `orderId` query param present**:

1. **Order Context Header**:
   ```jsx
   {orderId && (
     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
       <div className="flex items-center justify-between">
         <div>
           <h3>Viewing analysis for Order #{orderId}</h3>
           <p>Client: {client.name} • {orderContext.remainingLinks} links needed</p>
           <p>Progress: {orderContext.selectedCount}/{orderContext.totalLinks} links selected</p>
         </div>
         <button onClick={() => router.back()}>← Back to Order</button>
       </div>
     </div>
   )}
   ```

2. **Domain Selection Context**:
   ```jsx
   // Modify existing domain cards/table
   <DomainCard 
     domain={domain}
     isOrderSuggested={orderContext?.suggestedDomains.includes(domain.id)}
     isOrderSelected={orderContext?.selectedDomains.includes(domain.id)}
     orderActions={orderId ? {
       addToOrder: () => addDomainToOrder(domain.id),
       removeFromOrder: () => removeDomainFromOrder(domain.id)
     } : null}
   />
   ```

3. **Order-Specific Actions**:
   ```jsx
   {orderId && (
     <div className="sticky bottom-0 bg-white border-t p-4">
       <div className="flex items-center justify-between">
         <span>Order Progress: {selectedCount}/{totalLinks} links</span>
         <div className="space-x-2">
           <button onClick={modifyOrderLinkCount}>Modify Link Count</button>
           <button onClick={changeOrderTargets}>Change Targets</button>
           <button onClick={saveSelections}>Save Selections</button>
         </div>
       </div>
     </div>
   )}
   ```

##### 3.3.3 Guided Domain Deep-Dive
**When `guided` query param present**:

1. **Auto-scroll and Highlight**:
   ```typescript
   useEffect(() => {
     if (guidedDomainId) {
       // Scroll to specific domain
       const domainElement = document.getElementById(`domain-${guidedDomainId}`);
       domainElement?.scrollIntoView({ behavior: 'smooth' });
       
       // Highlight domain
       setHighlightedDomain(guidedDomainId);
       
       // Show domain details modal/panel
       setShowDomainDetails(guidedDomainId);
     }
   }, [guidedDomainId]);
   ```

2. **Domain Suggestion Context**:
   ```jsx
   {guidedDomainId === domain.id && (
     <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
       <h4>Why this domain was suggested for your order:</h4>
       <ul>
         <li>✓ Matches target keywords: {domain.matchingKeywords}</li>
         <li>✓ High authority: DR {domain.dr}</li>
         <li>✓ Relevant traffic: {domain.traffic}/month</li>
         <li>✓ Content alignment: {domain.contentScore}% match</li>
       </ul>
     </div>
   )}
   ```

##### 3.3.4 User Type Permissions
```typescript
// Modify existing permission checks
const userCapabilities = {
  // Existing internal user capabilities
  canEditProject: session.userType === 'internal',
  canDeleteProject: session.userType === 'internal',
  canBulkOperations: session.userType === 'internal',
  canSeeInternalNotes: session.userType === 'internal',
  
  // Order-specific capabilities
  canSelectForOrder: !!orderId,
  canModifyOrder: session.userType === 'account' && !!orderId,
  canViewFullAnalysis: true, // Both user types
  canOverrideSuggestions: session.userType === 'account' && !!orderId,
};

// Hide/show UI elements based on capabilities
{userCapabilities.canEditProject && <ProjectSettingsButton />}
{userCapabilities.canModifyOrder && <ModifyOrderButton />}
{!userCapabilities.canSeeInternalNotes && <HideInternalNotes />}
```

##### 3.3.5 Navigation Integration
**From Order Pages**:

1. **Order Summary Page**:
   ```jsx
   // Order shows suggestions with links to detailed analysis
   <div className="suggestion-card">
     <h4>{domain.name}</h4>
     <p>Suggested for {client.name}</p>
     <button onClick={() => router.push(
       `/clients/${clientId}/bulk-analysis/projects/${projectId}?orderId=${orderId}&guided=${domainId}`
     )}>
       View Details
     </button>
   </div>
   ```

2. **Order Site Selection Page**:
   ```jsx
   // Full analysis link
   <button onClick={() => router.push(
     `/clients/${clientId}/bulk-analysis/projects/${projectId}?orderId=${orderId}`
   )}>
     View Full Analysis ({domainCount} domains)
   </button>
   ```

##### 3.3.6 Data Loading Enhancements
```typescript
// Enhance existing data loading
async function loadProjectData(projectId: string, orderId?: string) {
  const project = await getProject(projectId);
  
  if (orderId) {
    // Load order-specific context
    const orderContext = await db.query.orderSiteSelections.findMany({
      where: and(
        eq(orderSiteSelections.orderGroupId, orderGroupId),
        eq(orderSiteSelections.domainId, in(project.domains.map(d => d.id)))
      )
    });
    
    return {
      ...project,
      orderContext: {
        orderId,
        selectedDomains: orderContext.filter(s => s.status === 'approved'),
        suggestedDomains: orderContext.filter(s => s.status === 'suggested'),
        remainingLinks: linkCount - orderContext.length
      }
    };
  }
  
  return project;
}
```

##### 3.3.7 API Enhancements
**Existing API**: `/api/clients/[clientId]/bulk-analysis/projects/[projectId]`
**Enhanced to support order context**:

```typescript
// GET with optional order context
export async function GET(request: NextRequest, { params, searchParams }) {
  const orderId = searchParams.get('orderId');
  
  const project = await getProject(params.projectId);
  
  if (orderId) {
    // Include order-specific data
    const orderSelections = await getOrderSelections(orderId, params.clientId);
    return { ...project, orderContext: orderSelections };
  }
  
  return project;
}

// POST for order-specific actions
export async function POST(request: NextRequest, { params }) {
  const { action, orderId, domains } = await request.json();
  
  if (action === 'addToOrder' && orderId) {
    await addDomainsToOrder(orderId, domains);
  }
  
  if (action === 'modifyOrder' && orderId) {
    await modifyOrderDetails(orderId, request.body);
  }
}
```

**IMPLEMENTATION PRIORITY**:
1. ✅ Query param detection and order context loading
2. ✅ Order-specific UI elements (header, progress, actions)  
3. ✅ User permission modifications for account users
4. ✅ Guided domain deep-dive functionality
5. ✅ API enhancements for order context
6. ✅ Navigation integration from order pages

**NO NEW PAGES CREATED**. All functionality added to existing `/clients/[clientId]/bulk-analysis/projects/[projectId]` page with conditional rendering based on query parameters and user type.

#### 3.4 Updated Site Selection API

**Enhanced Endpoint**: `/api/orders/[id]/groups/[groupId]/site-selections`

```typescript
// GET - Now includes full project data access
interface GetSitesResponse {
  project: BulkAnalysisProject; // Full project data
  allAnalyzedDomains: BulkAnalysisDomain[]; // Complete domain pool
  suggestedDomains: BulkAnalysisDomain[]; // Team curated suggestions
  currentSelections: OrderSiteSelection[]; // Current order selections
  orderFlexibility: {
    canModifyLinkCount: boolean;
    canChangeTargets: boolean;
    canSelectFromFullPool: boolean;
  };
}
```

**Key Change**: Account users now get access to full bulk analysis project data, not just curated suggestions.

### Phase 4: Account User Review Interface ⚠️ NOT REVIEWED YET

**NOTE**: Phase 4 implementation has not been closely reviewed yet. Focus remains on Phase 3 flexible project associations and client bulk analysis access.
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

### Phase 4: Account User Dashboard & Shared Interface ❌ NOT STARTED

#### 4.1 Account Dashboard Implementation
**Path**: `/account/dashboard` ❌ NOT IMPLEMENTED

**Core Account Dashboard Features**:
1. **Dashboard Overview**: Active orders, pending reviews, monthly spend, order status
2. **Client Management**: Add/edit clients, manage target URLs per client
3. **Order Creation**: Self-service order builder (reuse internal order creation flow)
4. **Site Selection Review**: Approve/reject team suggestions, swap alternatives
5. **Limited Internal Data Access**: 
   - Bulk analysis results for their orders only
   - Workflow progress for their content only
   - No access to pricing, internal notes, or other customers' data
6. **Billing & Account Management**: Payment methods, invoices, account settings

#### 4.2 Shared Site Selection Interface ✅ DESIGNED
**Current**: Internal-only site selection
**Target**: Dual user type support with permission-based features

**Implementation Strategy**:
```typescript
// Same UI components, different capabilities based on userType
if (session.userType === 'internal') {
  // Full CRUD: Create, edit, delete selections
  // Access: Any order in system
} else if (session.userType === 'account') {
  // Limited: Approve/reject/swap suggestions only
  // Access: Only orders where order.accountId === session.accountId
}
```

**Shared Components**:
- Site cards with filtering and search
- Progress tracking and order summaries  
- Client management interfaces
- Target page assignment UI

**Account-Specific Features**:
- Content review workflows (`/account/orders/[id]/content`)
- Limited bulk analysis visibility (their projects only)
- Self-service client and order management
- Billing and payment management (`/account/billing`)
- Account settings and profile management (`/account/settings`)

### Phase 5: Workflow Generation ❌ NOT STARTED

#### 5.1 Auto-create on Approval
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

### Phase 6: Share Token System ❌ NOT STARTED

#### 6.1 Public Preview Page
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

#### 6.2 Token Generation API
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

## 🔴 Active Development Tasks & Technical Debt

### Current Sprint Tasks (2025-01-31)

| Task | Priority | Status | Notes |
|------|----------|--------|--------|
| **Implement invite-only account registration system** | 🔴 HIGH | ✅ COMPLETED | Secure invitation-based account creation |
| **Create account user onboarding flow** | 🔴 HIGH | ✅ COMPLETED | Interactive onboarding checklist with progress tracking |
| **Fix client dropdown in order creation** | 🔴 HIGH | ✅ COMPLETED | Fixed API response format mismatch |
| **Fix account dropdown using wrong table** | 🔴 HIGH | ✅ COMPLETED | Now uses accounts table, not users |
| **Implement payment recording system** | 🔴 HIGH | ✅ COMPLETED | Full payment flow with invoices |
| **Add email notifications for payments** | 🔴 HIGH | ✅ COMPLETED | Confirmation emails sent |
| **Fix TypeScript compilation errors** | 🔴 HIGH | ✅ COMPLETED | Field name mismatches resolved |
| **Implement client archive system** | 🔴 HIGH | ✅ COMPLETED | Soft delete with UI and API |
| **Implement AI permissions for accounts** | 🔴 HIGH | ✅ COMPLETED | Granular control over AI features |
| **Fix createdBy user reference** | 🟡 MEDIUM | ❌ PENDING | Needs proper auth system |
| **Integrate real domain metrics from DataForSEO** | 🟡 MEDIUM | ❌ PENDING | Currently hardcoded as DR:70, traffic:10000 |
| **Implement dynamic pricing calculation** | 🟡 MEDIUM | ❌ PENDING | Currently hardcoded as $100 per site |
| **Manual workflow trigger after payment** | 🟡 MEDIUM | ❌ PENDING | Currently requires button click |
| **Fix niche assignment logic** | 🟢 LOW | ❌ PENDING | Falls back to 'General' for all domains |
| **Re-implement account user audit tools** | 🟢 LOW | ❌ PENDING | `/admin/check-account-data` disabled |

### Technical Debt & Placeholders (CRITICAL FOR FUTURE FIXES)

#### Archive System Technical Debt (Added 2025-01-31)

**COMPLETED:**
- ✅ **Consistent Archive Behavior**: Archive/restore works identically for internal and account users
- ✅ **UI Implementation**: Archive modal, visual indicators, and list filtering
- ✅ **Permission Checking**: Proper authorization for archive operations
- ✅ **TypeScript Types**: Added archive fields to Client interface

**REMAINING TECHNICAL DEBT:**

**1. Foreign Key Constraint Issue**
- **Current**: Account users' archive actions show `archivedBy` as NULL
- **Reason**: FK constraint to users table prevents storing account IDs
- **Impact**: Can't track which account user performed archive action
- **Solution**: Consider polymorphic reference or separate archive_log table

**2. No Audit Log Table**
- **Current**: Archive operations only logged to console
- **Missing**: Permanent audit trail for compliance/debugging
- **Impact**: Can't review archive history or restore metadata

**3. No Bulk Operations**
- **Current**: Must archive/restore clients one at a time
- **Missing**: Bulk selection and archive functionality
- **Impact**: Time-consuming for users with many clients

**4. No Cascade Behavior**
- **Current**: Archiving client doesn't affect related data
- **Missing**: Option to archive/hide related orders, workflows
- **Impact**: Archived clients still show in order history

**5. Hard-coded System User**
- **Current**: Using UUID constant for system operations
- **Missing**: Dynamic system user lookup
- **Impact**: Breaks if system user ID changes

#### Payment System Technical Debt (Added 2025-01-31)

**COMPLETED (2025-01-31):**
- ✅ **Basic Invoice Generation**: Invoices table created with line items stored as JSONB
- ✅ **Payment History Table**: Full payments table tracking all transactions  
- ✅ **Email Notifications**: Payment confirmation emails sent automatically
- ✅ **Multiple Payment States**: Support for pending, completed, failed, refunded, partial, cancelled

**REMAINING TECHNICAL DEBT:**

**1. No Payment Processor Integration**
- **Current**: Manual payment recording only via internal users
- **Missing**: Stripe, PayPal, or other payment gateway integration
- **Impact**: Requires manual tracking and reconciliation

**2. Limited Payment Validation**
- **Current**: 3% tolerance for payment amount differences
- **Missing**: Configurable tolerance, currency conversion, tax handling

**3. Basic Error Handling**
- **Current**: Generic error messages in payment flow
- **Missing**: Specific payment failure reasons, retry logic, webhook handling

**4. Manual Workflow Trigger**
- **Current**: Separate button click after payment to generate workflows
- **Ideal**: Automatic workflow generation on payment confirmation

**5. No Payment Audit Trail**
- **Current**: Basic console.log for payment recording
- **Missing**: Proper audit log table with who/when/what/why

**6. Hard-coded UI Text**
- **Current**: Fixed messages like "Payment must be recorded before workflows"
- **Missing**: Configurable messaging, internationalization

**7. PDF Invoice Generation**
- **Current**: TODO comment in code, no PDF generation
- **Missing**: Actual PDF generation and cloud storage upload

**8. Payment Reports**
- **Current**: No reporting interface
- **Missing**: Admin dashboard for payment analytics, revenue reports

**9. Refund Management**
- **Current**: Status exists but no refund workflow
- **Missing**: Refund processing API, partial refund support

**10. Payment Reminders**
- **Current**: No automated reminders
- **Missing**: Automated payment reminder emails for pending invoices

### Technical Debt & Placeholders (CRITICAL FOR FUTURE FIXES)

#### 1. Hardcoded/Placeholder Values

**Location: `/app/api/orders/[id]/groups/[groupId]/site-selections/route.ts`**
- Lines 67-68, 106-107: Hardcoded metrics instead of real data
  ```typescript
  dr: 70, // TODO: Get from DataForSEO or other metrics
  traffic: 10000, // TODO: Get from DataForSEO or other metrics
  price: 100, // TODO: Calculate based on metrics
  ```

**Location: `/app/api/orders/new/route.ts`** (FIXED 2025-01-30)
- ~~Line 109: `createdBy: '00000000-0000-0000-0000-000000000000'`~~ → Now uses `session.userId`

#### 2. ✅ Authentication System (COMPLETED 2025-01-30)

**What's Been Implemented:**
- ✅ Login page for account users (`/account/login`)
- ✅ Account session creation endpoint (`/api/auth/account/login`)
- ✅ Password reset flow (`/account/forgot-password`, `/account/reset-password`)
- ✅ Account settings page (`/account/settings`)
- ✅ JWT refresh mechanism (`/api/auth/account/refresh`)
- ✅ Logout endpoint (`/api/auth/account/logout`)
- ✅ Account dashboard fully accessible with auth wrapper

**Still Pending:**
- ❌ Account registration flow (`/api/accounts/register`) - Invite-only system needed

**Location: `/app/api/orders/new/route.ts`**
- Lines 38-40: Blocks account creation with error message
  ```typescript
  throw new Error('Account creation not supported in order flow. Please create account first.')
  ```

#### 3. Incomplete Features

**Location: `/app/clients/new/page.tsx`** (Created 2025-01-30)
- Missing default requirements fields (min DR, min traffic, niches)
- Target pages lack validation and status field
- Using sessionStorage for navigation (breaks with multiple tabs)

**Location: `/app/api/orders/[id]/groups/[groupId]/site-selections/route.ts`**
- Line 159: Checks for non-existent `body.action` field
- Permission validation incomplete

#### 4. Disabled Admin Tools

**Location: `/app/api/admin/check-account-data/route.ts`**
- Returns empty array instead of actual data
- `/api/admin/fix-account-data` non-functional

### Authentication Audit Results (Completed 2025-01-30)

During the authentication audit, we discovered and fixed several critical security issues:

**Critical Vulnerabilities Fixed:**
1. `/api/orders/new/route.ts` - NO AUTHENTICATION
   - Added internal-only authentication check
   - Fixed account validation to use accounts table (not users table)
   
2. `/api/orders/[id]/confirm/route.ts` - NO AUTHENTICATION
   - Added internal-only authentication check
   - Prevents unauthorized order confirmations

3. `/api/orders/calculate-pricing/route.ts` - NO AUTHENTICATION
   - Added authentication requirement
   - Prevents pricing information leakage

**Permission Bugs Fixed:**
1. `/api/account/clients/route.ts`
   - Fixed to use `session.accountId` instead of `session.userId`
   
2. `/api/orders/[id]/route.ts`
   - Fixed account permission check to use `session.accountId`
   
3. `/api/orders/route.ts`
   - Fixed GET to use `session.accountId` for account users
   - Fixed POST to use `session.accountId` when creating orders

**APIs Verified Secure:**
- `/api/orders/[id]/groups/[groupId]/site-selections/route.ts` ✓
- `/api/bulk-analysis/assigned-projects/route.ts` ✓
- `/api/accounts/search/route.ts` ✓
- `/api/orders/[id]/items/route.ts` ✓
- `/api/orders/share/[token]/route.ts` ✓ (intentionally public)

### Quick Fixes Applied (2025-01-30)

After documenting the technical debt above, the following simple fixes were implemented:

**Client Form Improvements (`/app/clients/new/page.tsx`):**
- ✅ Added email format validation (regex check)
- ✅ Added URL format validation (new URL() check)
- ✅ Added duplicate client detection (checks name & website)
- ✅ Added phone number auto-formatting (US format)
- ✅ Added industry dropdown with 15 common options

**Authentication Improvements:**
- ✅ Better error messages (e.g., "Access denied. This action requires internal user privileges.")
- ✅ Fixed createdBy in `/api/orders/new/route.ts` to use `session.userId`
- ✅ Separated 401 (not authenticated) from 403 (no permission) responses

## Next Steps & Priority

### Immediate Priorities

1. **Complete Authentication System** (Current Blocker)
   - ✅ Site selection API supports dual user types (implemented 2025-01-30)
   - ✅ AuthServiceServer updated to handle account users (implemented 2025-01-30)
   - ✅ JWT tokens include accountId field (implemented 2025-01-30)
   - ❌ **Missing**: Account user login system
   - ❌ **Missing**: Account session creation flow
   - ❌ **Missing**: Account-specific middleware

2. **Phase 4: Account Dashboard & Shared Interface** (Next Priority)
   - ✅ **Design Complete**: Shared interface architecture documented
   - ✅ **API Support**: Dual user type support in site selection API (implemented 2025-01-30)
   - ✅ **Permission Model**: Different capabilities for internal vs account users (implemented 2025-01-30)
   - ❌ **Implementation Needed**: Account dashboard (`/account/dashboard`)
   - ❌ **Implementation Needed**: Account authentication flow

3. **Phase 5: Workflow Generation** ✅ (Implemented 2025-01-30)
   - ✅ **WorkflowGenerationService**: Complete service for creating workflows from approved sites
   - ✅ **API Endpoints**: `/api/orders/[id]/generate-workflows` and group-specific endpoint
   - ✅ **Payment Check**: Workflows only generate after payment (unless skipPaymentCheck: true)
   - ✅ **User Assignment**: Auto-assigns based on workload or specific user
   - ✅ **Order Items**: Creates order items linking workflows to orders
   - ✅ **Pre-filled Data**: Workflows start with data from site selections
   - ⚠️ **Important**: Removed auto-generation on approval - now requires payment first

### Account Lifecycle Management Gaps (Not Yet Specified)
4. **Share Token System** (Phase 6 - Prospect Conversion)
   - Public preview pages for order sharing
   - "Create Account & Approve" conversion flow
   - Seamless prospect → account experience
   - **NOTE**: User experience flow details needed from user

5. **Account Self-Service System**
   - Complete account dashboard functionality
   - Account profile management
   - Password change/account settings
   - Order history and workflow progress views
   - **NOTE**: Specific requirements needed from user

6. **Account Onboarding & Communication**
   - Email notification system for order updates
   - Account onboarding workflow
   - Client communication templates
   - **NOTE**: Business process details needed from user

### Operational Workflow Gaps (Not Yet Specified)
7. **Internal Team Coordination**
   - Team assignment logic for workflows
   - Workload management and balancing
   - Quality assurance checkpoints
   - **NOTE**: Internal process requirements needed from user

8. **Business Process Integration**
   - Client communication workflow
   - Order approval/revision cycles
   - Internal team coordination tools
   - **NOTE**: Business requirements needed from user

### Workflow Generation & Payment System (Added 2025-01-30)

The workflow generation system is now payment-aware:

1. **Payment Check by Default**
   - Workflows can only be generated after `order.paidAt` is set
   - Prevents work from starting before payment confirmation
   - Error message: "Order has not been paid yet"

2. **Flexible Payment Options**
   - Pass `skipPaymentCheck: true` to override for special cases
   - Supports different payment terms (pay upfront vs pay after)
   - Internal users can override with manual generation

3. **Generation Options**
   ```json
   {
     "skipPaymentCheck": false,  // Set true to override payment check
     "assignToUserId": "uuid",    // Assign to specific user
     "autoAssign": true          // Auto-assign based on workload
   }
   ```

4. **UI Behavior**
   - WorkflowGenerationButton shows "Awaiting Payment" when unpaid
   - Button disabled until payment received
   - Site approval no longer triggers automatic workflow generation

### Updated Implementation Timeline & Status (2025-01-31)

#### ✅ Completed Phases
- **Phase 1**: Order Builder Interface
- **Phase 2**: Bulk Analysis Integration  
- **Phase 3**: Site Selection Interface
- **Phase 5**: Workflow Generation (payment-aware)
- **Authentication**: Complete system with JWT, password reset, rate limiting
- **Payment System**: Manual recording with invoices and email notifications
- **Invitation System**: Admin-managed account creation with email invites

#### 🚧 Current Blockers
1. **Invite-Only Registration** ✅ COMPLETED (2025-01-31)
   - ✅ Admin invitation system built (`/admin/account-invitations`)
   - ✅ Email invitations with 7-day expiration
   - ✅ Registration page accepts tokens (`/register/account`)
   - ✅ Account creation flow complete
   - ✅ Email notifications (invitation + welcome)
   
2. **Account Creation in Order Flow** ✅ RESOLVED
   - Order flow requires existing accounts (by design)
   - Accounts created through invitation system
   - Admin users send invitations from dashboard

3. **Phase 4: Account Dashboard** (Partially Complete)
   - Auth system ✅ Complete
   - Dashboard UI ✅ Complete
   - Account creation ✅ Complete via invitations

#### 📋 Feature Readiness
- ✅ Order builder works (accounts created via invitation)
- ✅ Client selection works
- ✅ Bulk analysis creates projects
- ✅ Site selection interface complete
- ✅ Payment recording system complete
- ✅ Workflow generation ready (after payment)
- ✅ **Account creation via invitation system**
- ✅ **Full order flow now testable!**
- ❌ Share token system not started

### Critical Understanding
The system currently has a **complete technical foundation** but several **user experience and business process gaps** that require detailed requirements from the user before implementation can proceed. Each major feature area marked with "NOTE" needs user input to define:

1. **User experience flows** (how should accounts interact?)
2. **Business process requirements** (what workflows need to happen?)
3. **Communication strategies** (what emails/notifications?)
4. **Internal team processes** (how should work be assigned/managed?)

This architecture provides a complete, data-driven order system that leverages existing client data while providing unprecedented transparency and flexibility for accounts.

## Invitation System (Added 2025-01-31)

The invite-only account registration system provides controlled access to customer accounts:

### Key Features
1. **Admin-Only Invitations**
   - Only admin users can send invitations
   - Available at `/admin/account-invitations`
   - Track all invitations (pending, used, expired, revoked)

2. **Secure Token System**
   - Cryptographically secure tokens (base64url)
   - 7-day expiration by default
   - One-time use (marked as used after registration)
   - Can be revoked before use

3. **Registration Flow**
   - Invitation email sent with registration link
   - Registration page at `/register/account?token=XXX`
   - Pre-filled email from invitation
   - Password requirements enforced
   - Welcome email sent after successful registration

4. **API Endpoints**
   - `POST /api/invitations/send-account` - Send invitation
   - `GET /api/invitations/verify` - Verify token validity
   - `POST /api/register/account` - Complete registration
   - `GET /api/invitations` - List all invitations
   - `POST /api/invitations/[id]/revoke` - Revoke invitation

### Usage Flow
1. Admin navigates to `/admin/account-invitations`
2. Clicks "Send Invitation" and enters email
3. System sends invitation email with unique link
4. Recipient clicks link and completes registration
5. Account is created and marked as active
6. User redirected to account login page

This system ensures that only authorized customers can create accounts while maintaining security and providing a smooth onboarding experience.

## Account User Onboarding Flow (Added 2025-01-31)

### ✅ **IMPLEMENTATION COMPLETE**

**Purpose**: Guide new account users through essential setup steps to ensure successful platform adoption.

### **Features Implemented**

1. **Interactive Onboarding Checklist** (`/components/OnboardingChecklist.tsx`)
   - 6-step progressive checklist with visual progress bar
   - Smart completion detection with API tracking
   - Direct action buttons to relevant pages
   - Dismissible interface with completion celebration

2. **Database Tracking** (Migration: `/admin/migrate-onboarding`)
   - `onboarding_completed` (BOOLEAN) - Overall completion status
   - `onboarding_steps` (JSONB) - Individual step completion tracking
   - `onboarding_completed_at` (TIMESTAMP) - Completion timestamp
   - Performance index on completion status

3. **Dashboard Integration**
   - Onboarding checklist appears for new users on dashboard
   - Auto-hides when all steps completed
   - Can be manually dismissed
   - Reloads dashboard data after completion

4. **Enhanced Welcome Email**
   - Professional gradient design
   - Embedded checklist preview
   - Direct dashboard link
   - Support contact information

### **Onboarding Steps**

| Step | Title | Description | Action |
|------|-------|-------------|--------|
| 1 | Complete Profile | Add company info and contact details | `/account/settings` |
| 2 | Set Up Brand | Add website and target pages | `/clients/new` |
| 3 | Create First Order | Start first guest posting campaign | `/orders/new` |
| 4 | Review Domains | Explore publisher network | `/domains` |
| 5 | Read Guidelines | Understand quality standards | `/help/content-guidelines` |
| 6 | Configure Preferences | Set notifications and delivery prefs | `/account/settings#preferences` |

### **API Endpoints**

```typescript
// Track onboarding progress
POST /api/accounts/onboarding
{
  "stepId": "complete_profile",
  "completed": true
}

// Get onboarding status
GET /api/accounts/onboarding
// Returns: { onboardingCompleted, onboardingSteps, onboardingCompletedAt }
```

### **Admin Migration Page**

- **Path**: `/admin/migrate-onboarding`
- **Purpose**: Safe database migration with diagnostics
- **Features**: Current state check, migration execution, error reporting
- **Access**: Admin-only with proper authentication

### **User Experience Flow**

1. **New Account Registration** (via invitation)
   - Account created with onboarding tracking enabled
   - Welcome email sent with checklist preview

2. **First Dashboard Visit**
   - Onboarding checklist displayed prominently
   - Progress bar shows 0/6 completed
   - User guided through essential setup tasks

3. **Step Completion**
   - Click action button → Navigate to relevant page
   - Complete task → Step automatically marked complete
   - Progress bar updates in real-time

4. **Completion Celebration**
   - All steps completed → Success message shown
   - Dashboard switches to normal view
   - User fully onboarded and ready to use platform

### **Technical Implementation**

```typescript
// Component usage in dashboard
{onboardingData.showChecklist && !onboardingData.completed && (
  <OnboardingChecklist
    accountId={user?.id || ''}
    onboardingSteps={onboardingData.steps}
    onClose={() => setOnboardingData(prev => ({ ...prev, showChecklist: false }))}
    onComplete={() => {
      setOnboardingData(prev => ({ ...prev, completed: true, showChecklist: false }));
      loadDashboardData();
    }}
  />
)}
```

This onboarding system ensures new account users understand the platform and complete essential setup steps, improving user activation and reducing support burden.

## Archive System Implementation (Added 2025-01-31)

### ✅ **IMPLEMENTATION COMPLETE**

**Purpose**: Provide soft delete functionality for clients with consistent behavior across all interfaces.

### **Features Implemented**

1. **Database Schema** (Migration: `/admin/client-archive-migration`)
   - `archivedAt` (TIMESTAMP) - Archive timestamp (null = active)
   - `archivedBy` (UUID) - User who archived (NULL for account users due to FK)
   - `archiveReason` (TEXT) - Optional reason for archiving
   
2. **API Endpoints**
   - `POST /api/clients/[id]/archive` - Archive a client
   - `POST /api/clients/[id]/restore` - Restore an archived client
   - Consistent behavior for both internal and account users
   
3. **UI Implementation**
   - Archive button with confirmation modal on client detail pages
   - Visual indicators for archived clients (gray text, archive icon)
   - "Include Archived" toggle in client lists
   - Archive/restore tracked in audit logs

4. **Permission Model**
   - Internal users: Can archive/restore any client
   - Account users: Can only archive/restore their own clients
   - Proper error messages for permission violations

### **Technical Details**

```typescript
// Archive operation
await db.update(clients)
  .set({
    archivedAt: new Date(),
    archivedBy: isInternalUser ? session.userId : null, // FK constraint
    archiveReason: reason || null,
    updatedAt: new Date()
  })
  .where(eq(clients.id, clientId));
```

### **Known Limitations**
- Account users' archive actions show `archivedBy` as NULL due to foreign key constraint
- Archive operations logged in console but not in separate audit table
- No bulk archive functionality
- No automatic archive of related data (orders, workflows)

## AI Permissions System (Added 2025-01-31)

### ✅ **IMPLEMENTATION COMPLETE**

**Purpose**: Control account user access to AI-powered features with granular permissions.

### **Features Implemented**

1. **Database Schema** (Migration: `/api/admin/add-ai-permissions`)
   - `canUseAiKeywords` (BOOLEAN) - AI keyword generation permission
   - `canUseAiDescriptions` (BOOLEAN) - AI description generation permission  
   - `canUseAiContentGeneration` (BOOLEAN) - Future AI content features
   - `aiPermissions` (JSONB) - Extensible permissions object

2. **Admin Management UI**
   - AI Permissions modal in accounts management page
   - Visual indicators (K/D/C badges) for enabled features
   - Purple wand icon to access permission settings
   - Real-time permission updates

3. **Client Pages Integration**
   - AI features hidden by default for account users
   - Features conditionally rendered based on permissions
   - Internal users always have full access
   - Permission checks on page load

4. **API Endpoint**
   - `PATCH /api/accounts/[id]/permissions` - Update AI permissions
   - Internal-only endpoint with proper authentication
   - Tracks who updated permissions and when

### **Permission Model**

```typescript
// Internal users - always full access
if (session.userType === 'internal') {
  setAiPermissions({
    canUseAiKeywords: true,
    canUseAiDescriptions: true,
    canUseAiContentGeneration: true
  });
}

// Account users - check database permissions
else if (session.userType === 'account') {
  const account = await fetchAccountData(session.accountId);
  setAiPermissions({
    canUseAiKeywords: account.canUseAiKeywords || false,
    canUseAiDescriptions: account.canUseAiDescriptions || false,
    canUseAiContentGeneration: account.canUseAiContentGeneration || false
  });
}
```

### **UI Behavior**
- Keyword generation button hidden without permission
- Description generation button hidden without permission
- Bulk AI operations hidden without permission
- Clear visual feedback when features are restricted

### **Future Extensibility**
The `aiPermissions` JSONB field allows for future granular permissions:
- Rate limiting per feature
- Usage quotas
- Model selection permissions
- Advanced feature toggles

## Critical Database Schema Fix (2025-01-31)

### Invitations Table Schema Mismatch ✅ RESOLVED

**Issue**: Account invitations were failing with database error:
```
Error: Failed query: select 'id', 'email', 'target_table', 'role', 'token'... 
ERROR: column "target_table" does not exist
```

**Root Cause**: The Drizzle schema expected a `target_table` column in the `invitations` table, but the actual database table was missing this column.

**Resolution**: Created migration tools at:
- **API Route**: `/api/admin/fix-invitations-table` - Database migration endpoint
- **Admin UI**: `/admin/fix-invitations-table` - User-friendly migration interface  

**Schema Changes Applied**:
- ✅ Added missing `target_table` VARCHAR(20) column (default: 'accounts')
- ✅ Added missing `role` VARCHAR(50) column (default: 'user')
- ✅ Renamed `accepted_at` → `used_at` if needed
- ✅ Added missing `revoked_at` TIMESTAMP column
- ✅ Added missing `created_by_email` VARCHAR(255) column
- ✅ Validated schema with exact failing query

**Result**: Account invitation system now works properly without database errors.

## Account User Session Fix (2025-08-01)

### ✅ **FIXED: Account Users Couldn't See Their Clients**

**Issue**: Account users were unable to see their clients in the order creation dropdown at `/orders/new`.

**Root Cause**: The JWT session for account users was missing the `accountId` field, causing API endpoints to fail with "Account ID not found in session" errors.

**Discovery Process**:
1. Created diagnostic tools at `/account/debug-client-loading` to test session data
2. Found that session had `userId` but no `accountId` field
3. Discovered that for account users, `session.userId` IS their account ID (from accounts table)

**Resolution**: Updated all account API endpoints to use `session.userId` instead of `session.accountId`:
- `/api/account/clients` - Now correctly fetches clients for account users
- `/api/account/profile` - GET and PUT methods fixed
- `/api/account/change-password` - Password change functionality fixed

**Technical Details**:
```typescript
// OLD (broken) - Expected accountId in session
if (!session.accountId) {
  return NextResponse.json({ error: 'Account ID not found in session' }, { status: 400 });
}
const accountClients = await db.query.clients.findMany({
  where: eq(clients.accountId, session.accountId),
});

// NEW (fixed) - Uses userId for account users
const accountId = session.userId; // For account users, userId IS their account ID
const accountClients = await db.query.clients.findMany({
  where: eq(clients.accountId, accountId),
});
```

**Key Learning**: The authentication system sets both `userId` and `accountId` to the same value during login, but the client-side session only includes `userId`. All account endpoints must use `session.userId` to access account data.

## Order Creation Interface Redesign (2025-08-01)

### 🚧 **IN PROGRESS: Unified Order Interface** 

**Problem**: The existing order creation page needs to serve both simple users (1 brand, few links) and power users (agencies with many clients) without being confusing or overwhelming.

**Core Design Principle**: **One interface, not two** - No toggles, no modes, no progressive disclosure.

### **Issues with Common UI Patterns**

**1. Mode Toggles = Design Failure**
- Toggles mean you couldn't design one interface that works for everyone
- Forces users to choose between "simple" and "advanced" when they just want to order
- Creates maintenance burden - two interfaces to maintain
- Fragments the user experience

**2. Progressive Disclosure = Patronizing**
- Hiding features from users who want to order is counterproductive
- Users ordering links want to see their options upfront, not have things revealed
- "This is for babies" - if someone is ordering, they're not beginners
- Creates confusion about what's available

**3. The Real Challenge**
An order form should:
- Show all capabilities immediately
- Make simple tasks simple without hiding advanced features
- Scale naturally from 1 link to 50 links
- Work for single clients and multi-client agencies
- Feel natural and obvious, not clever or complex

### **Required Solution Approach**

**Core Requirement**: Design a single interface that naturally accommodates:
- **Simple User**: 1 brand, 5 links, wants it easy
- **Power User**: Agency with 30 clients, 50+ links, needs granular control
- **Everyone In Between**: Without making them choose modes or wait for reveals

**Key Features Needed**:
1. **Granular anchor text control** - Some users want specific anchor text per link
2. **Smart auto-fill** - Leverage existing target pages effectively  
3. **Bulk operations** - Easy for agencies to add many links at once
4. **Line item system** - Clear view of exactly what's being ordered
5. **Natural flow** - From simple to detailed as needed, without modes

### **Current Implementation Status**

**Files Modified**:
- `/app/orders/new/page.tsx` - Main order creation interface
- `/app/orders/legacy/original-new-page.tsx` - Moved old implementation

**Current Approach Issues**:
- Still includes toggle between "simple" and "advanced" modes
- Still uses progressive disclosure patterns (hiding Quick Add after first use)
- Creates two different user experiences instead of one unified flow

### **Unified Interface Design Plan**

**Analysis of User Workflows**:
1. **Simple User (1 client, 5 links)**: Wants quick bulk addition for one brand
2. **Power User (30 clients, 50 links)**: Wants granular control + efficient bulk operations  
3. **Mixed User**: Same person doing both depending on the order size

### **Solution Architecture: Three-Column Full-Screen Layout**

**Core Principle**: Use the entire screen with three specialized columns that work together dynamically - no cramped forms or hidden features.

**Design Strategy**:
1. **Left Column**: Client selection with checkboxes and link counts
2. **Middle Column**: Dynamic order line items that populate based on selections
3. **Right Column**: Target URLs for selected clients with metadata
4. **Natural Flow**: Select clients → See their targets → Build specific line items by clicking
5. **Full Screen**: Utilizes entire viewport for maximum information density

**Key Components**:
```
Full-Screen Three-Column Order Interface:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Create New Order                                          │
├───────────────┬─────────────────────────────────────┬───────────────────────────────┤
│ LEFT SIDEBAR  │            MIDDLE COLUMN            │         RIGHT SIDEBAR         │
│ Client List   │         Order Line Items            │      Target URLs             │
├───────────────┼─────────────────────────────────────┼───────────────────────────────┤
│ ☑️ ClientA    │ ┌─────────────────────────────────┐ │ ClientA Target Pages:         │
│   [5] links   │ │ Row 1: ClientA → PageA → $100  │ │ • PageA (DR:70, 10k traffic) │
│               │ └─────────────────────────────────┘ │ • PageB (DR:65, 5k traffic)  │
│ ☑️ ClientB    │ ┌─────────────────────────────────┐ │ • PageC (DR:80, 15k traffic) │
│   [3] links   │ │ Row 2: ClientA → PageB → $100  │ │                               │
│               │ └─────────────────────────────────┘ │ ClientB Target Pages:         │
│ ☐ ClientC     │ ┌─────────────────────────────────┐ │ • PageX (DR:75, 8k traffic)  │
│   [0] links   │ │ Row 3: ClientB → PageX → $100  │ │ • PageY (DR:60, 12k traffic) │
│               │ └─────────────────────────────────┘ │                               │
│ ☐ ClientD     │                                     │ [Empty - select clients       │
│   [0] links   │ [Click target URLs on right →]     │  to see target pages]         │
│               │ [to populate rows here]             │                               │
│ Total: 8 links│                                     │ [Clickable URLs populate      │
│ Total: $800   │                                     │  middle column rows]          │
└───────────────┴─────────────────────────────────────┴───────────────────────────────┘
```

**User Experience Flow**:

**For Simple Users (1 client, 5 links)**:
1. **Left**: Check ClientA, set links to 5
2. **Right**: See ClientA's target pages appear with metadata
3. **Middle**: Click target pages 5 times to populate 5 order rows
4. **Result**: 5 specific line items ready for ordering
5. **Granular Control**: Edit anchor text in any row if desired

**For Power Users (agencies, complex orders)**:
1. **Left**: Check multiple clients (ClientA: 10, ClientB: 15, ClientC: 25)
2. **Right**: See all selected clients' target pages with filtering/search
3. **Middle**: Click target pages strategically to build specific combinations
4. **Efficiency**: Click same target multiple times for bulk assignment
5. **Granular Control**: Fine-tune each line item individually

**Natural Scaling**: Interface works identically for 5 links or 50 links - no mode switching needed.

**Key Interactions**:
- **Left Sidebar**: Checkbox client → See their targets on right → Count updates total
- **Right Sidebar**: Click target URL → Populates new row in middle → Can click again for duplicates
- **Middle Column**: Full granular control - edit anchor text, swap targets, remove rows
- **Dynamic Updates**: All columns update in real-time as selections change

**Implementation Plan**:
1. ✅ Document the problems with current approach
2. ✅ Create unified interface design plan  
3. ✅ **Updated to three-column full-screen approach**
4. 🔄 **NEXT: Implement three-column layout without toggles/progressive disclosure**
5. Test with both simple and power user scenarios
6. Ensure responsive design for different screen sizes

**Current Status**: Three-column design plan complete - ready to implement full-screen unified interface that naturally serves all user types through spatial organization and direct interaction.

### **Three-Column Technical Implementation Details**

**Component Structure**:
```typescript
interface OrderBuilderState {
  selectedClients: Map<string, { selected: boolean; linkCount: number }>;
  availableTargets: Map<string, TargetPage[]>; // Keyed by clientId
  orderLineItems: OrderLineItem[];
  totalCost: number;
}

interface TargetPageWithMetadata {
  id: string;
  url: string;
  keywords: string[];
  dr: number;
  traffic: number;
  clientId: string;
  clientName: string;
}
```

**Key Features**:
1. **Smart Target Filtering**: Right sidebar shows only targets for selected clients
2. **Real-time Totals**: Left sidebar updates counts as middle column changes
3. **Duplicate Management**: Same target can be used multiple times for different anchor texts
4. **Visual Feedback**: Clear indication of which targets have been used and how many times
5. **Bulk Operations**: Shift+click or bulk select targets for rapid population

**Responsive Considerations**:
- **Desktop**: Full three-column layout (1200px+)
- **Tablet**: Stack to two columns (left+middle, right becomes modal/drawer)
- **Mobile**: Single column with tab navigation between client/target/order views

**Advanced Interactions**:
- **Drag & Drop**: Drag targets from right sidebar to middle column
- **Keyboard Shortcuts**: Quick client selection, target search, row navigation
- **Bulk Assignment**: Select multiple targets and assign to multiple rows at once
- **Template Saves**: Save common client+target combinations for future orders

**Data Flow**:
1. **Client Selection** (Left) → Triggers target loading for right sidebar
2. **Target Click** (Right) → Creates new line item in middle column
3. **Line Item Edit** (Middle) → Updates totals in left sidebar and order state
4. **Real-time Sync**: All three columns stay synchronized through shared state

This approach eliminates the need for any toggles, modes, or progressive disclosure by using spatial separation and direct manipulation to handle complexity naturally.

## Active Technical Debt (Updated 2025-08-01)

### Account Features Integration Debt

**Status**: Account dashboard and features need comprehensive integration work with the actual app.

**Issues Identified**:
1. **Account Dashboard**: Basic implementation exists but not properly integrated with real app functionality
2. **Feature Integration**: Account features developed rapidly without full integration testing
3. **User Experience**: Account flow and features need refinement and proper UX testing
4. **Missing Routes**: Some onboarding checklist items point to non-existent routes
5. **Dynamic Metrics**: Account dashboard shows placeholder data instead of real metrics
6. **Navigation**: Account-specific navigation and user flows need polish

**Next Steps**:
- [ ] Comprehensive integration testing of account features
- [ ] Create missing routes referenced in onboarding checklist
- [ ] Replace placeholder data with real metrics and functionality
- [ ] Refine account user experience and flows
- [ ] Test complete end-to-end account journey

## Phase 3.5 Implementation Progress (2025-08-02)

### What We Built

Successfully implemented flexible project-order associations allowing bulk analysis projects to be reused across multiple orders, with unified interfaces leveraging existing components.

### Key Accomplishments

1. **Database Architecture**
   - Created `projectOrderAssociations` schema for many-to-many relationships
   - Replaced rigid `orderSiteSelections` with flexible `orderSiteSubmissions`
   - Full audit trail with timestamps and metadata tracking

2. **API Endpoints**
   - Internal user status management endpoint
   - Account user review actions endpoint  
   - Unified submission fetching with security boundaries

3. **UI Integration**
   - **Bulk Analysis Enhancement**: Order context awareness with ?orderId parameter
   - **Order Site Review**: Complete rewrite using BulkAnalysisTable component
   - **Guided Domain Functionality**: Preserved existing deep-dive features
   - Three-tab interface: Pending | All | Approved

4. **Security Implementation**
   - Comprehensive permission checks at all levels
   - Cross-client data isolation enforced
   - Full audit trail for all actions

### Placeholders & Technical Debt

#### API Response Type Safety
- Used `any` types in several places instead of proper interfaces
- Domain conversion has loose typing
- API responses aren't fully typed

#### Error Handling
- Basic try/catch with console.error
- No retry logic for failed API calls
- No graceful degradation if bulk analysis project missing

#### Performance Optimizations
- No caching of domain data between tabs
- Fetches all data on every tab switch
- No debouncing on status updates
- Missing optimistic UI updates

#### Feature Completeness
```typescript
// Placeholder handlers
const handleCreateWorkflow = (domain: BulkAnalysisDomain) => {
  console.log('Create workflow:', domain);
};
const handleDeleteDomain = async (domainId: string) => {
  console.log('Delete domain:', domainId);
};
```

#### Business Logic Gaps
- No validation that approved count matches required links
- No prevention of over-approval
- No bulk approval/rejection capabilities
- No export functionality for approved sites

#### Security Shortcuts
- Permission checks are basic (just userType checks)
- No rate limiting on API endpoints
- Audit trail in metadata is unstructured JSON

#### Database Schema Compromises
```typescript
metadata: json('metadata').$type<Record<string, any>>(),
// Should be properly typed for status history, review history, etc.
```

#### Missing Integration Features
- No email notifications when status changes
- No webhooks for external systems
- No activity feed or timeline view
- No bulk import/export capabilities

#### Code Organization
- Inline type definitions instead of shared types file
- Duplicated logic between endpoints
- No service layer abstraction (direct DB queries in routes)
- Mixed concerns in API routes

#### State Management
- Local component state instead of global state management
- Multiple API calls that could be consolidated
- Tab state resets on page refresh

### Most Critical to Address Next

1. **Type safety** - Add proper interfaces for all API responses
2. **Error handling** - Implement proper error boundaries and user feedback
3. **Performance** - Add caching and optimistic updates
4. **Business logic** - Validate link counts and prevent over-approval
5. **Security** - Add rate limiting and structured audit trails

These were conscious trade-offs to get a working system quickly that could be refined based on user feedback.

## Related Documentation

- [Database Schema](../architecture/DATABASE.md) - Full database structure
- [API Routes](../api/README.md) - API endpoint documentation
- [User Types](./USER_TYPES.md) - User type definitions and permissions
- [Client Security Implementation](./CLIENT_SECURITY_IMPLEMENTATION.md) - Similar security pattern for client management
- [Phase 3 Implementation Summary](./PHASE_3_IMPLEMENTATION_SUMMARY.md) - Detailed implementation summary