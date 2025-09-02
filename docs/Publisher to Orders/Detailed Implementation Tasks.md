# Publisher to Orders - Detailed Implementation Task List

**Created**: 2025-01-02  
**Principle**: Measure twice, cut once - thorough verification at every step  
**Testing Strategy**: Schema → TypeScript → API → Database → UI

---

## Pre-Implementation Checklist

### 🔍 Initial Verification (Do BEFORE any code changes)

#### Task 0.1: Schema Audit
```bash
# Verify current database schema
npm run db:studio
```
- [ ] Document current `order_line_items` publisher fields
- [ ] Document current `publishers` table structure  
- [ ] Document current `publisher_offerings` table structure
- [ ] Verify relations between tables
- [ ] Screenshot current schema for rollback reference

#### Task 0.2: TypeScript Baseline
```bash
# Establish clean build baseline
timeout 30 npm run build
```
- [ ] Confirm build passes with 0 errors
- [ ] Document current build time
- [ ] Save build output to `docs/Publisher to Orders/baseline-build.txt`

#### Task 0.3: Test Coverage Baseline
```bash
# Check existing test coverage
npm test -- --coverage
```
- [ ] Document current test coverage percentage
- [ ] Identify areas lacking tests that we'll modify
- [ ] Create test plan for new functionality

#### Task 0.4: Create Test Data
```sql
-- Create test publishers and offerings for development
INSERT INTO publishers (id, company_name, email, contact_name, is_shadow)
VALUES 
  ('test-pub-1', 'Test Publisher Alpha', 'alpha@test.com', 'Alpha Contact', false),
  ('test-pub-2', 'Test Publisher Beta', 'beta@test.com', 'Beta Contact', false);

INSERT INTO publisher_offerings (id, publisher_id, website_id, name, base_price)
VALUES 
  ('test-offer-1', 'test-pub-1', '[existing-website-id]', 'Standard Package', 25000),
  ('test-offer-2', 'test-pub-2', '[existing-website-id]', 'Premium Package', 35000);
```
- [ ] Create test publishers in development database
- [ ] Create test offerings linked to real websites
- [ ] Document test data IDs for cleanup later

---

## Phase 1: Backend Publisher Attribution

### 📝 Step 1.1: Fix MAX Pricing Strategy Bug

#### Pre-Implementation Checks
- [ ] Review current `derivedPricingService.ts` implementation
- [ ] Find all websites using `max_price` strategy:
```sql
SELECT id, domain, pricing_strategy, custom_offering_id 
FROM websites 
WHERE pricing_strategy = 'max_price';
```
- [ ] Document affected websites for testing

#### Implementation
**File**: `lib/services/derivedPricingService.ts`

1. [ ] Open file and locate the pricing calculation (around line 100)
2. [ ] Add strategy-aware pricing logic:
```typescript
// Around line 66-100, replace existing return statement
const strategy = website?.pricingStrategy || 'min_price';

if (strategy === 'max_price') {
  return prices.length > 0 ? Math.max(...prices) : null;
} else if (strategy === 'custom' && website?.customOfferingId) {
  const customOffering = offerings.find(o => o.id === website.customOfferingId);
  return customOffering?.basePrice || null;
} else {
  // Default to min_price
  return prices.length > 0 ? Math.min(...prices) : null;
}
```

#### Verification
3. [ ] Run TypeScript check: `npx tsc --noEmit`
4. [ ] Create unit test file: `lib/services/__tests__/derivedPricingService.test.ts`
```typescript
describe('DerivedPricingService', () => {
  it('should use MAX price when strategy is max_price', async () => {
    // Test implementation
  });
  
  it('should use MIN price when strategy is min_price', async () => {
    // Test implementation
  });
  
  it('should use custom offering when strategy is custom', async () => {
    // Test implementation
  });
});
```
5. [ ] Run tests: `npm test derivedPricingService`
6. [ ] Manual API test:
```bash
# Test pricing endpoint with different strategies
curl http://localhost:3000/api/websites/cost?domain=test-domain.com
```
7. [ ] Database verification:
```sql
-- Verify prices are calculated correctly
SELECT 
  w.domain,
  w.pricing_strategy,
  w.guest_post_cost,
  COUNT(po.id) as offering_count,
  MIN(po.base_price) as min_price,
  MAX(po.base_price) as max_price
FROM websites w
LEFT JOIN publisher_offerings po ON po.website_id = w.id
WHERE w.pricing_strategy IS NOT NULL
GROUP BY w.id;
```

