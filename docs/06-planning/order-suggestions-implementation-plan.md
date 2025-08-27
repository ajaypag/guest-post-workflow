# Order Suggestions Module - Implementation Plan

**Status**: ✅ CORE FUNCTIONALITY COMPLETE (2025-08-27)

## Overview
Add a suggestions module to the order review page (`/orders/[id]/review`) that surfaces relevant vetted sites from the current account's bulk analysis domains to help users expand their orders with high-quality domains.

**Page Placement**: Positioned after the LineItemsReviewTable and before the Pricing Summary, providing a natural "what else?" moment after users review their current selections.

## Implementation Status

### ✅ Completed Features (2025-08-27)
1. **API Endpoint** (`/api/orders/[id]/suggestions`) - Working with auth, filtering, and pricing
2. **OrderSuggestionsModule Component** - Fully integrated with collapsible design
3. **Replace Domain Flow** - ReplaceLineItemModal with 2-step selection process
4. **Invoice Generation Solution** - InvoiceGenerationModal for handling problematic line items
5. **Line Item Management** - BulkDeleteLineItemsModal for batch operations
6. **Smart Filtering** - DR, traffic, price, search, and client filters
7. **Empty Line Item Support** - Replace modal includes empty items as perfect candidates

### 🔄 Pending Features
1. **Add New Domain Flow** - Integration with AddToOrderModalV2 (shows placeholder currently)
2. **Request More Sites** - Connection to QuickVettedSitesRequest component
3. **Auto-refresh** - Parent data refresh after replace/delete actions
4. **Status Transitions** - Proper draft → excluded status changes

## Current System Analysis

### Data Architecture
- **Vetted Sites**: Account-scoped domains from `bulkAnalysisDomains` with `qualificationStatus IN ('high_quality', 'good_quality')`
- **Order Line Items**: Current order contents in `orderLineItems` table
- **Account Scoping**: Suggestions limited to domains from bulk analysis projects belonging to the current account
- **Integration Point**: Leverages same domain data structure and pricing models

### Existing Patterns to Leverage
1. **Vetted Sites API** (`/api/vetted-sites`):
   - Smart defaults: `qualificationStatus: ['high_quality', 'good_quality']`, `available: true`
   - Rich filtering: DR, traffic, price ranges, search, client context
   - Domain availability checking via `activeLineItemsCount` subquery
   - Comprehensive domain data including metrics, pricing, target URLs

2. **AddToOrderModalV2**:
   - Two-step flow: Order selection → Domain configuration  
   - Target URL and anchor text configuration
   - Integration with line items API

3. **VettedSitesTable**:
   - Star/hide user actions with optimistic UI updates
   - Expandable domain details
   - Selection management with bulk operations

## Implementation Architecture

### 1. API Layer
**New Endpoint**: `/api/orders/[id]/suggestions`

**Account & User Context Handling**:
- **External Users (accounts)**: Only see domains from their own account's bulk analysis projects
- **Internal Users**: Even though they can switch accounts generally, suggestions are account-specific to the order (no account switching in this context)
- **Security**: All suggestions filtered by `account_id` through client relationships

**Smart Filtering Algorithm**:
```sql
-- 1. Base qualification filter (vetted sites only)
WHERE qualification_status IN ('high_quality', 'good_quality')

-- 2. Account scoping (critical security boundary)
AND client_id IN (
  SELECT id FROM clients WHERE account_id = :orderAccountId
)

-- 3. Availability filter (domain not in any active orders)
AND NOT EXISTS (
  SELECT 1 FROM order_line_items
  WHERE assigned_domain = bulk_analysis_domains.domain
  AND status != 'cancelled'
)

-- 4. Client relevance defaults (same clients as current order)
AND (
  :expandClients = true OR 
  client_id IN (
    SELECT DISTINCT client_id FROM order_line_items 
    WHERE order_id = :orderId
  )
)

-- 5. Target URL relevance (when target URLs specified in order)
AND (
  :targetUrls IS NULL OR
  target_page_ids && :targetPageIdsArray
)
```

**Fallback Strategy**:
1. **Default**: Show domains from same clients as existing line items
2. **Expandable**: Filter dropdown option to "Show all account clients" (using vetted sites filter design)
3. **Target URL Matching**: When order has target URLs, show domains qualified for those targets
4. **Empty State**: "Request More Sites" modal with pre-populated target URLs and filters

