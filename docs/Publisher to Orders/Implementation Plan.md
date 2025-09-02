# Publisher to Orders - Implementation Plan

**Date**: 2025-09-02  
**Status**: Implementation Planning  
**Target**: Add publisher attribution and management to internal order interface

## Frontend Audit: Internal Order Page

### Current Structure Analysis

**Main Page**: `app/orders/[id]/internal/page.tsx`
- **Primary Component**: `LineItemsReviewTable` - displays order line items in table format
- **User Type Support**: Supports both 'internal' and 'account' users with different permissions
- **Key Components**: Domain assignments, target pages, anchor texts, pricing, workflow status

### Current Table Structure (`LineItemsReviewTable.tsx`)

**Existing Columns** (Lines 1138-1147):
1. ✅ **Checkbox** - Bulk selection (internal users only)
2. ✅ **Domain** - Sticky column with domain info + DR/traffic tags  
3. ✅ **Workflow** - Workflow progress (if workflows exist)
4. ✅ **Target Page** - Target URL with dropdown selector
5. ✅ **Anchor Text** - Inline editable anchor text
6. ✅ **Price** - Shows when `permissions.canViewPricing` is true
7. ✅ **Action** - Status toggle and expand details

**Current LineItem Interface** (Lines 109-129):
```typescript
export interface LineItem {
  id: string;
  orderId: string;
  clientId: string;
  client?: { id: string; name: string; website: string };
  targetPageUrl?: string;
  targetPageId?: string;
  anchorText?: string;
  status: string;
  assignedDomainId?: string;
  assignedDomain?: any;
  estimatedPrice?: number;
  wholesalePrice?: number;
  workflowId?: string;
  metadata?: any;
}
```

### ❌ Missing Publisher Fields

**Database Has But Frontend Doesn't**:
- `publisherId` - Which publisher is assigned
- `publisherOfferingId` - Which specific offering 
- `publisherPrice` - Locked-in publisher price
- `publisherStatus` - Publisher acceptance status
- `publisherNotifiedAt` - When publisher was notified
- `publisherAcceptedAt` - When publisher accepted

## Implementation Plan

### Phase 1: Backend Publisher Attribution (Week 1-2)

#### 🚨 CRITICAL FIX REQUIRED: Missing MAX Strategy Implementation
**Discovery**: The system supports `'min_price', 'max_price', 'custom'` strategies but `derivedPricingService.ts` only implements MIN calculation.
**Impact**: Websites with `max_price` strategy are getting incorrect pricing.
**Priority**: Must fix before publisher attribution implementation.

#### 1.0 Fix MAX Strategy in DerivedPricingService
**File**: `lib/services/derivedPricingService.ts`

**Current Bug** (Line 100):
```typescript
// Only does MIN regardless of strategy
return prices.length > 0 ? Math.min(...prices) : null;
```

**Fixed Implementation**:
```typescript
// Get website's pricing strategy
const websiteRecord = await db.query.websites.findFirst({
  where: eq(websites.id, websiteId),
  columns: { pricingStrategy: true }
});

const strategy = websiteRecord?.pricingStrategy || 'min_price';

// Apply correct calculation based on strategy
if (strategy === 'max_price') {
  return prices.length > 0 ? Math.max(...prices) : null;
} else if (strategy === 'custom' && website.customOfferingId) {
  // Return the custom offering's price
  const customOffering = offerings.find(o => o.id === website.customOfferingId);
  return customOffering?.basePrice || null;
} else {
  // Default to min_price
  return prices.length > 0 ? Math.min(...prices) : null;
}
```

#### 1.1 Enhance PricingService with Publisher Attribution
**File**: `lib/services/pricingService.ts`

**Current**:
```typescript
interface PriceInfo {
  retailPrice: number;
  wholesalePrice: number;
  found: boolean;
}
```

