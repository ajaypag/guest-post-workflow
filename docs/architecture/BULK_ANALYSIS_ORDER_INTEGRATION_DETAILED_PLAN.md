# Bulk Analysis Order Integration - Detailed Implementation Plan

## Overview

Enhance the existing bulk analysis project page (`/clients/[clientId]/bulk-analysis/projects/[projectId]`) to support order context without creating new pages. This provides account users full access to rich bulk analysis data while maintaining order-specific functionality.

## Critical Requirements

### ❌ NO NEW PAGES
- **NEVER** create `/account/orders/[id]/analysis` or similar
- **ALWAYS** enhance existing `/clients/[clientId]/bulk-analysis/projects/[projectId]`
- **REUSE** all existing bulk analysis components and functionality

### ✅ URL Enhancement Patterns
```typescript
// Existing (unchanged)
/clients/99f819ed-9118-4e08-8802-2df99492d1c5/bulk-analysis/projects/85df8f3c-e443-4457-978b-106d5198afaa

// With order context (NEW)
/clients/99f819ed-9118-4e08-8802-2df99492d1c5/bulk-analysis/projects/85df8f3c-e443-4457-978b-106d5198afaa?orderId=abc123

// With guided domain focus (NEW)
/clients/99f819ed-9118-4e08-8802-2df99492d1c5/bulk-analysis/projects/85df8f3c-e443-4457-978b-106d5198afaa?orderId=abc123&guided=a6054d62-d639-45c5-8eee-17c7289103c0
```

## Implementation Breakdown

### 1. Query Parameter Detection
**File**: `/app/clients/[id]/bulk-analysis/projects/[projectId]/page.tsx`

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function BulkAnalysisProjectPage({ params }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // NEW: Order context detection
  const orderId = searchParams.get('orderId');
  const guidedDomainId = searchParams.get('guided');
  
  // NEW: Order-specific state
  const [orderContext, setOrderContext] = useState(null);
  const [highlightedDomain, setHighlightedDomain] = useState(null);
  
  useEffect(() => {
    if (orderId) {
      loadOrderContext(orderId, params.id);
    }
    if (guidedDomainId) {
      setHighlightedDomain(guidedDomainId);
      scrollToDomain(guidedDomainId);
    }
  }, [orderId, guidedDomainId]);
  
  const loadOrderContext = async (orderId: string, clientId: string) => {
    const response = await fetch(
      `/api/clients/${clientId}/bulk-analysis/projects/${params.projectId}?orderId=${orderId}`
    );
    const data = await response.json();
    setOrderContext(data.orderContext);
  };
}
```

### 2. Order Context Header Component
**Create**: `/components/OrderContextHeader.tsx`

```typescript
interface OrderContextHeaderProps {
  orderId: string;
  client: Client;
  orderContext: {
    remainingLinks: number;
    selectedCount: number;
    totalLinks: number;
    suggestedCount: number;
  };
  onBack: () => void;
}

export function OrderContextHeader({ orderId, client, orderContext, onBack }: OrderContextHeaderProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-blue-900">
              Viewing analysis for Order #{orderId.slice(0, 8)}
            </h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
              Order Context
            </span>
          </div>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-blue-700">
              Client: {client.name} • {orderContext.remainingLinks} links still needed
            </p>
            <div className="flex items-center space-x-4 text-sm text-blue-600">
              <span>Progress: {orderContext.selectedCount}/{orderContext.totalLinks} links selected</span>
              <span>•</span>
              <span>{orderContext.suggestedCount} team suggestions available</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          ← Back to Order
        </button>
      </div>
    </div>
  );
}
```

### 3. Enhanced Domain Card Component
**Modify**: Existing domain card/table components

```typescript
interface EnhancedDomainCardProps {
  domain: BulkAnalysisDomain;
  isOrderSuggested?: boolean;
  isOrderSelected?: boolean;
  isHighlighted?: boolean;
  orderActions?: {
    addToOrder: () => void;
    removeFromOrder: () => void;
  } | null;
  userCapabilities: UserCapabilities;
}