---

### 📝 Step 1.2: Enhance PricingService with Attribution

#### Pre-Implementation Checks
- [ ] Review current `PricingService` interface
- [ ] Check all places that call `getDomainPrice()`:
```bash
grep -r "getDomainPrice" --include="*.ts" --include="*.tsx"
```
- [ ] Document all consumers of PricingService

#### Implementation
**File**: `lib/services/pricingService.ts`

1. [ ] Extend the PriceInfo interface:
```typescript
export interface PriceInfo {
  retailPrice: number;
  wholesalePrice: number;
  found: boolean;
  // NEW FIELDS:
  selectedOfferingId?: string;
  selectedPublisherId?: string;
  selectedPublisherName?: string;
  pricingStrategy?: 'min_price' | 'max_price' | 'custom';
  attributionSource?: string;
  attributionError?: string;
}
```

2. [ ] Update `getDomainPrice()` method to include attribution:
```typescript
// Add logic to track which offering provided the price
const offerings = await this.getOfferingsForWebsite(websiteId);
let selectedOffering = null;

if (website.pricingStrategy === 'max_price') {
  const maxPrice = Math.max(...offerings.map(o => o.basePrice));
  selectedOffering = offerings.find(o => o.basePrice === maxPrice);
} else if (website.pricingStrategy === 'custom' && website.customOfferingId) {
  selectedOffering = offerings.find(o => o.id === website.customOfferingId);
} else {
  const minPrice = Math.min(...offerings.map(o => o.basePrice));
  selectedOffering = offerings.find(o => o.basePrice === minPrice);
}

// Include publisher info in response
return {
  retailPrice: calculatedRetail,
  wholesalePrice: calculatedWholesale,
  found: true,
  selectedOfferingId: selectedOffering?.id,
  selectedPublisherId: selectedOffering?.publisherId,
  pricingStrategy: website.pricingStrategy,
  attributionSource: 'derived_pricing'
};
```

#### Verification
3. [ ] Run TypeScript check: `npx tsc --noEmit`
4. [ ] Update/create tests for PricingService
5. [ ] Test backwards compatibility (ensure existing code still works)
6. [ ] Manual API test to verify new fields are returned

---

### 📝 Step 1.3: Update Domain Assignment API

#### Pre-Implementation Checks
- [ ] Review current `/api/orders/[id]/add-domains/route.ts`
- [ ] Check database schema for order_line_items:
```sql
\d order_line_items
```
- [ ] Verify publisher fields exist in schema

#### Implementation
**File**: `app/api/orders/[id]/add-domains/route.ts`

1. [ ] Locate the line item creation code (around line 284-290)
2. [ ] Update to capture publisher attribution:
```typescript
// Get enhanced pricing with attribution
const priceInfo = await PricingService.getDomainPrice(domain.domain);

// Log attribution for debugging
console.log(`[ATTRIBUTION] Domain: ${domain.domain}`, {
  publisherId: priceInfo.selectedPublisherId,
  offeringId: priceInfo.selectedOfferingId,
  strategy: priceInfo.pricingStrategy,
  source: priceInfo.attributionSource,
  error: priceInfo.attributionError
});

// Create line item with publisher attribution
const newLineItem = {
  ...existingFields,
  estimatedPrice: priceInfo.retailPrice,
  wholesalePrice: priceInfo.wholesalePrice,
  // NEW: Publisher attribution
  publisherId: priceInfo.selectedPublisherId || null,
  publisherOfferingId: priceInfo.selectedOfferingId || null,
  publisherPrice: priceInfo.wholesalePrice, // Lock in the price
  metadata: {
    ...existingMetadata,
    pricingStrategy: priceInfo.pricingStrategy,
    attributionSource: priceInfo.attributionSource,
    attributionError: priceInfo.attributionError,
    attributionTimestamp: new Date().toISOString()
  }
};
```