**Enhanced**:
```typescript
interface PriceInfo {
  retailPrice: number;
  wholesalePrice: number;
  found: boolean;
  // NEW: Publisher attribution
  selectedOfferingId?: string;
  selectedPublisherId?: string;
  selectedPublisherName?: string;
  pricingStrategy?: 'min_price' | 'max_price' | 'custom';
  attributionSource?: string; // Track how attribution was determined
  attributionError?: string; // Track attribution failures
  availableOfferings?: Array<{
    offeringId: string;
    publisherId: string;
    publisherName: string;
    basePrice: number;
    isSelected: boolean;
  }>;
}
```

**Implementation Logic**:
```typescript
// Handle all three strategies
if (website.pricingStrategy === 'custom' && website.customOfferingId) {
  // Use manually selected offering
  selectedOfferingId = website.customOfferingId;
  attributionSource = 'custom_selection';
} else if (website.pricingStrategy === 'max_price') {
  // Find offering that provided the MAX price
  const maxPrice = Math.max(...offerings.map(o => o.basePrice));
  const maxOffering = offerings.find(o => o.basePrice === maxPrice);
  selectedOfferingId = maxOffering?.id;
  attributionSource = 'max_price_strategy';
} else {
  // 'min_price' or default
  const minPrice = Math.min(...offerings.map(o => o.basePrice));
  const minOffering = offerings.find(o => o.basePrice === minPrice);
  selectedOfferingId = minOffering?.id;
  attributionSource = website.pricingStrategy || 'min_price_fallback';
}

// Handle bad data gracefully
if (!selectedOfferingId) {
  console.warn(`No offering found for website ${websiteId} with strategy ${website.pricingStrategy}`);
  attributionSource = 'no_offering_found';
  attributionError = 'Could not determine publisher offering';
}
```

#### 1.2 Update Domain Assignment API
**File**: `app/api/orders/[id]/add-domains/route.ts`

**Current** (Line 284-290):
```typescript
estimatedPrice: pricing.retail,
wholesalePrice: pricing.wholesale,
```

**Enhanced**:
```typescript
const priceInfo = await PricingService.getDomainPrice(domain.domain);

// Log attribution for internal visibility
if (!priceInfo.selectedOfferingId) {
  console.warn(`No publisher attribution for ${domain.domain}:`, {
    strategy: priceInfo.pricingStrategy,
    error: priceInfo.attributionError,
    source: priceInfo.attributionSource
  });
}

// Create line item with publisher attribution
estimatedPrice: pricing.retail,
wholesalePrice: pricing.wholesale,
// NEW: Populate publisher fields (even if null for bad data visibility)
publisherId: priceInfo.selectedPublisherId || null,
publisherOfferingId: priceInfo.selectedOfferingId || null,
publisherPrice: pricing.wholesale, // Lock in the price at assignment time
metadata: {
  ...metadata,
  attributionSource: priceInfo.attributionSource,
  attributionError: priceInfo.attributionError
}
```

#### 1.3 Attribution Error Handling

**When Attribution Errors Surface**:
1. **API Level**: Logged in console during domain assignment (immediate visibility)
2. **Database Level**: Stored in `metadata.attributionError` for tracking
3. **Frontend Level**: Internal users see in expanded row details (Phase 2)
4. **Reporting Level**: Can query for items with `attributionError` != null

**Graceful Degradation Strategy**:
```typescript
// Bad data scenarios and responses
const attributionScenarios = {
  'no_offerings': 'Website has no publisher offerings',
  'bad_strategy': 'Invalid pricing strategy value',
  'custom_missing': 'Custom strategy but no offering selected',
  'price_mismatch': 'No offering matches calculated price',
  'db_error': 'Database query failed'
};

// All scenarios allow order to continue with null publisher
// Internal users can fix post-creation
```

#### 1.4 Create Publisher Assignment API (Future)
**New File**: `app/api/orders/[id]/line-items/[lineItemId]/assign-publisher/route.ts`

**Endpoints** (For manual publisher management):
- `POST` - Assign specific publisher to line item
- `PUT` - Change publisher assignment  
- `DELETE` - Remove publisher assignment

### Phase 2: Frontend Publisher Display (Week 2-3)

#### 🔍 **Codebase Deep Dive Results**