**Response Format**:
```typescript
interface SuggestionsResponse {
  domains: VettedSitesDomain[];  // Exact same rich format as /api/vetted-sites
  totalCount: number;
  filters: {
    availableClients: Client[];  // For client filter dropdown
    currentDefaults: {
      clientIds: string[];  // Currently selected clients
      targetUrls: string[];  // From existing order line items
      suggestedFilters: {    // Based on existing order
        drRange: [number, number];
        priceRange: [number, number];
      };
    };
  };
  requestMorePresets: {  // For empty state modal
    targetUrls: string[];
    filters: VettedSitesRequestFilters;
  };
}

// VettedSitesDomain = Same rich format with:
// - Domain metrics (DR, traffic, categories)
// - AI qualification data (reasoning, evidence)  
// - Pricing (retailPrice from PricingService)
// - Target URL matching data
// - All expandable detail data for informed decisions
```

**Request More Integration**:
- **Pre-populate target URLs**: Extract from existing order line items
- **Pre-populate filters**: DR range, price range based on order patterns
- **Modal experience**: In-page modal with "Open in new window" option
- **Smart defaults**: Account context, same clients, relevant categories

### 2. Component Architecture

```
OrderReviewPage
├── Header & Stats (existing)
├── LineItemsReviewTable (existing)
├── **OrderSuggestionsModule** ← NEW
│   ├── CollapsibleSection
│   │   ├── SuggestionsHeader (count, smart defaults indicator)
│   │   └── HorizontalFiltersBar (when expanded)
│   ├── SuggestionsTable (matches VettedSitesTable row format)
│   │   ├── DomainRow[] (with in-row actions)
│   │   ├── ExpandedDomainDetails (same as vetted sites)
│   │   └── LoadMoreButton / Pagination
│   ├── RequestMoreSitesButton (available both states)
│   └── ConfigurationModals (add/replace flows)
├── Pricing Summary (existing)  
└── Proceed Button (existing)
```

### 3. User Experience Flow

#### Initial State (Collapsed by Default)
- **Summary display**: `"12 relevant suggestions found"`
- **Smart defaults badge**: `"Based on your Technology clients"`
- **Request More option**: Available as secondary action
- **Expand trigger**: Click header to reveal full suggestions table

#### Expanded State
- **Horizontal filter bar**: Space-efficient top bar (DR, Price, Search, Client filter)
- **Table layout**: Matches vetted sites table row format exactly
- **Domain rows**: Same structure as VettedSitesTable with pricing and metrics
- **In-row actions**: 
  - `[+ Add New]` - Direct add to current order
  - `[⚡ Replace...]` - Replace existing line item
- **Expandable details**: Same rich expandable details as vetted sites
- **Request More**: Always available option for additional sites

#### Action Flows

**Add New Flow** (🔄 Pending):
1. Click `[+ Add New]` in table row
2. Open configuration modal (order pre-selected)
3. Configure target URL + anchor text
4. Add as new line item → Refresh order review

**Replace Existing Flow** (✅ Completed):
1. Click `[⚡ Replace...]` in table row  
2. ReplaceLineItemModal opens with 2-step process
3. Step 1: Select existing line item (includes empty items)
4. Step 2: Confirm replacement with comparison view
5. Preserves target URL, anchor text, client data
6. Updates domain and pricing → Modal closes

**Request More Sites Flow**:
- Available in both collapsed and expanded states
- Pre-populates with current order's target URLs and client context
- Opens QuickVettedSitesRequest modal with smart defaults

### 4. Data Integration

**Leverage Existing APIs**:
- Base suggestions data: Reuse `/api/vetted-sites` filtering logic
- Add to order: Reuse `/api/orders/[id]/line-items` POST/PATCH endpoints
- Domain pricing: Reuse PricingService calculations

**New API Methods**:
```typescript
// Get smart suggestions for order
GET /api/orders/[id]/suggestions?filters=...

// Enhanced line item operations
PATCH /api/orders/[id]/line-items/[lineItemId]/replace-domain
POST /api/orders/[id]/line-items/bulk-add-suggestions
```

### 5. UI/UX Specifications

#### Visual Design
- **Consistent with vetted sites**: Reuse color scheme, typography, spacing
- **Integrated feel**: Blend seamlessly with order review design  
- **Progressive disclosure**: Collapsed → filters → details on demand