#### Verification
3. [ ] Run TypeScript check: `npx tsc --noEmit`
4. [ ] Create API test script: `scripts/test-domain-assignment.ts`
```typescript
// Test adding domains with publisher attribution
const testDomainAssignment = async () => {
  const response = await fetch('/api/orders/[orderId]/add-domains', {
    method: 'POST',
    body: JSON.stringify({
      domains: [{ domain: 'test.com', /* ... */ }]
    })
  });
  
  const result = await response.json();
  console.log('Line items created:', result);
  
  // Verify publisher fields are populated
  assert(result.lineItems[0].publisherId, 'Publisher ID should be set');
};
```
5. [ ] Run the test script
6. [ ] Database verification:
```sql
-- Check newly created line items have publisher attribution
SELECT 
  id,
  assigned_domain,
  publisher_id,
  publisher_offering_id,
  publisher_price,
  metadata->>'attributionSource' as attribution_source
FROM order_line_items
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

---

### 📝 Step 1.4: Create Publisher Resolution Helper

#### Implementation
**New File**: `lib/utils/publisherResolver.ts`

1. [ ] Create the resolver utility:
```typescript
import { db } from '@/lib/db/connection';
import { publishers, publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq } from 'drizzle-orm';

export interface PublisherInfo {
  publisher: {
    id: string;
    companyName: string;
    email: string;
    contactName?: string;
  } | null;
  offering: {
    id: string;
    name: string;
    basePrice: number;
    turnaroundDays?: number;
  } | null;
}

export async function resolvePublisherInfo(
  publisherId: string | null | undefined,
  offeringId?: string | null
): Promise<PublisherInfo | null> {
  if (!publisherId) return null;
  
  try {
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
    
    return { publisher, offering };
  } catch (error) {
    console.error('Error resolving publisher info:', error);
    return null;
  }
}

// Batch resolver for performance
export async function resolvePublishersInBatch(
  items: Array<{ publisherId?: string | null; offeringId?: string | null }>
): Promise<Map<string, PublisherInfo>> {
  const publisherIds = items
    .map(i => i.publisherId)
    .filter((id): id is string => Boolean(id));
    
  if (publisherIds.length === 0) return new Map();
  
  // Fetch all publishers in one query
  const publishersData = await db.query.publishers.findMany({
    where: inArray(publishers.id, publisherIds)
  });
  
  // Create map for quick lookup
  const resultMap = new Map<string, PublisherInfo>();
  // Implementation continues...
  
  return resultMap;
}
```

#### Verification
2. [ ] Run TypeScript check: `npx tsc --noEmit`
3. [ ] Create unit tests for the resolver
4. [ ] Test with real database data
5. [ ] Performance test batch resolver with 100+ items

---

## Phase 1 Testing Checklist

### Integration Testing
1. [ ] Create comprehensive test order flow:
```typescript
// scripts/test-phase1-integration.ts
async function testPhase1Integration() {
  // 1. Create test order
  const order = await createTestOrder();
  
  // 2. Add domains with various pricing strategies
  const domains = [
    { domain: 'min-price-test.com' },
    { domain: 'max-price-test.com' },
    { domain: 'custom-price-test.com' }
  ];
  
  const result = await addDomainsToOrder(order.id, domains);
  
  // 3. Verify publisher attribution
  for (const lineItem of result.lineItems) {
    assert(lineItem.publisherId, `Missing publisher for ${lineItem.domain}`);
    assert(lineItem.publisherPrice, `Missing price for ${lineItem.domain}`);
    
    // Verify price matches strategy
    if (lineItem.metadata.pricingStrategy === 'max_price') {
      // Should have highest price
    }
  }
  
  // 4. Check database consistency
  const dbLineItems = await db.query.orderLineItems.findMany({
    where: eq(orderLineItems.orderId, order.id)
  });
  
  // Assertions...
}
```

2. [ ] Run full integration test
3. [ ] Check error logs for any warnings
4. [ ] Verify no performance degradation

### Database Verification
```sql
-- Final verification queries
-- 1. Check attribution coverage
SELECT 
  COUNT(*) as total_items,
  COUNT(publisher_id) as with_publisher,
  COUNT(publisher_offering_id) as with_offering,
  COUNT(publisher_price) as with_price