**Publisher Fields in Database** (`orderLineItemSchema.ts:51-58`):
```typescript
// Fields to KEEP:
publisherId: uuid('publisher_id'),
publisherOfferingId: uuid('publisher_offering_id'),
publisherPrice: integer('publisher_price'), // In cents

// Fields to REMOVE (not used, workflow handles this):
publisherStatus: varchar('publisher_status'), // ❌ Remove
platformFee: integer('platform_fee'), // ❌ Remove
publisherNotifiedAt: timestamp('publisher_notified_at'), // ❌ Remove
publisherAcceptedAt: timestamp('publisher_accepted_at'), // ❌ Remove
publisherSubmittedAt: timestamp('publisher_submitted_at'), // ❌ Remove
```

**Database Relations Found**:
- ❌ NO direct relations from `orderLineItems` → `publishers` table
- ❌ NO direct relations from `orderLineItems` → `publisherOfferings` table
- ✅ Publisher relations exist: `publishers` ↔ `publisherOfferings` ↔ `websites`
- **Action Required**: Need to create relations or resolve publisher data separately

**Current Frontend Status**:
- ❌ Publisher fields NOT displayed in `LineItemsReviewTable`
- ❌ Publisher fields NOT in LineItem interface
- ❌ Publisher data likely NOT being sent from API
- ✅ Existing component pattern to follow: inline integration like `DomainCell`

### Phase 2: Frontend Publisher Display (Revised)

#### 2.0 Database Migration - Remove Unused Fields
**New Migration File**: `migrations/XXXX_remove_unused_publisher_fields.sql`

```sql
-- Remove unused publisher fields that belong in workflows, not line items
ALTER TABLE order_line_items 
  DROP COLUMN IF EXISTS publisher_status,
  DROP COLUMN IF EXISTS platform_fee,
  DROP COLUMN IF EXISTS publisher_notified_at,
  DROP COLUMN IF EXISTS publisher_accepted_at,
  DROP COLUMN IF EXISTS publisher_submitted_at;

-- Keep only: publisher_id, publisher_offering_id, publisher_price
```

#### 2.1 Update LineItem Interface
**File**: `components/orders/LineItemsReviewTable.tsx`

```typescript
export interface LineItem {
  // ... existing fields (id, orderId, clientId, etc.)
  
  // ADD: Core publisher fields only
  publisherId?: string;
  publisherOfferingId?: string;
  publisherPrice?: number; // The locked-in price in cents
  
  // ADD: Resolved display data (from API joins/lookups)
  publisherName?: string; // Publisher company name
  publisherEmail?: string; // Contact email if needed
}
```

**Note**: No offering name field - can be shown but not as separate interface field

#### 2.2 Add Single Publisher Column (Internal Users Only)
**Location**: Table header after Price column (Line ~1145)

```typescript
{/* Publisher column - Internal users only, single combined column */}
{userType === 'internal' && permissions.canViewInternalTools && (
  <th className="pb-2 font-medium min-w-[180px]">Publisher</th>
)}
```

#### 2.3 Publisher Display - Inline Integration

**Add to existing table body rendering** (no new component needed):

```typescript
// In LineItemsReviewTable.tsx table body section
{userType === 'internal' && permissions.canViewInternalTools && (
  <td className="py-3 px-4 text-sm">
    {(() => {
      // Attribution error case
      if (item.metadata?.attributionError) {
        return (
          <div className="text-yellow-600">
            <span className="text-xs">⚠️ Attribution error</span>
          </div>
        );
      }
      
      // No publisher assigned
      if (!item.publisherId) {
        return (
          <div className="text-gray-400">
            <span className="text-xs">Not assigned</span>
            <button 
              onClick={() => setAssignPublisherModal({ 
                isOpen: true, 
                lineItemId: item.id 
              })}
              className="text-blue-600 text-xs ml-1"
            >
              Assign →
            </button>
          </div>
        );
      }
      
      // Publisher assigned - dense combined display
      return (
        <div className="space-y-0.5">
          <div className="font-medium text-sm text-gray-900">
            {item.publisherName || 'Unknown Publisher'}
          </div>
          <div className="text-xs text-gray-500">
            ${(item.publisherPrice / 100).toFixed(0)}
            {item.publisherEmail && ` • ${item.publisherEmail}`}
          </div>
        </div>
      );
    })()}
  </td>
)}
```

