# Pool-Based to Status-Based System Refactoring Documentation

## Executive Summary

This document outlines the complete refactoring of the order submission system from a complex pool-based (primary/alternative) model to a simpler status-based (included/excluded/saved) model with benchmark tracking. The refactor aims to reduce bugs, simplify the UI, and provide better tracking of client expectations vs actual delivery.

## Background & Problem Statement

### Current Issues with Pool System
1. **Complexity**: The primary/alternative pool system with ranks is confusing for users
2. **Bugs**: Multiple issues with edit/delete functionality, automatic rebalancing, and state management
3. **User Frustration**: "Man, honestly the amount of like just bugs and nonsense that has been introduced in this flow is crazy"
4. **No Benchmark Tracking**: No way to track what client originally requested vs what's being delivered
5. **Automatic Rebalancing**: Too disruptive - changes things users didn't specifically want changed

### Key User Feedback
- "honestly, i think soft hiding or whatever was a mistake. if the internal user wants to delete, it should just be a hard delete"
- "hold on. rebalance updates the entire table correct? like affecting all rows and maybe changing things the user didn't specifically want?"
- "the first order/id/edit page is like the clients wishlist... we need to log that and document it. and benchmark it to the rest of the flow"

## Proposed Solution

### Core Concept
Transform from a pool-based system to a status-based system with benchmark tracking:

1. **Order Creation Phase** (`/orders/new` → `/orders/[id]/edit`)
   - Client creates their "wishlist" of desired domains
   - Editable until confirmation
   - No auto-save (prevents accidental changes)

2. **Benchmark Creation** (on order confirmation)
   - Capture complete snapshot of client's request
   - Becomes immutable reference point
   - Track: requested domains, target pages, prices, link counts

3. **Fulfillment Phase** (`/orders/[id]/internal`)
   - Simple status for each domain: `included`, `excluded`, `saved`
   - No pools, no ranks, no automatic rebalancing
   - Track actual delivery vs benchmark

### Database Changes

#### Remove from `orderSiteSubmissions`:
- `selectionPool` (varchar)
- `poolRank` (integer)

#### Add to `orderSiteSubmissions`:
- `inclusionStatus`: `'included' | 'excluded' | 'saved_for_later'`
- `inclusionOrder`: integer (simple display order, manually controlled)
- `exclusionReason`: text (why domain was excluded)

#### New Tables:
- `order_benchmarks`: Captures wishlist at confirmation
- `benchmark_comparisons`: Tracks delivery vs expectations

## Components Requiring Changes

### 1. Database Schema Files
- `/lib/db/projectOrderAssociationsSchema.ts`
- `/lib/db/orderBenchmarkSchema.ts` (new)

### 2. API Routes
- `/app/api/orders/[id]/groups/[groupId]/submissions/route.ts`
- `/app/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/edit/route.ts`
- `/app/api/orders/[id]/rebalance-pools/route.ts` (remove)
- `/app/api/orders/[id]/confirm/route.ts` (add benchmark creation)
- `/app/api/orders/[id]/benchmark/route.ts` (new)

### 3. UI Components
- `/components/orders/OrderSiteReviewTable.tsx`
- `/components/orders/OrderBenchmarkDisplay.tsx` (new)
- `/components/orders/BenchmarkComparison.tsx` (new)

### 4. Page Components
- `/app/orders/[id]/edit/page.tsx`
- `/app/orders/[id]/internal/page.tsx`
- `/app/orders/[id]/page.tsx`
- `/app/orders/[id]/review/page.tsx`

### 5. Utility Functions
- `/lib/orders/poolUtils.ts` (remove)
- `/lib/orders/benchmarkUtils.ts` (new)
- `/lib/orders/statusUtils.ts` (new)

## Detailed Component Analysis

### OrderSiteReviewTable.tsx
**Current State:**
- Complex logic for primary/alternative pools
- Pool rank management
- Automatic rebalancing
- Edit/delete with pool reassignment

**Required Changes:**
- Remove all pool-related columns and logic
- Replace with simple status dropdown (included/excluded/saved)
- Remove rebalance functionality
- Simplify edit modal - no pool selection
- Add exclusion reason field
- Add manual ordering (drag and drop or arrows)

### Internal Page (`/app/orders/[id]/internal/page.tsx`)
**Current State:**
- Pool management UI
- Automatic rebalancing after changes
- Complex state management for pools

**Required Changes:**
- Remove pool tabs/sections
- Single list with status badges
- Add benchmark comparison panel
- Remove rebalance button
- Add "Compare to Benchmark" view
- Simplify state management

### Order Edit Page (`/app/orders/[id]/edit/page.tsx`)
**Current State:**
- Auto-save functionality
- Editable even after confirmation
- No version tracking

**Required Changes:**
- Remove auto-save
- Add explicit "Save Draft" button
- Lock after confirmation (redirect to review page)
- Add "This will become the benchmark upon confirmation" notice
- Clear indication of draft vs confirmed state

