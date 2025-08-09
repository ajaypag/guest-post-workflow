# OrderSiteReviewTableV2 Enhancement Plan

## Goal
Maintain all rich data and functionality from original table while adapting to the new status-based system (included/excluded/saved_for_later) instead of pool-based system.

## Core Features to Restore

### Phase 1: Critical Data Display (Priority: HIGH)
These features are essential for users to make informed decisions.

#### 1.1 Rich Domain Analysis Display
**Current V2:** Just shows domain name and DR
**Need:** Full bulk analysis data

```typescript
// Add to domain cell:
- Overlap status badges (direct/related/both/none)
- Authority scores (strong/moderate/weak)  
- Topic scope indicators
- DataForSEO results count
- AI qualification status
```

**Implementation:**
- Create `DomainAnalysisCell` component
- Use color-coded badges for quick scanning
- Show key metrics inline, not in tooltip

#### 1.2 Expandable Row Details
**Current V2:** No expansion
**Need:** Click to expand for full details

```typescript
// Expandable section shows:
- Full AI reasoning
- Evidence with median positions
- Keyword overlap details
- Historical performance
- Client review history
- Status change history
```

**Implementation:**
- Add expand/collapse per row
- Lazy load detailed data on expand
- Keep expanded state in component

#### 1.3 Visual Status Indicators
**Current V2:** Text badges only
**Need:** Rich visual feedback

```typescript
// Status visualization:
- Icons + colors for status
- Progress indicators for in-progress
- Warning icons for issues
- Success checkmarks for completed
```

### Phase 2: Functional Features (Priority: HIGH)

#### 2.1 Batch Operations
**Current V2:** One at a time only
**Need:** Bulk status changes

```typescript
// Batch features:
- Select all/none/filtered
- Bulk status change
- Bulk exclusion with reason
- Export selected
```

**Implementation:**
- Add checkbox column
- Floating action bar when items selected
- Batch API endpoint for status updates

#### 2.2 Advanced Filtering & Sorting
**Current V2:** Basic status filter
**Need:** Professional filtering

```typescript
// Filters needed:
- By DR range
- By traffic range
- By price range
- By qualification status
- By client
- By target page
- Combined filters
```

**Implementation:**
- Filter bar above table
- Save filter presets
- URL state for sharing filters

#### 2.3 Target Page Management
**Current V2:** Basic assignment
**Need:** Smart assignment with validation

```typescript
// Target page features:
- Show available slots per target
- Validate against limits
- Suggest best matches
- Warn on overallocation
```

### Phase 3: Status-Specific Features (Priority: MEDIUM)

#### 3.1 Status Workflow
Replace pool switching with status progression:

```typescript
// Status transitions:
saved_for_later → included (promote)
included → excluded (reject with reason)
excluded → saved_for_later (reconsider)
saved_for_later → excluded (permanent reject)
```

**Implementation:**
- Status transition buttons
- Reason modal for exclusions
- Undo last status change
- Status change confirmation

#### 3.2 Inclusion Order Management
**Current V2:** Has field but no UI
**Need:** Drag and drop ordering

```typescript
// Ordering features:
- Drag to reorder included items
- Auto-number display
- Order by priority
- Lock important items
```

**Implementation:**
- React DnD or similar
- Visual feedback during drag
- Persist order to inclusionOrder field

### Phase 4: Data Enrichment (Priority: MEDIUM)

#### 4.1 Inline Editing
**Current V2:** Modal only
**Need:** Quick inline edits

```typescript
// Inline editable:
- Anchor text (click to edit)
- Special instructions (expandable field)
- Internal notes (for internal users)
- Price override (with permission)
```

#### 4.2 Comparison View
**Current V2:** No comparison
**Need:** Compare against benchmark

```typescript
// Comparison features:
- Show "was/now" for changed items
- Highlight deviations from benchmark
- Show substitutions clearly
- Track reason for changes
```