FROM order_line_items
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 2. Check for attribution errors
SELECT 
  id,
  assigned_domain,
  metadata->>'attributionError' as error,
  metadata->>'attributionSource' as source
FROM order_line_items
WHERE metadata->>'attributionError' IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour';

-- 3. Verify price consistency
SELECT 
  oli.assigned_domain,
  oli.publisher_price as line_item_price,
  po.base_price as offering_price,
  w.guest_post_cost as website_price,
  CASE 
    WHEN oli.publisher_price = po.base_price THEN 'MATCH'
    ELSE 'MISMATCH'
  END as price_check
FROM order_line_items oli
LEFT JOIN publisher_offerings po ON po.id = oli.publisher_offering_id
LEFT JOIN websites w ON w.domain = oli.assigned_domain
WHERE oli.publisher_id IS NOT NULL
  AND oli.created_at > NOW() - INTERVAL '1 hour';
```

### Build Verification
4. [ ] Run full build: `timeout 30 npm run build`
5. [ ] Verify 0 TypeScript errors
6. [ ] Check build time hasn't significantly increased

---

## Phase 2: Frontend Publisher Display

### 📝 Step 2.1: Database Migration - Remove Unused Fields

#### Pre-Implementation Checks
- [ ] Backup database before migration
- [ ] Verify fields are truly unused:
```sql
-- Check if any data exists in fields to be removed
SELECT 
  COUNT(*) as total,
  COUNT(publisher_status) as with_status,
  COUNT(platform_fee) as with_fee,
  COUNT(publisher_notified_at) as with_notified,
  COUNT(publisher_accepted_at) as with_accepted,
  COUNT(publisher_submitted_at) as with_submitted
FROM order_line_items;
```

#### Implementation
1. [ ] Create migration file: `migrations/0085_remove_unused_publisher_fields.sql`
```sql
-- Remove unused publisher fields from order_line_items
-- These fields belong in workflows, not line items
ALTER TABLE order_line_items 
  DROP COLUMN IF EXISTS publisher_status,
  DROP COLUMN IF EXISTS platform_fee,
  DROP COLUMN IF EXISTS publisher_notified_at,
  DROP COLUMN IF EXISTS publisher_accepted_at,
  DROP COLUMN IF EXISTS publisher_submitted_at;

-- Add comment to document remaining fields
COMMENT ON COLUMN order_line_items.publisher_id IS 'Publisher who provided the pricing for this line item';
COMMENT ON COLUMN order_line_items.publisher_offering_id IS 'Specific offering that determined the price';
COMMENT ON COLUMN order_line_items.publisher_price IS 'Locked-in publisher price at time of order creation';
```

#### Verification
2. [ ] Run migration in development: `npm run db:migrate`
3. [ ] Verify schema changes: `npm run db:studio`
4. [ ] Update TypeScript types if needed
5. [ ] Run build to catch any type errors: `npx tsc --noEmit`

---

### 📝 Step 2.2: Update LineItem TypeScript Interface

#### Pre-Implementation Checks
- [ ] Find all files using LineItem interface:
```bash
grep -r "interface LineItem" --include="*.ts" --include="*.tsx"
```
- [ ] Document current interface structure

#### Implementation
**File**: `components/orders/LineItemsReviewTable.tsx`

1. [ ] Update LineItem interface (around line 109-129):
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
  
  // ADD: Publisher attribution fields
  publisherId?: string;
  publisherOfferingId?: string;
  publisherPrice?: number;
  
  // ADD: Resolved display data (populated by API)
  publisherName?: string;
  publisherEmail?: string;
  offeringName?: string;
}
```

#### Verification
2. [ ] Run TypeScript check: `npx tsc --noEmit`
3. [ ] Check for any TypeScript errors in components using LineItem

---

### 📝 Step 2.3: Update API to Include Publisher Data

#### Pre-Implementation Checks
- [ ] Locate API endpoint that fetches line items
- [ ] Check current query structure

#### Implementation
**File**: Find the API route that serves line items (likely in `/api/orders/[id]/` somewhere)