### API Route Changes

#### `/api/orders/[id]/confirm/route.ts`
**Add:**
```typescript
// Create benchmark snapshot
const benchmark = await createOrderBenchmark(orderId, userId);
```

#### `/api/orders/[id]/groups/[groupId]/submissions/route.ts`
**Remove:**
- Pool assignment logic
- Rank calculation

**Add:**
- Status-based filtering
- Inclusion order management

## Implementation Plan

### Phase 1: Database Migration
1. Create new benchmark tables
2. Add new columns to orderSiteSubmissions
3. Migrate existing data (set all primary → included, alternative → saved_for_later)
4. Create migration script at `/app/admin/pool-to-status-migration/route.ts`

### Phase 2: API Updates
1. Update submission creation to use status instead of pools
2. Remove rebalance endpoint
3. Add benchmark creation to confirmation
4. Update edit/delete endpoints
5. Create benchmark comparison endpoint

### Phase 3: Component Refactoring
1. Update OrderSiteReviewTable
2. Update internal page
3. Update edit page
4. Create benchmark components
5. Update order page displays

### Phase 4: Testing & Bug Fixes
1. Compile tests after each component
2. Test all CRUD operations
3. Test benchmark creation and comparison
4. Fix TypeScript errors
5. Manual testing of full flow

## Migration Strategy

### For Existing Orders
1. All `selectionPool: 'primary'` → `inclusionStatus: 'included'`
2. All `selectionPool: 'alternative'` → `inclusionStatus: 'saved_for_later'`
3. Create retroactive benchmarks from current state
4. Set `inclusionOrder` based on current `poolRank`

### Data Preservation
- Keep pool columns temporarily (mark as deprecated)
- Run parallel for 30 days
- Remove after verification

## Success Criteria

1. **Simplified UI**: No more pool confusion
2. **Clear Benchmark Tracking**: Always know what was requested vs delivered
3. **No Automatic Changes**: User has full control
4. **Reduced Bugs**: Simpler model = fewer edge cases
5. **Better Visibility**: Clear status for every domain
6. **TypeScript Compliance**: All types properly updated
7. **No Breaking Changes**: Existing orders continue to work

## Potential Issues & Mitigations

### Issue 1: Loss of Automatic Optimization
**Mitigation**: Add "Suggested Optimizations" panel that shows recommendations without auto-applying

### Issue 2: Manual Ordering Overhead
**Mitigation**: Add bulk actions and smart defaults

### Issue 3: Benchmark Storage Size
**Mitigation**: Use JSONB compression, archive old benchmarks

### Issue 4: Migration Complexity
**Mitigation**: Run both systems in parallel temporarily

### Issue 5: User Training
**Mitigation**: Add tooltips and help text explaining new system

## Rollback Plan

If issues arise:
1. Keep pool columns in database
2. Feature flag for new vs old UI
3. Gradual rollout by order ID
4. Complete rollback possible within 30 days

## Timeline Estimate

- Phase 1 (Database): 2 hours
- Phase 2 (API): 3 hours  
- Phase 3 (Components): 4 hours
- Phase 4 (Testing): 2 hours
- Buffer: 2 hours
- **Total**: ~13 hours

## Next Steps

1. Review and approve this plan
2. Create database migration
3. Update APIs incrementally
4. Refactor components one by one
5. Test thoroughly
6. Deploy with feature flag
7. Monitor and iterate

---

## Appendix: Specific Code Changes

### OrderSiteSubmissions Schema Change
```typescript
// REMOVE:
selectionPool: varchar('selection_pool', { length: 20 }).notNull().default('primary'),
poolRank: integer('pool_rank').notNull().default(1),

// ADD:
inclusionStatus: varchar('inclusion_status', { length: 20 }).notNull().default('included'),
// Values: 'included', 'excluded', 'saved_for_later'
inclusionOrder: integer('inclusion_order').notNull().default(1),
exclusionReason: text('exclusion_reason'),
benchmarkId: uuid('benchmark_id').references(() => orderBenchmarks.id),
```

### Review Table UI Change
```typescript
// BEFORE:
<Badge>{submission.selectionPool === 'primary' ? 'Primary' : 'Alternative'}</Badge>
<span>Rank: {submission.poolRank}</span>

// AFTER:
<Select value={submission.inclusionStatus} onChange={updateStatus}>
  <option value="included">✓ Included</option>
  <option value="excluded">✗ Excluded</option>
  <option value="saved_for_later">⏸ Saved</option>
</Select>
```

### Benchmark Display Component
```typescript
interface BenchmarkComparison {
  requested: number;
  delivered: number;
  percentage: number;
  issues: string[];
}

<BenchmarkDisplay 
  benchmark={orderBenchmark}
  current={currentSubmissions}
  showDiff={true}
/>
```

This completes the comprehensive documentation of the refactoring plan.