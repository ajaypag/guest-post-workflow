# Critical Fixes Implementation Guide

## 1. Resubmission Flow (HIGHEST PRIORITY)

### Current Issue
```typescript
// /api/orders/[id]/submit/route.ts
if (order.status !== 'draft') {
  throw new Error('Order must be in draft status to submit');
}
```

### Fix Implementation
```typescript
// Option 1: Modify existing submit endpoint
if (order.status !== 'draft' && order.status !== 'pending_confirmation') {
  throw new Error('Order cannot be submitted from current status');
}

// Option 2: Create new resubmit endpoint
// /api/orders/[id]/resubmit/route.ts
export async function POST(request: NextRequest) {
  // Allow resubmission from pending_confirmation
  // Create order history entry
  // Notify internal team of changes
}
```

## 2. Bulk Analysis to Order Bridge

### Implementation Steps

1. **Add UI Button in Bulk Analysis**
```typescript
// In bulk analysis domain table
<button onClick={() => submitToOrder(selectedDomains)}>
  Submit to Client ({selectedDomains.length} sites)
</button>
```

2. **Create Bridge API Endpoint**
```typescript
// /api/bulk-analysis/[projectId]/submit-to-order/route.ts
export async function POST(request: NextRequest) {
  const { domainIds } = await request.json();
  
  // Find order group from project tags
  const project = await getProject(projectId);
  const orderGroupTag = project.tags.find(t => t.startsWith('order-group:'));
  const orderGroupId = orderGroupTag.split(':')[1];
  
  // Create site submissions
  const submissions = domainIds.map(domainId => ({
    orderGroupId,
    domainId,
    submissionStatus: 'pending',
    submittedAt: new Date()
  }));
  
  await db.insert(orderSiteSubmissions).values(submissions);
  
  // Update order state
  await updateOrderState(orderId, 'site_review');
}
```

3. **Update Order State Automatically**
```typescript
// When sites submitted, update order state
if (order.state === 'analyzing') {
  await db.update(orders)
    .set({ state: 'site_review' })
    .where(eq(orders.id, orderId));
}
```

## 3. Auto State Progression

### Add to Site Review Endpoint
```typescript
// /api/orders/[id]/groups/[groupId]/submissions/[submissionId]/review/route.ts

// After updating submission
const allSubmissions = await getOrderGroupSubmissions(groupId);
const pendingCount = allSubmissions.filter(s => s.status === 'pending').length;

if (pendingCount === 0) {
  // All sites reviewed
  const approvedCount = allSubmissions.filter(s => s.status === 'client_approved').length;
  
  if (approvedCount > 0) {
    // Move to payment pending
    await updateOrderState(orderId, 'payment_pending');
    
    // Create notification
    await createNotification({
      type: 'sites_approved',
      orderId,
      message: `${approvedCount} sites approved by client`
    });
  }
}
```

## 4. Fix Domain Metrics Display

### Update Site Selections Response
```typescript
// /api/orders/[id]/groups/[groupId]/site-selections/route.ts

// Replace hardcoded values
const transformedDomains = analyzedDomainsList.map(domain => ({
  id: domain.id,
  domain: domain.domain,
  dr: domain.metrics?.domainRating || domain.dr || 0, // Real DR
  traffic: domain.metrics?.monthlyTraffic || domain.traffic || 0, // Real traffic
  niche: domain.niche || 'General',
  status: domain.qualificationStatus,
  price: calculatePrice(domain), // Dynamic pricing based on metrics
  projectId: domain.projectId,
  notes: domain.notes
}));
```

### Store Metrics When Adding Domains
```typescript
// When creating bulk analysis domains
await db.insert(bulkAnalysisDomains).values({
  ...domainData,
  metrics: {
    domainRating: dataforseoData.dr,
    monthlyTraffic: dataforseoData.traffic,
    backlinks: dataforseoData.backlinks
  }
});
```

## 5. Add Advertiser Info Collection

### Option 1: Add to Edit Page
```typescript
// Add fields for external users
{session?.userType === 'account' && (
  <div className="bg-white p-6 rounded-lg mb-6">
    <h3 className="font-semibold mb-4">Advertiser Information</h3>
    <input
      type="text"
      placeholder="Company Name"
      value={advertiserCompany}
      onChange={(e) => setAdvertiserCompany(e.target.value)}
      className="w-full px-3 py-2 border rounded"
    />
    <textarea
      placeholder="Special instructions or notes"
      value={specialInstructions}
      onChange={(e) => setSpecialInstructions(e.target.value)}
      className="w-full px-3 py-2 border rounded mt-3"
      rows={3}
    />
  </div>
)}
```

### Option 2: Collect During Creation
```typescript
// Modify /orders/new to show a form instead of auto-redirect
export default function NewOrderPage() {
  const [showForm, setShowForm] = useState(true);
  
  if (showForm) {
    return <NewOrderForm onSubmit={createOrder} />;
  }
  
  // Current auto-create logic
}
```

## Quick Wins (Can Do Immediately)

1. **Add Expand/Collapse Toggle**
```typescript
// In /orders/[id]/page.tsx, line ~760
<button
  onClick={() => setExpandedSubmission(
    expandedSubmission === groupId ? null : groupId
  )}
  className="text-sm text-purple-600 hover:text-purple-800"
>
  {expandedSubmission === groupId ? 'Hide' : 'Show'} Sites
</button>
```

2. **Add Confirm Order Link**
```typescript
// In /orders/[id]/page.tsx when showing pending_confirmation
{order.status === 'pending_confirmation' && user?.userType === 'internal' && (
  <Link
    href={`/orders/${order.id}/confirm`}
    className="btn-primary"
  >
    Review & Confirm Order
  </Link>
)}
```

3. **Fix View Analysis Button**
```typescript
// In /orders/[id]/page.tsx
{item.bulkAnalysisId && (
  <Link
    href={`/bulk-analysis/${item.bulkAnalysisId}`}
    className="inline-flex items-center text-sm text-blue-600"
  >
    <Eye className="h-3 w-3 mr-1" />
    View Analysis
  </Link>
)}
```