1. [ ] Update the API to resolve publisher data:
```typescript
// After fetching line items
const lineItems = await db.query.orderLineItems.findMany({
  where: eq(orderLineItems.orderId, orderId),
  with: {
    client: true,
    assignedDomain: true
  }
});

// Resolve publisher information
const publisherIds = [...new Set(lineItems
  .map(item => item.publisherId)
  .filter(Boolean))];

let publishersMap = new Map();
if (publisherIds.length > 0) {
  const publishers = await db.query.publishers.findMany({
    where: inArray(publishers.id, publisherIds),
    columns: {
      id: true,
      companyName: true,
      email: true,
      contactName: true
    }
  });
  
  publishersMap = new Map(publishers.map(p => [p.id, p]));
}

// Enrich line items with publisher data
const enrichedLineItems = lineItems.map(item => ({
  ...item,
  publisherName: publishersMap.get(item.publisherId)?.companyName,
  publisherEmail: publishersMap.get(item.publisherId)?.email
}));

return enrichedLineItems;
```

#### Verification
2. [ ] Test API endpoint directly:
```bash
curl http://localhost:3000/api/orders/[orderId]/line-items
```
3. [ ] Verify publisher fields are included in response
4. [ ] Check performance with large orders (100+ line items)

---

### 📝 Step 2.4: Add Publisher Column to UI

#### Pre-Implementation Checks
- [ ] Review current table structure in `LineItemsReviewTable.tsx`
- [ ] Check permissions logic for internal vs account users

#### Implementation
**File**: `components/orders/LineItemsReviewTable.tsx`

1. [ ] Add table header (around line 1145):
```typescript
{/* Publisher column - Internal users only */}
{userType === 'internal' && permissions.canViewInternalTools && (
  <th className="pb-2 font-medium min-w-[180px]">Publisher</th>
)}
```

2. [ ] Add table cell in body:
```typescript
{/* Publisher info cell */}
{userType === 'internal' && permissions.canViewInternalTools && (
  <td className="py-3 px-4 text-sm">
    {item.publisherId ? (
      <div className="space-y-0.5">
        <div className="font-medium text-sm text-gray-900">
          {item.publisherName || 'Unknown Publisher'}
        </div>
        <div className="text-xs text-gray-500">
          ${((item.publisherPrice || 0) / 100).toFixed(0)}
          {item.publisherEmail && ` • ${item.publisherEmail}`}
        </div>
        {item.metadata?.attributionError && (
          <div className="text-xs text-yellow-600">
            ⚠️ {item.metadata.attributionError}
          </div>
        )}
      </div>
    ) : (
      <div className="text-gray-400 text-xs">
        Not assigned
      </div>
    )}
  </td>
)}
```

#### Verification
3. [ ] Start dev server: `npm run dev`
4. [ ] Test as internal user - verify publisher column shows
5. [ ] Test as account user - verify publisher column is hidden
6. [ ] Test with various data states:
   - [ ] Line item with publisher
   - [ ] Line item without publisher
   - [ ] Line item with attribution error
7. [ ] Check responsive design on mobile viewport

---

## Phase 2 Testing Checklist

### UI Testing
1. [ ] Create Playwright test: `tests/publisher-display.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Publisher Display', () => {
  test('shows publisher column for internal users', async ({ page }) => {
    // Login as internal user
    await loginAsInternal(page);
    
    // Navigate to order page
    await page.goto('/orders/[testOrderId]/internal');
    
    // Verify publisher column exists
    await expect(page.locator('th:has-text("Publisher")')).toBeVisible();
    
    // Verify publisher data is displayed
    await expect(page.locator('td:has-text("Test Publisher Alpha")')).toBeVisible();
  });
  
  test('hides publisher column for account users', async ({ page }) => {
    // Login as account user
    await loginAsAccount(page);
    
    // Navigate to order page
    await page.goto('/orders/[testOrderId]');
    
    // Verify publisher column does NOT exist
    await expect(page.locator('th:has-text("Publisher")')).not.toBeVisible();
  });
});
```

2. [ ] Run Playwright tests
3. [ ] Manual testing checklist:
   - [ ] Check loading states
   - [ ] Verify data updates when order changes
   - [ ] Test with 100+ line items for performance
   - [ ] Check print view layout

