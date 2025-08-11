# Pool System Refactor - Detailed Implementation Plan

## Overview
This document provides the step-by-step implementation plan for refactoring from pool-based to status-based system. Each step includes specific code changes, compile checks, and rollback points.

## Pre-Implementation Checklist
- [ ] Backup database
- [ ] Create feature branch: `order-flow-status-refactor`
- [ ] Document current pool system behavior
- [ ] Identify all 26 affected files
- [ ] Set up test environment

## Implementation Steps

### Step 1: Database Schema Updates
**Files:** 2 files
- `lib/db/projectOrderAssociationsSchema.ts`
- `lib/db/orderBenchmarkSchema.ts` (new)

**Actions:**
1. Create benchmark schema file
2. Update orderSiteSubmissions table:
   ```typescript
   // ADD these fields (keep pool fields for now):
   inclusionStatus: varchar('inclusion_status', { length: 20 }).notNull().default('included'),
   inclusionOrder: integer('inclusion_order').notNull().default(1),
   exclusionReason: text('exclusion_reason'),
   benchmarkId: uuid('benchmark_id').references(() => orderBenchmarks.id),
   ```
3. **DO NOT REMOVE** pool fields yet (migration safety)
4. Run: `npm run build` - ensure no errors
5. Create migration script

### Step 2: Create Migration API
**Files:** 1 new file
- `app/api/admin/pool-to-status-migration/route.ts`

**Actions:**
1. Create migration endpoint that:
   - Maps `primary` → `included`
   - Maps `alternative` → `saved_for_later`
   - Sets `inclusionOrder` from `poolRank`
   - Creates retroactive benchmarks
2. Add dry-run mode
3. Add rollback capability
4. Test with: `curl -X POST /api/admin/pool-to-status-migration?dryRun=true`

### Step 3: Update Core Submission APIs
**Files:** 6 critical APIs
- `app/api/orders/[id]/groups/[groupId]/submissions/route.ts`
- `app/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/edit/route.ts`
- `app/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/status/route.ts`
- `app/api/orders/[id]/groups/[groupId]/site-selections/route.ts`
- `app/api/orders/[id]/groups/[groupId]/site-selections/add/route.ts`
- `app/api/orders/[id]/confirm/route.ts` (add benchmark creation)

**Actions for each:**
1. Add status field handling alongside pool fields
2. Update queries to support both systems
3. Add feature flag: `USE_STATUS_SYSTEM`
4. Test each endpoint individually
5. Run: `npm run build` after each file

### Step 4: Create Benchmark System
**Files:** 3 new files
- `app/api/orders/[id]/benchmark/route.ts`
- `lib/orders/benchmarkUtils.ts`
- `components/orders/BenchmarkDisplay.tsx`

**Actions:**
1. Create benchmark creation utility
2. Create benchmark comparison logic
3. Create display component
4. Test benchmark creation on order confirmation
5. Verify benchmark data structure

### Step 5: Update OrderSiteReviewTable Component
**File:** `components/orders/OrderSiteReviewTable.tsx`

**Critical Changes:**
1. Add feature flag check:
   ```typescript
   const useStatusSystem = process.env.NEXT_PUBLIC_USE_STATUS_SYSTEM === 'true';
   ```
2. Conditional rendering for pool vs status:
   ```typescript
   {useStatusSystem ? (
     <StatusDropdown value={submission.inclusionStatus} />
   ) : (
     <PoolBadge pool={submission.selectionPool} rank={submission.poolRank} />
   )}
   ```
3. Update permissions:
   - Remove: `canRebalancePools`, `canSwitchPools`
   - Add: `canChangeStatus`, `canSetExclusionReason`
4. Update "Make Primary" to "Include Domain"
5. Remove rebalance functionality
6. Test component in isolation

### Step 6: Update Internal Page
**File:** `app/orders/[id]/internal/page.tsx`

**Changes:**
1. Remove pool tabs UI
2. Add status filter buttons
3. Remove rebalance button and logic
4. Add benchmark comparison panel
5. Update data fetching to include status
6. Simplify state management
7. Test page functionality

### Step 7: Remove Pool-Specific APIs
**Files:** 3 APIs to deprecate
- `app/api/orders/[id]/rebalance-pools/route.ts`
- `app/api/orders/[id]/groups/[groupId]/site-selections/[submissionId]/switch/route.ts`
- `app/api/admin/pool-system-migration/route.ts` (after migration)