### Phase 5: Polish & UX (Priority: LOW)

#### 5.1 Performance
- Virtual scrolling for large lists
- Pagination option
- Lazy loading of details
- Optimistic updates

#### 5.2 Accessibility
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels

## Implementation Strategy

### Step 1: Create Enhanced V2 Structure
```typescript
// New component structure:
OrderSiteReviewTableV2/
  ├── index.tsx (main table)
  ├── DomainAnalysisCell.tsx
  ├── StatusManagementCell.tsx
  ├── ExpandedRowDetails.tsx
  ├── FilterBar.tsx
  ├── BulkActionBar.tsx
  ├── InclusionOrderDragHandle.tsx
  └── hooks/
      ├── useTableFilters.ts
      ├── useBulkSelection.ts
      └── useStatusTransitions.ts
```

### Step 2: Progressive Enhancement
1. Start with Phase 1.1 (Rich Domain Display)
2. Add Phase 2.1 (Batch Operations)
3. Continue phase by phase
4. Test with users after each phase

### Step 3: Migration Path
```typescript
// Feature flag for gradual rollout:
const TABLE_FEATURES = {
  richDomainDisplay: true,
  batchOperations: false,
  advancedFiltering: false,
  dragAndDrop: false,
  inlineEditing: false
};
```

## Data Structure Updates

### Enhanced Submission Interface
```typescript
interface EnhancedSiteSubmission extends SiteSubmission {
  // Analysis data (always load)
  analysisData: {
    overlapStatus: string;
    authorityScores: {...};
    topicScope: string;
    aiReasoning: string;
    evidence: {...};
  };
  
  // Status metadata
  statusHistory: Array<{
    from: string;
    to: string;
    changedBy: string;
    changedAt: Date;
    reason?: string;
  }>;
  
  // Benchmark comparison
  benchmarkDeviation?: {
    wasIncluded: boolean;
    priceChange: number;
    isSubstitution: boolean;
  };
}
```

## API Updates Needed

### 1. Bulk Status Update
```typescript
POST /api/orders/[id]/bulk-status-update
{
  submissionIds: string[];
  status: 'included' | 'excluded' | 'saved_for_later';
  reason?: string;
}
```

### 2. Reorder Inclusions
```typescript
POST /api/orders/[id]/groups/[groupId]/reorder
{
  orderedSubmissionIds: string[];
}
```

### 3. Enhanced Submissions GET
```typescript
GET /api/orders/[id]/groups/[groupId]/submissions?enhanced=true
// Returns full analysis data, status history, benchmark comparison
```

## Testing Requirements

### User Flows to Test
1. Bulk exclude 10 domains with reason
2. Drag to reorder included domains
3. Filter by multiple criteria
4. Inline edit anchor text
5. Expand row to see full details
6. Compare against benchmark

### Performance Targets
- Table renders < 200ms for 100 items
- Expand details < 100ms
- Bulk operations < 1s for 50 items
- Filter updates < 50ms

## Success Metrics

✅ **Feature Parity:** 90% of original functionality adapted to new model
✅ **User Efficiency:** Reduce clicks for common tasks by 50%
✅ **Data Visibility:** All analysis data accessible without leaving table
✅ **Performance:** Handle 500+ submissions smoothly
✅ **Adoption:** Users prefer V2 over original

## Timeline Estimate

- Phase 1: 4-6 hours (Critical display)
- Phase 2: 6-8 hours (Functional features)
- Phase 3: 4-5 hours (Status workflow)
- Phase 4: 3-4 hours (Data enrichment)
- Phase 5: 2-3 hours (Polish)

**Total: 19-26 hours** for full feature parity

## Next Steps

1. Approve this plan
2. Start with Phase 1.1 (Rich Domain Display)
3. Create DomainAnalysisCell component
4. Update API to return enhanced data
5. Test with sample data
6. Iterate based on feedback

This plan maintains all valuable functionality while embracing the simpler status model.