### Performance Testing
```typescript
// scripts/test-publisher-performance.ts
async function testPublisherPerformance() {
  const startTime = Date.now();
  
  // Fetch order with many line items
  const response = await fetch('/api/orders/large-test-order/line-items');
  const data = await response.json();
  
  const loadTime = Date.now() - startTime;
  
  assert(loadTime < 2000, `Load time too slow: ${loadTime}ms`);
  assert(data.length > 100, 'Need at least 100 items for valid test');
  
  // Verify all items have publisher data resolved
  const withPublisher = data.filter(d => d.publisherName);
  console.log(`${withPublisher.length}/${data.length} items have publisher data`);
}
```

---

## Phase 3: Workflow Integration

### 📝 Step 3.1: Update Workflow Metadata Type

#### Pre-Implementation Checks
- [ ] Review current workflow type definitions
- [ ] Check all places using workflow metadata

#### Implementation
**File**: `types/workflow.ts`

1. [ ] Update metadata interface (around line 49-63):
```typescript
metadata: {
  pitchKeyword?: string;
  pitchTopic?: string;
  articleTitle?: string;
  wordCount?: number;
  googleDocUrl?: string;
  finalDraftUrl?: string;
  clientId?: string;
  orderId?: string;
  orderGroupId?: string;
  siteSelectionId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  targetPageId?: string;
  
  // ADD: Publisher attribution
  publisherId?: string;
  publisherOfferingId?: string;
  publisherPrice?: number;
}
```

#### Verification
2. [ ] Run TypeScript check: `npx tsc --noEmit`
3. [ ] Check for type errors in workflow components

---

### 📝 Step 3.2: Pass Publisher Data to Workflows

#### Implementation
**File**: `lib/services/workflowGenerationService.ts`

1. [ ] Update metadata in createWorkflowFromLineItem (line 244-250):
```typescript
metadata: {
  clientId: client.id,
  orderId: order.id,
  targetPageUrl: lineItem.targetPageUrl,
  anchorText: lineItem.anchorText,
  targetPageId: lineItem.targetPageId,
  // ADD: Publisher attribution
  publisherId: lineItem.publisherId || null,
  publisherOfferingId: lineItem.publisherOfferingId || null,
  publisherPrice: lineItem.publisherPrice || null
}
```

2. [ ] Add publisher imports at top of file:
```typescript
import { resolvePublisherInfo } from '@/lib/utils/publisherResolver';
import { publishers } from '@/lib/db/publisherSchemaActual';
```

3. [ ] Update generateWorkflowStepsForLineItem to be async and pre-populate:
```typescript
private static async generateWorkflowStepsForLineItem(
  lineItem: any, 
  domain: any
): Promise<any[]> {
  // Resolve publisher info if available
  let publisherInfo = null;
  if (lineItem.publisherId) {
    publisherInfo = await resolvePublisherInfo(
      lineItem.publisherId,
      lineItem.publisherOfferingId
    );
  }
  
  return WORKFLOW_STEPS.map((step, index) => {
    const isFirstTwoSteps = index === 0 || index === 1;
    
    // Pre-populate publisher-pre-approval step (index 3)
    if (step.id === 'publisher-pre-approval' && publisherInfo) {
      return {
        ...step,
        status: 'pending' as const,
        inputs: {},
        outputs: {
          publisherEmail: publisherInfo.publisher?.email || '',
          publisherName: publisherInfo.publisher?.companyName || '',
          agreedPrice: lineItem.publisherPrice 
            ? `$${(lineItem.publisherPrice / 100).toFixed(2)}` 
            : '',
          paymentTerms: 'PayPal upon publication', // Default, can be enhanced
          // Mark as pre-populated for UI indication
          prePopulated: true,
          prePopulatedFrom: 'order_line_item'
        }
      };
    }
    
    // Rest of existing logic...
    return {
      ...step,
      status: isFirstTwoSteps ? 'completed' as const : 'pending' as const,
      // existing inputs/outputs logic
    };
  });
}
```

4. [ ] Update the call in createWorkflowFromLineItem:
```typescript
// Change from:
steps: this.generateWorkflowStepsForLineItem(lineItem, domain),
// To:
steps: await this.generateWorkflowStepsForLineItem(lineItem, domain),
```