#### 2.4 API Updates Required

**Since no direct relations exist, need separate resolution**:
```typescript
// In API that fetches line items for order page
const lineItems = await db.query.orderLineItems.findMany({
  where: eq(orderLineItems.orderId, orderId),
  with: {
    client: true
  }
});

// Resolve publisher data separately
const publisherIds = lineItems
  .map(item => item.publisherId)
  .filter(Boolean);

const publishers = publisherIds.length > 0 
  ? await db.query.publishers.findMany({
      where: inArray(publishers.id, publisherIds),
      columns: {
        id: true,
        companyName: true,
        email: true
      }
    })
  : [];

// Map publisher data back to line items
const enrichedLineItems = lineItems.map(item => ({
  ...item,
  publisherName: publishers.find(p => p.id === item.publisherId)?.companyName,
  publisherEmail: publishers.find(p => p.id === item.publisherId)?.email
}));
```

#### 2.5 Workflow Integration Considerations

**Key Finding**: Publisher fulfillment happens in workflows, not line items

```typescript
// When generating workflows from line items
// Pass publisher attribution to workflow
const workflowData = {
  // ... existing workflow fields
  publisherId: lineItem.publisherId,
  publisherOfferingId: lineItem.publisherOfferingId,
  publisherPrice: lineItem.publisherPrice
};
```

**Future Enhancement**: Update `workflowGenerationService.ts` to pass publisher fields when creating workflows

### Phase 2.5: Publisher Assignment Dropdown

#### Rich Dropdown Design
**Trigger**: "Assign →" button opens dropdown (not modal)

```typescript
interface PublisherOption {
  publisherId: string;
  publisherName: string;
  publisherEmail: string;
  offeringId: string;
  offeringName: string;
  price: number; // in cents
  isAvailable: boolean;
}

// Dropdown shows:
// ┌─────────────────────────────────────┐
// │ Select Publisher                    │
// ├─────────────────────────────────────┤
// │ ○ Acme Publishing                   │
// │   Standard Package • $250           │
// │   contact@acme.com                  │
// ├─────────────────────────────────────┤
// │ ○ Beta Media                        │
// │   Premium Package • $350            │
// │   editor@beta.com                   │
// └─────────────────────────────────────┘
```

**On Selection**:
1. Update line item with selected publisher/offering
2. Update price if different
3. Close dropdown
4. Refresh table to show new assignment

### Phase 3: Workflow Integration (PRIORITY)

#### Current State Analysis
- Workflows are generated from order line items via `WorkflowGenerationService`
- Line items contain publisher fields (`publisherId`, `publisherOfferingId`, `publisherPrice`) that aren't used
- Workflows store entire content as JSON in `workflows.content` field
- Publisher coordination fields exist in workflows table but are for outreach, not attribution

#### How Workflows Are Generated
1. **Trigger**: POST to `/api/orders/[id]/generate-workflows/route.ts`
2. **Service**: `WorkflowGenerationService.generateWorkflowsForLineItems()`
3. **Process**:
   - Validates order is paid (or skipPaymentCheck flag)
   - Iterates through order line items with assigned domains
   - Creates workflow via `createWorkflowFromLineItem()` at line 214
   - Stores workflow as JSON in database
   - Updates line item with workflowId
   - Sends email notification on success

#### When Generation Happens
- After order payment (status = 'paid')
- Manual trigger by internal users
- Can override payment check with `skipPaymentCheck: true`
- Batch process for all line items with domains

#### Data Currently Passed to Workflows
```typescript
// workflowGenerationService.ts line 244-250
metadata: {
  clientId: client.id,
  orderId: order.id,
  targetPageUrl: lineItem.targetPageUrl,
  anchorText: lineItem.anchorText,
  targetPageId: lineItem.targetPageId
  // MISSING: publisherId, publisherOfferingId, publisherPrice
}
```

