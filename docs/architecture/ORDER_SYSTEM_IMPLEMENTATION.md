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

### Current Sprint Tasks (2025-01-30)

| Task | Priority | Status | Notes |
|------|----------|--------|--------|
| **Implement dual user type support for site selection API** | 🔴 HIGH | ✅ COMPLETED | API now supports both internal and account users |
| **Fix all userType compilation errors** | 🔴 HIGH | ✅ COMPLETED | Build passes successfully |
| **Audit and fix auth mistakes in previous phases** | 🔴 HIGH | ✅ COMPLETED | Fixed all critical auth issues found |
| **Implement account authentication system** | 🔴 HIGH | ✅ COMPLETED | Login, password reset, settings, JWT refresh, role management |
| **Implement Phase 4: Account Dashboard UI** | 🔴 HIGH | ✅ COMPLETED | Dashboard, orders view, site selection interface |
| **Create account user onboarding flow** | 🔴 HIGH | ❌ PENDING | Registration, invitation acceptance for accounts |
| **Fix 'Add Client' button 404 error** | 🟡 MEDIUM | ✅ COMPLETED | Added "Create New Client" option in dropdown |
| **Fix createdBy user reference** | 🟡 MEDIUM | ❌ PENDING | Needs proper auth system |
| **Integrate real domain metrics from DataForSEO** | 🟡 MEDIUM | ❌ PENDING | Currently hardcoded as DR:70, traffic:10000 |
| **Implement dynamic pricing calculation** | 🟡 MEDIUM | ❌ PENDING | Currently hardcoded as $100 per site |
| **Fix incomplete permission validation** | 🟡 MEDIUM | ✅ COMPLETED | Site selection API validates account ownership |
| **Fix niche assignment logic** | 🟢 LOW | ❌ PENDING | Falls back to 'General' for all domains |
| **Re-implement account user audit tools** | 🟢 LOW | ❌ PENDING | `/admin/check-account-data` disabled |

### Technical Debt & Placeholders (CRITICAL FOR FUTURE FIXES)

#### Payment System Technical Debt (Added 2025-01-31)

**1. No Payment Processor Integration**
- **Current**: Manual payment recording only via internal users
- **Missing**: Stripe, PayPal, or other payment gateway integration
- **Impact**: Requires manual tracking and reconciliation

**4. Limited Payment Validation**
- **Current**: 3% tolerance for payment amount differences
- **Missing**: Configurable tolerance, currency conversion, tax handling

**6. Basic Error Handling**
- **Current**: Generic error messages in payment flow
- **Missing**: Specific payment failure reasons, retry logic, webhook handling

**8. Manual Workflow Trigger**
- **Current**: Separate button click after payment to generate workflows
- **Ideal**: Automatic workflow generation on payment confirmation

**9. No Payment Audit Trail**
- **Current**: Basic console.log for payment recording
- **Missing**: Proper audit log table with who/when/what/why

**10. Hard-coded UI Text**
- **Current**: Fixed messages like "Payment must be recorded before workflows"
- **Missing**: Configurable messaging, internationalization

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

### Updated Implementation Timeline & Status (2025-01-30)

#### ✅ Completed Phases
- **Phase 1**: Order Builder Interface
- **Phase 2**: Bulk Analysis Integration  
- **Phase 3**: Site Selection Interface
- **Phase 5**: Workflow Generation (payment-aware)
- **Authentication**: Complete system with JWT, password reset, rate limiting

#### 🚧 In Progress / Next Steps
1. **Payment Recording System** (Critical Blocker)
   - Need `/api/orders/[id]/record-payment` endpoint
   - Invoice generation
   - Payment status UI
   
2. **Invite-Only Registration** (Account Creation Blocker)
   - Complete invitation flow
   - Registration with invite code
   - Account onboarding

3. **Phase 4: Account Dashboard**
   - Order management interface
   - Workflow progress tracking
   - Client communication tools

#### 📋 Feature Readiness
- ✅ Orders can be created and configured
- ✅ Bulk analysis runs and qualifies domains
- ✅ Sites can be selected and approved
- ✅ Workflows generate from approved sites
- ⚠️ Workflows blocked until payment recorded
- ❌ New accounts can't register (invite system incomplete)
- ❌ Account users can't fully manage orders yet

### Critical Understanding
The system currently has a **complete technical foundation** but several **user experience and business process gaps** that require detailed requirements from the user before implementation can proceed. Each major feature area marked with "NOTE" needs user input to define:

1. **User experience flows** (how should accounts interact?)
2. **Business process requirements** (what workflows need to happen?)
3. **Communication strategies** (what emails/notifications?)
4. **Internal team processes** (how should work be assigned/managed?)

This architecture provides a complete, data-driven order system that leverages existing client data while providing unprecedented transparency and flexibility for accounts.