#### Verification
5. [ ] Run TypeScript check: `npx tsc --noEmit`
6. [ ] Test workflow generation:
```typescript
// scripts/test-workflow-generation.ts
async function testWorkflowGeneration() {
  // Create test order with publisher attribution
  const order = await createTestOrder();
  const lineItems = await addDomainsWithPublishers(order.id);
  
  // Generate workflows
  const response = await fetch(`/api/orders/${order.id}/generate-workflows`, {
    method: 'POST',
    body: JSON.stringify({ skipPaymentCheck: true })
  });
  
  const result = await response.json();
  
  // Fetch created workflows
  const workflows = await db.query.workflows.findMany({
    where: eq(workflows.orderId, order.id)
  });
  
  for (const workflow of workflows) {
    // Check metadata has publisher info
    assert(workflow.content.metadata.publisherId, 'Missing publisherId');
    
    // Check publisher-pre-approval step is pre-populated
    const preApprovalStep = workflow.content.steps.find(
      s => s.id === 'publisher-pre-approval'
    );
    
    assert(preApprovalStep.outputs.publisherEmail, 'Missing email');
    assert(preApprovalStep.outputs.agreedPrice, 'Missing price');
    assert(preApprovalStep.outputs.prePopulated === true, 'Not marked as pre-populated');
  }
}
```

---

### 📝 Step 3.3: Display Publisher Info in Workflows (Internal Only)

#### Implementation
**File**: `components/workflows/WorkflowListEnhanced.tsx` (or similar workflow display components)

1. [ ] Add publisher display to workflow cards:
```typescript
// In the workflow card component
{session?.userType === 'internal' && workflow.metadata?.publisherId && (
  <div className="mt-2 text-xs text-gray-500 border-t pt-2">
    <span className="font-medium">Publisher:</span>
    {' '}
    {/* We'll need to resolve this - either pass from API or use client-side fetch */}
    <PublisherBadge 
      publisherId={workflow.metadata.publisherId}
      price={workflow.metadata.publisherPrice}
    />
  </div>
)}
```

2. [ ] Create PublisherBadge component:
```typescript
// components/ui/PublisherBadge.tsx
export function PublisherBadge({ 
  publisherId, 
  price 
}: { 
  publisherId: string; 
  price?: number;
}) {
  const [publisher, setPublisher] = useState(null);
  
  useEffect(() => {
    // Fetch publisher info
    fetch(`/api/publishers/${publisherId}/info`)
      .then(res => res.json())
      .then(setPublisher);
  }, [publisherId]);
  
  if (!publisher) return <span className="text-gray-400">Loading...</span>;
  
  return (
    <span className="inline-flex items-center gap-1">
      <span>{publisher.companyName}</span>
      {price && (
        <span className="text-gray-400">
          • ${(price / 100).toFixed(0)}
        </span>
      )}
    </span>
  );
}
```

#### Verification
3. [ ] Test workflow display as internal user
4. [ ] Test workflow display as account user (should not see publisher)
5. [ ] Check performance with many workflows

---

## Phase 3 Testing Checklist

### End-to-End Workflow Test
```typescript
// scripts/test-e2e-workflow-publisher.ts
async function testEndToEndWorkflowPublisher() {
  console.log('🧪 Starting E2E Publisher Workflow Test');
  
  // 1. Create order with specific publisher/offering
  const order = await createOrder();
  console.log('✅ Order created:', order.id);
  
  // 2. Add domain that has known publisher
  const lineItem = await addDomainWithPublisher(order.id, {
    domain: 'test-publisher-domain.com',
    expectedPublisherId: 'test-pub-1'
  });
  console.log('✅ Line item created with publisher:', lineItem.publisherId);
  
  // 3. Generate workflow
  const workflow = await generateWorkflow(order.id, lineItem.id);
  console.log('✅ Workflow generated:', workflow.id);
  
  // 4. Verify workflow has publisher data
  assert(workflow.metadata.publisherId === 'test-pub-1');
  assert(workflow.metadata.publisherPrice > 0);
  console.log('✅ Workflow metadata contains publisher data');
  
  // 5. Verify Publisher Pre-Approval step is pre-populated
  const preApprovalStep = workflow.steps[3]; // Index 3
  assert(preApprovalStep.id === 'publisher-pre-approval');
  assert(preApprovalStep.outputs.publisherEmail);
  assert(preApprovalStep.outputs.publisherName);
  assert(preApprovalStep.outputs.agreedPrice);
  console.log('✅ Publisher Pre-Approval step pre-populated');
  
  // 6. Verify UI shows publisher info (internal user)
  const uiTest = await testWorkflowUIAsInternal(workflow.id);
  assert(uiTest.showsPublisher === true);
  console.log('✅ UI shows publisher for internal user');
  
  // 7. Verify UI hides publisher info (account user)
  const accountTest = await testWorkflowUIAsAccount(workflow.id);
  assert(accountTest.showsPublisher === false);
  console.log('✅ UI hides publisher for account user');
  
  console.log('🎉 E2E Test Passed!');
}
```