#### Implementation Tasks

##### Task 3.1: Pass Publisher Data to Workflows & Pre-populate Steps
**File**: `/lib/services/workflowGenerationService.ts`

**Part A: Add to Workflow Metadata** (Line 244-250)
```typescript
metadata: {
  clientId: client.id,
  orderId: order.id,
  targetPageUrl: lineItem.targetPageUrl,
  anchorText: lineItem.anchorText,
  targetPageId: lineItem.targetPageId,
  // ADD THESE:
  publisherId: lineItem.publisherId || null,
  publisherOfferingId: lineItem.publisherOfferingId || null,
  publisherPrice: lineItem.publisherPrice || null
}
```

**Part B: Pre-populate Publisher Pre-Approval Step** (Line 274-299)
```typescript
private static async generateWorkflowStepsForLineItem(lineItem: any, domain: any): Promise<any[]> {
  // Need to resolve publisher info if publisherId exists
  let publisherInfo = null;
  if (lineItem.publisherId) {
    publisherInfo = await this.resolvePublisherInfo(lineItem.publisherId);
  }
  
  return WORKFLOW_STEPS.map((step, index) => {
    // Existing logic for first 2 steps...
    
    // ADD: Pre-populate publisher-pre-approval step (step 4, index 3)
    if (step.id === 'publisher-pre-approval' && publisherInfo) {
      return {
        ...step,
        status: 'pending' as const,
        inputs: {},
        outputs: {
          // Pre-populate from line item publisher data
          publisherEmail: publisherInfo.email || '',
          publisherName: publisherInfo.companyName || '',
          agreedPrice: lineItem.publisherPrice 
            ? `$${(lineItem.publisherPrice / 100).toFixed(2)}` 
            : '',
          paymentTerms: publisherInfo.paymentTerms || 'PayPal upon publication'
        }
      };
    }
    
    // Rest of existing logic...
  });
}

// Helper method to resolve publisher info
private static async resolvePublisherInfo(publisherId: string) {
  try {
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.id, publisherId),
      columns: {
        id: true,
        companyName: true,
        email: true,
        contactName: true,
        paymentDetails: true
      }
    });
    return publisher;
  } catch (error) {
    console.error('Error resolving publisher:', error);
    return null;
  }
}
```

##### Task 3.2: Update Workflow Type Definition
**File**: `/types/workflow.ts`
**Location**: Line 49-63 in metadata interface

```typescript
metadata: {
  // ... existing fields ...
  // ADD publisher attribution:
  publisherId?: string;
  publisherOfferingId?: string;
  publisherPrice?: number; // In cents
}
```

##### Task 3.3: Create Publisher Resolution Helper
**New File**: `/lib/utils/publisherResolver.ts`

```typescript
import { db } from '@/lib/db/connection';
import { publishers, publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq } from 'drizzle-orm';

export async function resolvePublisherInfo(
  publisherId: string | null | undefined, 
  offeringId?: string | null
) {
  if (!publisherId) return null;
  
  try {
    // Get publisher details
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.id, publisherId),
      columns: {
        id: true,
        companyName: true,
        email: true,
        contactName: true
      }
    });
    
    if (!publisher) return null;
    
    // Get offering details if provided
    let offering = null;
    if (offeringId) {
      offering = await db.query.publisherOfferings.findFirst({
        where: eq(publisherOfferings.id, offeringId),
        columns: {
          id: true,
          name: true,
          basePrice: true,
          turnaroundDays: true
        }
      });
    }
    
    return {
      publisher,
      offering,
      displayName: publisher.companyName,
      displayPrice: offering?.basePrice
    };
  } catch (error) {
    console.error('Error resolving publisher info:', error);
    return null;
  }
}
```

##### Task 3.4: Display Publisher Info in Workflow UI
**Files to Update**:
1. `/components/workflows/WorkflowListEnhanced.tsx` - Workflow cards
2. `/app/workflows/[id]/page.tsx` - Workflow detail page
3. `/components/workflows/WorkflowCard.tsx` - Individual workflow cards

