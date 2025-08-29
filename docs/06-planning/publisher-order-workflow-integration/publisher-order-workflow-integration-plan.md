# Publisher-Order-Workflow Integration Plan

**Status**: 🎯 **CRITICAL ARCHITECTURE PLANNING**  
**Priority**: High - Required for complete order fulfillment flow  
**Estimated Effort**: 2-3 weeks of development

---

## 🔍 **CURRENT STATE ANALYSIS**

### **Existing Architecture (GOOD ✅)**

#### **Order → Publisher Connections:**
- ✅ `order_line_items.publisher_id` → `publishers.id`
- ✅ `order_line_items.publisher_offering_id` → `publisher_offerings.id`
- ✅ Full publisher lifecycle tracking:
  - `publisher_status`, `publisher_price`, `platform_fee`
  - `publisher_notified_at`, `publisher_accepted_at`, `publisher_submitted_at`, `publisher_paid_at`
  - `assigned_at`, `assigned_by`

#### **Published URL Tracking:**
- ✅ `order_line_items.published_url` - Primary URL field
- ✅ `order_line_items.draft_url` - Draft URL tracking
- ✅ `workflows.published_url` - Workflow URL tracking
- ✅ `workflows.delivery_url` - Final delivery URL

#### **Website → Publisher Relationships:**
- ✅ `publisher_offering_relationships` - Full publisher-website-offering mappings
- ✅ `workflow_websites` - Junction table connecting workflows to websites
- ✅ `websites.added_by_publisher_id` - Direct publisher attribution

---

## 🚨 **CRITICAL GAPS IDENTIFIED**

### **1. Missing Workflow → Publisher Direct Connection**
❌ **Problem**: `workflows` table has `publisher_email` but no `publisher_id`  
❌ **Impact**: Can't easily query all workflows for a publisher  
❌ **Risk**: Manual publisher assignment, data inconsistency

### **2. Fragmented Publisher Assignment**
❌ **Problem**: Publishers assigned separately in line items and workflows  
❌ **Impact**: Duplicate tracking, potential mismatches  
❌ **Risk**: Publisher payments/communication errors

### **3. No Website ID in Line Items**
❌ **Problem**: Line items have `assigned_domain` (string) but no `website_id` (FK)  
❌ **Impact**: Can't resolve domain → website → publisher automatically  
❌ **Risk**: Manual publisher lookup every time

### **4. Inconsistent Published URL Tracking**
❌ **Problem**: Published URLs stored in both line items AND workflows  
❌ **Impact**: No single source of truth  
❌ **Risk**: URL mismatches, delivery confusion

### **5. Manual Publisher Discovery**
❌ **Problem**: No automatic publisher matching when domains assigned  
❌ **Impact**: All publisher assignments must be manual  
❌ **Risk**: Slow order fulfillment, human errors

---

## 🎯 **IMPLEMENTATION PLAN**

## **PHASE 1: Database Schema Enhancements** (Week 1)

### **Migration 1: Add Workflow Publisher Connection**
```sql
-- Add publisher_id to workflows table
ALTER TABLE workflows 
ADD COLUMN publisher_id UUID,
ADD COLUMN website_id UUID;

-- Add foreign key constraints
ALTER TABLE workflows 
ADD CONSTRAINT workflows_publisher_id_fkey 
FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE SET NULL;

ALTER TABLE workflows 
ADD CONSTRAINT workflows_website_id_fkey 
FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_workflows_publisher_id ON workflows(publisher_id);
CREATE INDEX idx_workflows_website_id ON workflows(website_id);

-- Backfill existing data from publisher_email
UPDATE workflows SET publisher_id = (
  SELECT p.id FROM publishers p 
  WHERE LOWER(p.email) = LOWER(workflows.publisher_email)
) WHERE publisher_email IS NOT NULL;
```

### **Migration 2: Add Website ID to Line Items**
```sql
-- Add website_id to order_line_items
ALTER TABLE order_line_items 
ADD COLUMN website_id UUID;

-- Add foreign key constraint
ALTER TABLE order_line_items 
ADD CONSTRAINT order_line_items_website_id_fkey 
FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_order_line_items_website_id ON order_line_items(website_id);

-- Backfill from assigned_domain
UPDATE order_line_items SET website_id = (
  SELECT w.id FROM websites w 
  WHERE w.domain = order_line_items.assigned_domain 
     OR w.normalized_domain = order_line_items.assigned_domain
) WHERE assigned_domain IS NOT NULL;
```

### **Migration 3: Consolidated Published URL Tracking**
```sql
-- Add URL status tracking to line items
ALTER TABLE order_line_items 
ADD COLUMN url_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN url_verified_at TIMESTAMP,
ADD COLUMN url_verified_by UUID;

-- Add constraint
ALTER TABLE order_line_items 
ADD CONSTRAINT order_line_items_url_verified_by_fkey 
FOREIGN KEY (url_verified_by) REFERENCES users(id);

-- Create URL status index
CREATE INDEX idx_order_line_items_url_status ON order_line_items(url_status);

-- Add check constraint
ALTER TABLE order_line_items 
ADD CONSTRAINT chk_url_status 
CHECK (url_status IN ('pending', 'draft', 'submitted', 'published', 'verified', 'failed'));
```