**Actions:**
1. Add deprecation notice
2. Return 410 Gone status
3. Log usage for monitoring
4. Schedule for removal

### Step 8: Update Remaining APIs
**Files:** 11 APIs
- All remaining APIs that import projectOrderAssociationsSchema

**Actions for each:**
1. Update to use status fields
2. Maintain backward compatibility
3. Add logging for pool field usage
4. Test endpoints

### Step 9: Update Secondary Components
**Files:** 2 components
- `components/orders/OrderDetailsTable.tsx`
- `components/orders/AdminDomainTable.tsx`

**Actions:**
1. Update display logic for status
2. Remove pool-specific UI elements
3. Add status badges
4. Test component rendering

### Step 10: Update Order Pages
**Files:** 2 pages
- `app/orders/[id]/review/page.tsx`
- `app/admin/pool-system-migration/page.tsx`

**Actions:**
1. Update review page for status system
2. Add migration complete notice
3. Test page functionality

### Step 11: Update Database Connection
**File:** `lib/db/connection.ts`

**Actions:**
1. Import new benchmark schema
2. Update schema exports
3. Run full type check

### Step 12: Final Cleanup
**Actions:**
1. Remove feature flags (make status system default)
2. Add database migration to remove pool fields (30 days later)
3. Update all TypeScript types
4. Remove deprecated code

## Testing Plan

### After Each Step:
```bash
# Compile check
npm run build

# Type check
npx tsc --noEmit

# Run tests if available
npm test
```

### Integration Testing:
1. Create new order
2. Add domains
3. Confirm order (creates benchmark)
4. Modify submissions (change status)
5. View benchmark comparison
6. Test all user types (internal, account)

### Regression Testing:
1. Existing orders still work
2. APIs return expected data
3. UI displays correctly
4. No TypeScript errors
5. No console errors

## Rollback Points

### Level 1 (Feature Flag):
- Toggle `USE_STATUS_SYSTEM=false`
- Both systems run in parallel

### Level 2 (Code Revert):
- Git revert to previous commit
- Database fields preserved

### Level 3 (Full Rollback):
- Restore database backup
- Deploy previous version

## Problem Detection

### Compile-Time Checks:
- Run after EVERY file change
- Fix immediately if broken
- Never proceed with errors

### Runtime Monitoring:
- Log all status field usage
- Monitor for null/undefined
- Track API response times
- Check for UI errors

### Data Integrity:
- Verify migration accuracy
- Check benchmark creation
- Validate status transitions
- Ensure no data loss

## Known Issues to Address

1. **Auto-save in edit page** - Must be removed
2. **Order locking** - Prevent edits after confirmation
3. **Status validation** - Ensure valid transitions
4. **Benchmark size** - Monitor JSONB storage
5. **Performance** - Index new fields properly
6. **Permissions** - Update for new model
7. **Notifications** - Update for status changes
8. **Audit trail** - Track all changes
9. **Bulk operations** - Update for status
10. **Export/Import** - Handle new fields

## Success Metrics

- [ ] Zero TypeScript errors
- [ ] All builds pass
- [ ] No runtime errors
- [ ] Existing orders work
- [ ] New orders create benchmarks
- [ ] Status changes save correctly
- [ ] UI displays properly
- [ ] Performance unchanged
- [ ] Data integrity maintained
- [ ] Rollback tested

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Steps 1-2 | 2 hours | Database & Migration |
| Steps 3-4 | 3 hours | Core APIs & Benchmark |
| Steps 5-6 | 3 hours | Main UI Components |
| Steps 7-8 | 2 hours | API Cleanup |
| Steps 9-11 | 2 hours | Secondary Components |
| Step 12 | 1 hour | Final Cleanup |
| Testing | 2 hours | Full Testing |
| **Total** | **15 hours** | Complete Refactor |

## Final Checklist

Before declaring complete:
- [ ] All 26 files updated
- [ ] Zero compile errors
- [ ] Zero TypeScript errors
- [ ] All tests pass
- [ ] Migration tested
- [ ] Rollback tested
- [ ] Documentation updated
- [ ] Team notified
- [ ] Monitoring in place
- [ ] Backup verified

This plan ensures systematic, safe refactoring with multiple checkpoints and rollback options.