**Display Pattern**:
```typescript
// In workflow display components
const session = await getSession();
const showPublisher = session?.userType === 'internal';

// If internal user and publisher data exists
{showPublisher && workflow.metadata?.publisherId && (
  <div className="text-xs text-gray-500">
    Publisher: {publisherInfo?.displayName || 'Loading...'}
    {publisherInfo?.displayPrice && ` • $${(publisherInfo.displayPrice / 100).toFixed(0)}`}
  </div>
)}
```

##### Task 3.5: Update Workflow Email Notifications
**File**: `/app/api/orders/[id]/generate-workflows/route.ts`
**Location**: Line 103-112 where sites array is built

```typescript
const sites = lineItemsWithWorkflows
  .filter(item => item.workflowId)
  .map(item => {
    const metadata = item.metadata as any || {};
    const workflow = workflowData.find(w => w.id === item.workflowId);
    return {
      domain: item.assignedDomain || 'Domain pending',
      qualificationStatus: metadata.domainQualificationStatus,
      workflowId: item.workflowId!,
      completionPercentage: workflow?.completionPercentage ? Number(workflow.completionPercentage) : 0,
      // ADD publisher info for internal visibility:
      publisherName: item.publisherId ? 'Assigned' : 'Pending',
    };
  });
```

#### Workflow Step Fields Requiring Pre-population

**Publisher Pre-Approval Step** (Step 4, index 3):
- `publisherEmail` - Publisher's email address
- `publisherName` - Publisher's company/contact name  
- `agreedPrice` - The locked-in price from order line item
- `paymentTerms` - Default payment terms from publisher record

**Publication and Outreach Step** (Step 13):
- Uses `publisherEmail` from Publisher Pre-Approval step
- Uses `publisherName` for email personalization
- References `agreedPrice` for payment confirmation

**Publication Verification Step** (Step 14):
- References publisher info for payment processing
- Uses `agreedPrice` for final invoicing

#### Benefits of Workflow Integration
1. **Traceability**: Know which publisher provided pricing for each workflow
2. **Analytics**: Track publisher performance across workflows
3. **Debugging**: Easier to diagnose pricing/publisher issues
4. **Future Features**: Enable publisher-specific workflow customization
5. **Automation**: Pre-populated fields reduce manual data entry
6. **Consistency**: Publisher data flows seamlessly from order to workflow

#### Testing Requirements
1. **Unit Test**: Verify publisher data passes to workflow metadata
2. **Integration Test**: End-to-end workflow generation with publisher data
3. **UI Test**: Publisher info displays correctly for internal users only
4. **Permission Test**: Account users don't see publisher data

### Phase 4: Publisher Dashboard Integration (Future)

#### Overview
Create a direct integration between workflows and the publisher dashboard, allowing publishers to receive, manage, and complete assigned tasks directly through their portal.

#### Key Components to Research

##### 4.1 Task Assignment Flow
- **Workflow → Publisher Dashboard**: Auto-create tasks when workflow reaches Publisher Pre-Approval step
- **Task Types**: Pre-approval requests, content submission, revision requests
- **Assignment Logic**: Route to correct publisher based on line item's publisherId
- **Status Synchronization**: Keep workflow and publisher task status in sync

##### 4.2 Publisher Task Interface
- **Task Queue**: Publishers see assigned tasks in priority order
- **Task Details**: Show all relevant workflow data (topic, keywords, requirements)
- **Action Items**: Accept/reject topics, submit content, request clarification
- **Communication**: Built-in messaging between internal team and publisher

##### 4.3 Data Synchronization
- **Bidirectional Updates**: Changes in workflow reflect in publisher dashboard and vice versa
- **Real-time Status**: Instant updates when publishers take action
- **Content Submission**: Direct upload of articles through publisher portal
- **Approval Flow**: Internal review triggered when publisher submits content

##### 4.4 Technical Considerations
- **API Design**: RESTful endpoints for publisher task management
- **Authentication**: Secure publisher-specific access to assigned tasks only
- **Notifications**: Email/in-app alerts for new tasks and status changes
- **Rate Limiting**: Prevent abuse and ensure fair task distribution