---

## **PHASE 2: Automatic Publisher Resolution** (Week 2)

### **Service: PublisherResolutionService**
```typescript
// /lib/services/PublisherResolutionService.ts
export class PublisherResolutionService {
  
  /**
   * Automatically resolve publisher from domain assignment
   */
  static async resolvePublisherFromDomain(domain: string): Promise<{
    publisher: Publisher | null;
    website: Website | null;
    offering: PublisherOffering | null;
    confidence: number;
  }> {
    // 1. Find website by domain/normalized_domain
    // 2. Look up publisher_offering_relationships
    // 3. Return best match with confidence score
  }

  /**
   * Auto-assign publisher when domain is assigned to line item
   */
  static async autoAssignPublisherToLineItem(
    lineItemId: string, 
    domain: string
  ): Promise<void> {
    // 1. Resolve publisher from domain
    // 2. Update line item with publisher_id, website_id, publisher_offering_id
    // 3. Log assignment for audit trail
  }

  /**
   * Sync publisher assignment from line item to workflow
   */
  static async syncPublisherToWorkflow(
    workflowId: string,
    lineItemId: string
  ): Promise<void> {
    // 1. Get publisher info from line item
    // 2. Update workflow with publisher_id, website_id
    // 3. Maintain backward compatibility with publisher_email
  }
}
```

### **API Integration Points**

#### **1. Line Item Domain Assignment API**
```typescript
// /app/api/orders/[id]/line-items/[itemId]/assign-domain/route.ts
export async function POST(request: NextRequest) {
  const { domain } = await request.json();
  
  // Existing domain assignment logic...
  
  // NEW: Auto-resolve publisher
  const resolution = await PublisherResolutionService.resolvePublisherFromDomain(domain);
  if (resolution.publisher && resolution.confidence > 0.8) {
    await PublisherResolutionService.autoAssignPublisherToLineItem(lineItemId, domain);
  }
  
  // NEW: Sync to workflow if exists
  if (lineItem.workflow_id) {
    await PublisherResolutionService.syncPublisherToWorkflow(
      lineItem.workflow_id, 
      lineItemId
    );
  }
}
```

#### **2. Workflow Creation Hook**
```typescript
// Update workflow creation to inherit publisher from line item
export async function createWorkflowFromLineItem(lineItemId: string) {
  const lineItem = await getLineItem(lineItemId);
  
  const workflow = await db.insert(workflows).values({
    // ... existing fields
    publisher_id: lineItem.publisher_id,        // NEW
    website_id: lineItem.website_id,            // NEW
    publisher_email: lineItem.publisher?.email, // Maintain compatibility
  });
}
```

---

## **PHASE 3: Published URL Management System** (Week 2-3)

### **Unified URL Tracking Strategy**

#### **Single Source of Truth: Line Items**
- `order_line_items.published_url` = **Primary published URL**
- `order_line_items.draft_url` = **Draft URL for review**
- `order_line_items.url_status` = **Current URL status**
- `workflows.published_url` = **Deprecated, sync from line item**

#### **URL Status Flow**
1. **`pending`** → No URLs yet
2. **`draft`** → Draft URL submitted, awaiting review
3. **`submitted`** → Final URL submitted by publisher
4. **`published`** → URL live and accessible
5. **`verified`** → URL verified by internal team
6. **`failed`** → URL broken/removed

### **Service: PublishedUrlService**
```typescript
// /lib/services/PublishedUrlService.ts
export class PublishedUrlService {
  
  /**
   * Update published URL with status tracking
   */
  static async updatePublishedUrl(
    lineItemId: string,
    url: string,
    status: 'draft' | 'submitted' | 'published',
    updatedBy: string
  ): Promise<void> {
    // 1. Update line item with new URL and status
    // 2. Sync to workflow for backward compatibility
    // 3. Log status change
    // 4. Trigger notifications if needed
  }

  /**
   * Verify published URL is live and accessible
   */
  static async verifyPublishedUrl(lineItemId: string, verifiedBy: string): Promise<{
    isLive: boolean;
    statusCode: number;
    hasBacklink: boolean;
    issues: string[];
  }> {
    // 1. Check URL accessibility
    // 2. Verify backlink exists
    // 3. Update status to 'verified' or 'failed'
    // 4. Return verification results
  }

  /**
   * Get consolidated URL status for order
   */
  static async getOrderUrlStatus(orderId: string): Promise<{
    totalUrls: number;
    pending: number;
    draft: number;
    published: number;
    verified: number;
    failed: number;
    completionPercentage: number;
  }> {
    // Aggregate URL statuses across all line items
  }
}
```

---

## **PHASE 4: Publisher Workflow Integration** (Week 3)

### **Enhanced Publisher Portal Features**