export function EnhancedDomainCard({ 
  domain, 
  isOrderSuggested, 
  isOrderSelected, 
  isHighlighted,
  orderActions, 
  userCapabilities 
}: EnhancedDomainCardProps) {
  return (
    <div 
      id={`domain-${domain.id}`}
      className={`
        border rounded-lg p-4 
        ${isHighlighted ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
        ${isOrderSuggested ? 'border-l-4 border-l-blue-500' : ''}
        ${isOrderSelected ? 'border-l-4 border-l-green-500 bg-green-50' : ''}
      `}
    >
      {/* Order Status Indicators */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold">{domain.domain}</h3>
          {isOrderSuggested && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              Team Suggested
            </span>
          )}
          {isOrderSelected && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              Selected for Order
            </span>
          )}
        </div>
        
        {/* Order-specific actions */}
        {orderActions && (
          <div className="space-x-2">
            {!isOrderSelected ? (
              <button 
                onClick={orderActions.addToOrder}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Add to Order
              </button>
            ) : (
              <button 
                onClick={orderActions.removeFromOrder}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Remove from Order
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Domain metrics and existing content */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>DR: {domain.dr || 'N/A'}</div>
        <div>Traffic: {domain.traffic || 'N/A'}</div>
        <div>Status: {domain.qualificationStatus}</div>
      </div>
      
      {/* Guided domain explanation */}
      {isHighlighted && (
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <h4 className="font-medium text-yellow-800 mb-2">
            Why this domain was suggested for your order:
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>✓ High authority score (DR {domain.dr})</li>
            <li>✓ Relevant traffic volume ({domain.traffic}/month)</li>
            <li>✓ Content alignment with your targets</li>
            <li>✓ Quality assessment: {domain.qualificationStatus}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 4. Order Actions Bar Component
**Create**: `/components/OrderActionsBar.tsx`

```typescript
interface OrderActionsBarProps {
  orderContext: {
    selectedCount: number;
    totalLinks: number;
    orderId: string;
  };
  onModifyLinkCount: () => void;
  onChangeTargets: () => void;
  onSaveSelections: () => void;
}

export function OrderActionsBar({ 
  orderContext, 
  onModifyLinkCount, 
  onChangeTargets, 
  onSaveSelections 
}: OrderActionsBarProps) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-medium">
            Order Progress: {orderContext.selectedCount}/{orderContext.totalLinks} links
          </span>
          <div className="w-48 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(orderContext.selectedCount / orderContext.totalLinks) * 100}%` 
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={onModifyLinkCount}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Modify Link Count
          </button>
          <button 
            onClick={onChangeTargets}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Change Targets
          </button>
          <button 
            onClick={onSaveSelections}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={orderContext.selectedCount === 0}
          >
            Save Selections
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5. User Capabilities Enhancement
**File**: Existing bulk analysis project page

```typescript
interface UserCapabilities {
  // Existing capabilities
  canEditProject: boolean;
  canDeleteProject: boolean;
  canBulkOperations: boolean;
  canSeeInternalNotes: boolean;
  canManageUsers: boolean;
  canExportData: boolean;
  
  // NEW: Order-specific capabilities
  canSelectForOrder: boolean;
  canModifyOrder: boolean;
  canViewFullAnalysis: boolean;
  canOverrideSuggestions: boolean;
  canModifyOrderTargets: boolean;
  canChangeOrderLinkCount: boolean;
}

function calculateUserCapabilities(session: Session, orderId?: string): UserCapabilities {
  const isInternal = session.userType === 'internal';
  const isAccount = session.userType === 'account';
  const hasOrderContext = !!orderId;
  
  return {
    // Existing internal user capabilities
    canEditProject: isInternal,
    canDeleteProject: isInternal,
    canBulkOperations: isInternal,
    canSeeInternalNotes: isInternal,
    canManageUsers: isInternal,
    canExportData: isInternal,
    
    // Order-specific capabilities
    canSelectForOrder: hasOrderContext,
    canModifyOrder: isAccount && hasOrderContext,
    canViewFullAnalysis: true, // Both user types
    canOverrideSuggestions: isAccount && hasOrderContext,
    canModifyOrderTargets: isAccount && hasOrderContext,
    canChangeOrderLinkCount: isAccount && hasOrderContext,
  };
}
```

### 6. API Enhancements
**File**: `/app/api/clients/[id]/bulk-analysis/projects/[projectId]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; projectId: string } }
) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('orderId');
  
  // Existing project data loading
  const project = await getProjectWithDomains(params.projectId);
  
  // NEW: Order context loading
  if (orderId) {
    const orderContext = await loadOrderContext(orderId, params.id);
    return NextResponse.json({
      ...project,
      orderContext
    });
  }
  
  return NextResponse.json(project);
}

async function loadOrderContext(orderId: string, clientId: string) {
  // Get order group for this client
  const orderGroup = await db.query.orderGroups.findFirst({
    where: and(
      eq(orderGroups.orderId, orderId),
      eq(orderGroups.clientId, clientId)
    )
  });
  
  if (!orderGroup) return null;
  
  // Get current selections for this order group
  const selections = await db.query.orderSiteSelections.findMany({
    where: eq(orderSiteSelections.orderGroupId, orderGroup.id),
    with: {
      domain: true
    }
  });
  
  return {
    orderId,
    orderGroupId: orderGroup.id,
    totalLinks: orderGroup.linkCount,
    selectedCount: selections.filter(s => s.status === 'approved').length,
    suggestedCount: selections.filter(s => s.status === 'suggested').length,
    remainingLinks: orderGroup.linkCount - selections.filter(s => s.status === 'approved').length,
    selectedDomains: selections.filter(s => s.status === 'approved').map(s => s.domainId),
    suggestedDomains: selections.filter(s => s.status === 'suggested').map(s => s.domainId),
    selections
  };
}

// NEW: Order-specific actions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; projectId: string } }
) {
  const { action, orderId, domainIds, linkCount, targets } = await request.json();
  
  if (action === 'addToOrder' && orderId && domainIds) {
    await addDomainsToOrder(orderId, params.id, domainIds);
    return NextResponse.json({ success: true });
  }
  
  if (action === 'removeFromOrder' && orderId && domainIds) {
    await removeDomainsFromOrder(orderId, params.id, domainIds);
    return NextResponse.json({ success: true });
  }
  
  if (action === 'modifyOrderLinkCount' && orderId && linkCount) {
    await modifyOrderLinkCount(orderId, params.id, linkCount);
    return NextResponse.json({ success: true });
  }
  
  if (action === 'modifyOrderTargets' && orderId && targets) {
    await modifyOrderTargets(orderId, params.id, targets);
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
```

### 7. Navigation Integration
**From Order Pages** (various order-related pages):

```typescript
// Order summary page - link to full analysis
<button 
  onClick={() => router.push(
    `/clients/${clientId}/bulk-analysis/projects/${projectId}?orderId=${orderId}`
  )}
  className="text-blue-600 hover:text-blue-800"
>
  View Full Analysis ({domainCount} domains analyzed)
</button>

// Order site selection page - link to specific domain
<button 
  onClick={() => router.push(
    `/clients/${clientId}/bulk-analysis/projects/${projectId}?orderId=${orderId}&guided=${domainId}`
  )}
  className="text-blue-600 hover:text-blue-800"
>
  View Details
</button>

// Domain suggestion card - guided deep dive
<div className="suggestion-card">
  <h4>{domain.name}</h4>
  <p>DR: {domain.dr} • Traffic: {domain.traffic}</p>
  <p>Suggested for {client.name}</p>
  <button 
    onClick={() => router.push(
      `/clients/${clientId}/bulk-analysis/projects/${projectId}?orderId=${orderId}&guided=${domainId}`
    )}
    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
  >
    View Detailed Analysis
  </button>
</div>
```

### 8. Guided Domain Functionality
**Auto-scroll and highlighting implementation**:

```typescript
// In bulk analysis project page component
useEffect(() => {
  if (guidedDomainId) {
    // Auto-scroll to domain
    const timer = setTimeout(() => {
      const domainElement = document.getElementById(`domain-${guidedDomainId}`);
      if (domainElement) {
        domainElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Highlight for 3 seconds
        setHighlightedDomain(guidedDomainId);
        setTimeout(() => {
          setHighlightedDomain(null);
        }, 3000);
      }
    }, 500); // Wait for page load
    
    return () => clearTimeout(timer);
  }
}, [guidedDomainId]);
```

## File Modifications Required

### Files to Modify
1. **`/app/clients/[id]/bulk-analysis/projects/[projectId]/page.tsx`** - Main page enhancement
2. **`/app/api/clients/[id]/bulk-analysis/projects/[projectId]/route.ts`** - API enhancement
3. **Existing domain card/table components** - Add order context props

### Files to Create
1. **`/components/OrderContextHeader.tsx`** - Order context display
2. **`/components/OrderActionsBar.tsx`** - Order-specific actions
3. **`/components/EnhancedDomainCard.tsx`** - Or modify existing domain components

### Files NOT to Create
- ❌ `/account/orders/[id]/analysis/page.tsx`
- ❌ `/app/order-analysis/`
- ❌ Any new top-level pages

## Implementation Priority

### Phase 1: Basic Order Context (Required)
1. ✅ Query parameter detection (`orderId`, `guided`)
2. ✅ Order context loading and API enhancement
3. ✅ Order context header component
4. ✅ User capability modifications

### Phase 2: Domain Selection (Required)
1. ✅ Enhanced domain cards with order context
2. ✅ Add/remove domain from order functionality
3. ✅ Order actions bar (progress, modify, save)
4. ✅ Domain highlighting and selection states

### Phase 3: Guided Experience (Required)
1. ✅ Auto-scroll to guided domain
2. ✅ Domain suggestion explanation
3. ✅ Navigation integration from order pages
4. ✅ Guided domain deep-dive functionality

### Phase 4: Order Flexibility (Nice to Have)
1. ⏳ Modify order link count functionality
2. ⏳ Change order target pages functionality
3. ⏳ Override team suggestions
4. ⏳ Order modification tracking

## Success Criteria

### Technical Requirements
- ✅ NO new pages created
- ✅ Existing bulk analysis functionality preserved
- ✅ Order context conditionally rendered
- ✅ Both user types (internal/account) supported
- ✅ Query parameters properly handled
- ✅ API backwards compatible

### User Experience Requirements
- ✅ Account users get full bulk analysis access
- ✅ Order context clearly displayed
- ✅ Guided domain deep-dive works
- ✅ Navigation flows from order pages
- ✅ Order modifications possible
- ✅ Progress tracking visible

### Data Requirements
- ✅ Junction table for project-order associations
- ✅ Order selections properly tracked
- ✅ Domain analysis reused across orders
- ✅ Order-specific context loaded efficiently

This plan provides the detailed implementation roadmap for enhancing the existing bulk analysis project page with order context functionality while avoiding the creation of duplicate interfaces or new pages.