#### Research Questions for Phase 4
1. Should publishers have direct access to workflow steps or simplified task views?
2. How do we handle publisher unavailability or rejection of tasks?
3. What level of workflow detail should publishers see?
4. How do we manage version control for content submissions?
5. Should publishers be able to negotiate pricing within the dashboard?

#### Expected Benefits
- **Reduced Manual Coordination**: Eliminate email back-and-forth
- **Faster Turnaround**: Publishers can act immediately on new tasks
- **Better Tracking**: Complete visibility into publisher workload and performance
- **Improved Quality**: Structured submission process with clear requirements

**Note**: This phase requires careful design to balance automation with the need for human oversight and quality control.

## User Experience Flow

### Internal User Journey

1. **Order Review**: Internal user opens order at `/orders/[id]/internal`
2. **Publisher Visibility**: See publisher assignments in dedicated columns
3. **Missing Assignments**: Identify line items without publisher assignments
4. **Publisher Assignment**: Click "Assign" → Modal shows available publishers
5. **Selection**: Choose publisher + offering → Price locked in
6. **Notification**: Option to notify publisher immediately
7. **Status Tracking**: Monitor publisher acceptance/rejection
8. **Bulk Operations**: Assign multiple publishers at once

### Account User Journey

1. **Order Review**: Account user opens order (regular view)
2. **Publisher Invisibility**: Publisher information completely hidden
3. **Normal Flow**: See domains, pricing, target pages as usual

## Technical Considerations

### 3.1 Performance
- **Lazy Loading**: Publisher info loaded on-demand for internal views
- **Caching**: Cache publisher data for better performance
- **Bulk Operations**: Efficient bulk assignment APIs

### 3.2 Backwards Compatibility
- **Graceful Fallback**: Handle line items without publisher assignments
- **Migration Strategy**: Backfill existing orders with publisher data
- **API Versioning**: Maintain existing API contracts

### 3.3 Security & Permissions
- **Role-Based Access**: Publisher info only for internal users
- **Data Isolation**: Account users never see publisher details
- **Audit Trail**: Track all publisher assignment changes

## Testing Strategy

### Phase 1 Testing: Backend
- **Unit Tests**: PricingService publisher attribution
- **Integration Tests**: Domain assignment with publisher data
- **API Tests**: Publisher assignment endpoints

### Phase 2 Testing: Frontend Display
- **Component Tests**: Publisher cell rendering
- **Permission Tests**: Internal vs account user visibility
- **Responsive Tests**: Table layout with new columns

### Phase 3 Testing: User Experience
- **E2E Tests**: Complete publisher assignment flow
- **Performance Tests**: Load testing with publisher data
- **User Testing**: Internal team workflow validation

## Success Metrics

### Immediate (Phase 1-2)
- ✅ All new line items capture publisher attribution
- ✅ Internal users can view publisher assignments
- ✅ No impact on account user experience

### Medium-term (Phase 3)
- ✅ 90% of line items have publisher assignments
- ✅ Internal users can assign publishers efficiently
- ✅ Publisher notification system functional

### Long-term (Future Phases)
- ✅ Publisher acceptance rate > 85%
- ✅ Order fulfillment time reduced by 20%
- ✅ Publisher performance tracking operational

## Risk Mitigation

### Technical Risks
- **UI Complexity**: Start with simple publisher display, enhance gradually
- **Performance Impact**: Lazy load publisher data, optimize queries
- **Data Consistency**: Comprehensive testing of publisher attribution

### User Experience Risks  
- **Information Overload**: Use progressive disclosure, collapsible sections
- **Learning Curve**: Provide tooltips and documentation
- **Workflow Disruption**: Maintain existing flows, add publisher as enhancement

### Business Risks
- **Publisher Relations**: Ensure publishers are properly notified and managed
- **Order Delays**: Have fallback assignment process if publishers reject
- **Pricing Disputes**: Maintain audit trail of all pricing decisions

---

**Next Steps**: Begin Phase 1 implementation with enhanced PricingService and publisher attribution in domain assignment flow.