#### Interaction Patterns
- **Optimistic updates**: Immediate feedback on add/replace actions
- **Loading states**: Skeleton table rows, button loading indicators
- **Error handling**: Inline error messages, retry mechanisms
- **Responsive**: Mobile-optimized table and filter layouts

#### Filter Behavior
```typescript
interface SmartDefaults {
  // Applied automatically based on order analysis
  clientIds: string[];  // Same clients as order
  qualificationStatus: ['high_quality', 'good_quality'];
  available: true;
  
  // Suggested ranges (user can override)
  suggestedDRRange: [number, number];  // Based on order DR ±20
  suggestedPriceRange: [number, number];  // Based on order price range
}
```

#### Accessibility
- **Screen reader**: Proper ARIA labels, semantic HTML
- **Keyboard navigation**: Tab order, enter/space activation
- **Focus management**: Logical focus flow, visible focus indicators

### 6. Technical Implementation

#### Phase 1: Foundation (Core Functionality) ✅ COMPLETE
1. **API endpoint**: ✅ Basic suggestions with smart defaults
2. **Collapsible section**: ✅ Simple expand/collapse with count (expanded by default)
3. **Table rows**: ✅ Match vetted sites format + actions
4. **Add to order**: 🔄 Integration pending with AddToOrderModal

#### Phase 2: Enhanced Features (PARTIALLY COMPLETE)
1. **Advanced filtering**: ✅ All filter options from vetted sites
2. **Replace existing**: ✅ Line item replacement flow with modal
3. **Invoice handling**: ✅ Smart invoice generation with auto-cancel
4. **Bulk operations**: ✅ Bulk delete for line item management
5. **Smart recommendations**: 🔄 ML-based relevance scoring (future)

#### Phase 3: Optimization
1. **Caching**: Redis caching for suggestions data
2. **Real-time updates**: WebSocket updates for availability
3. **Analytics**: Usage tracking and optimization
4. **A/B testing**: Conversion rate optimization

### 7. Database Considerations

**No new tables needed** - leverages existing:
- `bulkAnalysisDomains`: Suggestion candidates
- `orderLineItems`: Current order contents, availability checking
- `websites`: Domain metrics and pricing
- `clients`: Client context for relevance

**Query Optimization**:
- Index on `(qualification_status, client_id)` for fast suggestions filtering
- Index on `assigned_domain` in order_line_items for availability checking
- Consider materialized view for frequently-accessed suggestion pools

### 8. Success Metrics

**User Engagement**:
- Suggestions module expansion rate
- Click-through rate on suggestion actions
- Time spent in suggestions vs main order review

**Business Impact**:
- Average order value increase
- Conversion rate from suggestions to line items
- User satisfaction scores for order building process

**Technical Performance**:
- API response times (<500ms for suggestions)
- UI responsiveness (60fps interactions)
- Error rates and user-reported issues

### 9. Risk Mitigation

**Technical Risks**:
- **Performance**: Large suggestion sets → Pagination + virtual scrolling
- **Data consistency**: Stale availability data → Real-time checks on action
- **Complex state management**: Multiple modals, filters → Redux or Zustand

**UX Risks**:
- **Overwhelming choices**: Smart defaults + progressive disclosure
- **Action confusion**: Clear labeling, confirmation dialogs for replace
- **Mobile usability**: Touch-friendly targets, swipe gestures

**Business Risks**:
- **Cannibalization**: Monitor new vs replaced line items ratio
- **Quality concerns**: Only surface high_quality/good_quality domains
- **Client relevance**: Fallback to general suggestions if no client matches

### 10. Future Enhancements

**AI-Powered Recommendations**:
- Topic modeling for content relevance
- Collaborative filtering based on similar orders
- Predictive pricing for optimal suggestions

**Advanced Workflows**:
- Saved suggestion lists
- Team collaboration on suggestions
- Integration with bulk analysis request workflows

**Enterprise Features**:
- White-label suggestion customization
- API access for suggestion data
- Advanced analytics and reporting

---

## Next Steps

1. **Stakeholder Review**: Validate approach and scope with product team
2. **Technical Specification**: Detailed API contracts and data models  
3. **Design System**: Create component specifications and visual designs
4. **Development Planning**: Sprint breakdown and resource allocation
5. **Testing Strategy**: Unit, integration, and user acceptance test plans

This implementation leverages existing proven patterns while adding significant value to the order building experience through intelligent, contextual suggestions.