### Database Consistency Check
```sql
-- Verify workflow publisher data consistency
SELECT 
  w.id as workflow_id,
  w.content->>'metadata' as metadata,
  w.content->'metadata'->>'publisherId' as publisher_id,
  w.content->'metadata'->>'publisherPrice' as publisher_price,
  oli.publisher_id as line_item_publisher,
  oli.publisher_price as line_item_price,
  CASE 
    WHEN w.content->'metadata'->>'publisherId' = oli.publisher_id::text 
    THEN 'MATCH' 
    ELSE 'MISMATCH' 
  END as consistency_check
FROM workflows w
JOIN order_line_items oli ON oli.workflow_id = w.id
WHERE oli.publisher_id IS NOT NULL
  AND w.created_at > NOW() - INTERVAL '1 hour';
```

---

## Final Verification Checklist

### 🔍 Complete System Test
1. [ ] Run all unit tests: `npm test`
2. [ ] Run all integration tests: `npm run test:integration`
3. [ ] Run E2E tests: `npm run test:e2e`
4. [ ] Build verification: `timeout 30 npm run build`
5. [ ] No TypeScript errors
6. [ ] No console errors in browser
7. [ ] No degradation in performance

### 📊 Metrics to Track
- [ ] Page load time with publisher data
- [ ] API response time for line items
- [ ] Workflow generation time
- [ ] Database query performance
- [ ] Memory usage with publisher resolution

### 🚀 Production Readiness
1. [ ] Feature flag for gradual rollout
2. [ ] Monitoring alerts configured
3. [ ] Rollback plan documented
4. [ ] Database backup before deployment
5. [ ] Load testing completed
6. [ ] Security review (no PII leakage to wrong users)

### 📝 Documentation Updates
1. [ ] Update API documentation
2. [ ] Update database schema docs
3. [ ] Create user guide for internal team
4. [ ] Document troubleshooting steps
5. [ ] Update workflow documentation

---

## Rollback Plan

If issues arise, follow these steps:

### Phase 3 Rollback (Workflow Integration)
1. Remove publisher fields from workflow metadata type
2. Remove pre-population logic from workflowGenerationService
3. Remove publisher display from workflow UI

### Phase 2 Rollback (Frontend)
1. Remove publisher column from LineItemsReviewTable
2. Remove publisher fields from LineItem interface
3. Remove publisher resolution from API

### Phase 1 Rollback (Backend)
1. Stop populating publisher fields in add-domains API
2. Revert PricingService changes
3. Revert derivedPricingService changes
4. Re-add removed database columns if needed:
```sql
ALTER TABLE order_line_items
  ADD COLUMN publisher_status VARCHAR(50),
  ADD COLUMN platform_fee INTEGER,
  ADD COLUMN publisher_notified_at TIMESTAMP,
  ADD COLUMN publisher_accepted_at TIMESTAMP,
  ADD COLUMN publisher_submitted_at TIMESTAMP;
```

---

## Success Criteria

The implementation is successful when:

1. ✅ All new line items have publisher attribution (when available)
2. ✅ Internal users can see publisher information
3. ✅ Account users cannot see publisher information
4. ✅ Workflows have pre-populated publisher data
5. ✅ Publisher Pre-Approval step shows correct information
6. ✅ No performance degradation (< 5% increase in load times)
7. ✅ No TypeScript errors
8. ✅ All tests passing
9. ✅ No breaking changes to existing functionality
10. ✅ Database consistency maintained

---

**Remember**: Measure twice, cut once. Test thoroughly at each step!