#### **1. Publisher Workflow Dashboard**
```typescript
// /app/publisher/(dashboard)/workflows/page.tsx
// NEW: Unified view of all assigned workflows
export default function PublisherWorkflowsPage() {
  // Query: SELECT * FROM workflows WHERE publisher_id = currentPublisher.id
  // Group by status, show progress, deadlines
  // Enable bulk actions (accept/reject multiple)
}
```

#### **2. Workflow Assignment API**
```typescript
// /app/api/workflows/[id]/assign-publisher/route.ts
export async function POST(request: NextRequest) {
  const { publisherId, websiteId } = await request.json();
  
  // 1. Update workflow.publisher_id and website_id
  // 2. Update related line item if exists
  // 3. Send publisher notification
  // 4. Log assignment
}
```

#### **3. Publisher Performance Analytics**
```typescript
// Enhanced queries with direct publisher connections
const publisherStats = await db
  .select({
    totalWorkflows: sql<number>`count(*)`,
    completedWorkflows: sql<number>`count(*) filter (where is_completed = true)`,
    avgTurnaroundDays: sql<number>`avg(extract(days from completed_at - created_at))`,
    totalPublishedUrls: sql<number>`count(*) filter (where published_url is not null)`,
  })
  .from(workflows)
  .where(eq(workflows.publisher_id, publisherId))
  .groupBy(workflows.publisher_id);
```

---

## **PHASE 5: Data Migration & Cleanup** (Week 3)

### **1. Backfill Missing Connections**
```sql
-- Backfill workflow publisher_id from publisher_email
UPDATE workflows 
SET publisher_id = (
  SELECT p.id 
  FROM publishers p 
  WHERE LOWER(p.email) = LOWER(workflows.publisher_email)
)
WHERE publisher_email IS NOT NULL 
  AND publisher_id IS NULL;

-- Backfill workflow website_id from workflow_websites
UPDATE workflows 
SET website_id = (
  SELECT ww.website_id 
  FROM workflow_websites ww 
  WHERE ww.workflow_id = workflows.id 
  LIMIT 1
)
WHERE website_id IS NULL;

-- Backfill line item website_id from assigned_domain
UPDATE order_line_items 
SET website_id = (
  SELECT w.id 
  FROM websites w 
  WHERE w.domain = order_line_items.assigned_domain
     OR w.normalized_domain = order_line_items.assigned_domain
)
WHERE assigned_domain IS NOT NULL 
  AND website_id IS NULL;
```

### **2. Auto-Resolve Missing Publishers**
```sql
-- Auto-assign publishers to line items based on website ownership
UPDATE order_line_items 
SET publisher_id = (
  SELECT por.publisher_id 
  FROM publisher_offering_relationships por 
  WHERE por.website_id = order_line_items.website_id
    AND por.is_primary = true
  LIMIT 1
)
WHERE website_id IS NOT NULL 
  AND publisher_id IS NULL;
```

### **3. Sync Published URLs**
```sql
-- Ensure workflow published_url matches line item
UPDATE workflows 
SET published_url = (
  SELECT oli.published_url 
  FROM order_line_items oli 
  WHERE oli.workflow_id = workflows.id
    AND oli.published_url IS NOT NULL
)
WHERE order_item_id IS NOT NULL;
```

---

## **TESTING STRATEGY**

### **1. Data Integrity Tests**
- Verify all workflows have matching line item publishers
- Check published URL consistency between workflows and line items
- Validate website_id assignments are correct

### **2. Integration Tests**
- Test automatic publisher resolution when domains assigned
- Verify workflow-to-publisher sync on line item changes
- Test published URL status flow end-to-end

### **3. Performance Tests**
- Measure query performance with new indexes
- Test bulk publisher assignment operations
- Verify publisher dashboard load times

---

## **SUCCESS CRITERIA**

### **Immediate (Phase 1-2)**
✅ All workflows have direct `publisher_id` connections  
✅ Line items automatically resolve publishers from domains  
✅ Website assignments work seamlessly  

### **Medium Term (Phase 3-4)**
✅ Single source of truth for published URLs  
✅ Publisher workflow dashboard fully functional  
✅ Automated URL verification system  

### **Long Term (Phase 5+)**
✅ 100% data consistency across publisher connections  
✅ Zero manual publisher assignments required  
✅ Complete order-to-published-url traceability  

---

## **RISKS & MITIGATION**

### **Risk: Data Migration Errors**
**Mitigation**: Comprehensive testing on staging, rollback procedures ready

### **Risk: Performance Impact**
**Mitigation**: Proper indexing, query optimization, gradual rollout

### **Risk: Publisher Assignment Conflicts**
**Mitigation**: Confidence scoring system, manual override capabilities

### **Risk: Backward Compatibility**
**Mitigation**: Maintain existing fields during transition period

---

**Next Steps**: 
1. Review and approve this plan
2. Create detailed tickets for Phase 1
3. Set up staging environment for testing
4. Begin database migration development

---

*This plan solidifies the publisher-order-workflow connections and creates a complete pathway for published URL tracking and management.*