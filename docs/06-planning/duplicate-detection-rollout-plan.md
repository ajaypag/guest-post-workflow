# Duplicate Detection Enhancement - Production Rollout Plan

**Status**: 🔄 Ready for Production Implementation  
**Risk Level**: HIGH - Production Database & Core Workflows  
**Rollout Strategy**: Phased with extensive validation at each step

## Pre-Implementation Safety Checklist

### ✅ Environment Verification
- [ ] Confirm current branch and database state
- [ ] Verify local development database is separate from production
- [ ] Backup current working state: `git status && git add -A && git commit -m "Pre-duplicate-detection backup"`
- [ ] Document current system behavior (take screenshots of working duplicate flow)

### ✅ Database Safety
- [ ] Verify database connection points to correct environment
- [ ] Test database rollback capability on non-production data
- [ ] Document current constraint: `CONSTRAINT bulk_analysis_domains_client_domain_unique UNIQUE (client_id, domain)`

---

## PHASE 1: Foundation & Database Migration (Day 1)

### Task 1.1: Create Database Migration
**Estimated Time**: 1 hour  
**Risk Level**: Medium (schema change)

#### Subtask 1.1.1: Create Migration File
- [ ] Create file: `/migrations/0072_add_target_page_hash.sql`
- [ ] Write migration SQL with exact production column names
- [ ] **CHECKPOINT**: Review migration SQL character by character

```sql
-- EXACT PRODUCTION MIGRATION
ALTER TABLE bulk_analysis_domains 
ADD COLUMN target_page_hash VARCHAR(32);

CREATE INDEX idx_bulk_domains_target_hash ON bulk_analysis_domains(target_page_hash);

-- Backfill with NULL-safe logic
UPDATE bulk_analysis_domains 
SET target_page_hash = MD5(
  CASE 
    WHEN target_page_ids IS NULL OR target_page_ids::text = '[]' THEN ''
    ELSE (
      SELECT COALESCE(string_agg(value, '|' ORDER BY value), '')
      FROM jsonb_array_elements_text(target_page_ids) AS value
    )
  END
)
WHERE target_page_hash IS NULL;
```

#### Subtask 1.1.2: Test Migration Locally
- [ ] Run migration on local database
- [ ] **CHECKPOINT**: Verify column exists: `\d bulk_analysis_domains`
- [ ] **CHECKPOINT**: Verify index exists: `\di idx_bulk_domains_target_hash`
- [ ] **CHECKPOINT**: Verify backfill worked: `SELECT target_page_hash FROM bulk_analysis_domains LIMIT 5;`
- [ ] Test rollback: Create rollback script and test it

#### Subtask 1.1.3: Validate Migration Impact
- [ ] **CHECKPOINT**: Run TypeScript compilation: `npm run build`
- [ ] **CHECKPOINT**: Verify no existing queries break
- [ ] **CHECKPOINT**: Test existing duplicate detection still works
- [ ] Document any issues found

### Task 1.2: Update Database Schema File
**Estimated Time**: 30 minutes  
**Risk Level**: Low (TypeScript only)

#### Subtask 1.2.1: Add Schema Field
- [ ] Open `/lib/db/bulkAnalysisSchema.ts`
- [ ] Add field after line 102: `targetPageHash: varchar('target_page_hash', { length: 32 }),`
- [ ] **CHECKPOINT**: TypeScript compilation: `npm run build`
- [ ] **CHECKPOINT**: No TypeScript errors in schema file

#### Subtask 1.2.2: Validate Schema Integration
- [ ] Import schema in a test file and verify field exists
- [ ] **CHECKPOINT**: Drizzle can generate queries with new field
- [ ] **CHECKPOINT**: All existing imports still work

---

## PHASE 2: Helper Functions & Utilities (Day 1-2)

### Task 2.1: Create Hash Utility Functions
**Estimated Time**: 1 hour  
**Risk Level**: Low (utility functions)

#### Subtask 2.1.1: Create Utility File
- [ ] Create `/lib/utils/targetHashUtils.ts`
- [ ] Implement hash functions with comprehensive error handling

```typescript
import crypto from 'crypto';

export function hashArray(arr: string[]): string {
  if (!arr || arr.length === 0) return '';
  return crypto.createHash('md5').update(arr.sort().join('|')).digest('hex');
}

export function isAnalysisStale(aiQualifiedAt: Date | null): boolean {
  if (!aiQualifiedAt) return true;
  const STALE_THRESHOLD = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
  return Date.now() - aiQualifiedAt.getTime() > STALE_THRESHOLD;
}
```

#### Subtask 2.1.2: Test Utility Functions
- [ ] Create test file: `/lib/utils/__tests__/targetHashUtils.test.ts`
- [ ] Test edge cases: null, empty arrays, duplicate values
- [ ] **CHECKPOINT**: All utility tests pass
- [ ] **CHECKPOINT**: TypeScript compilation clean

### Task 2.2: Update Analysis Skip Logic (CAREFUL!)
**Estimated Time**: 2 hours  
**Risk Level**: HIGH (core analysis logic)

#### Subtask 2.2.1: Backup Current Logic
- [ ] Copy current `masterQualificationService.ts` to backup file
- [ ] Document exact line numbers being modified (currently ~110-167)
- [ ] **CHECKPOINT**: Backup created and verified

#### Subtask 2.2.2: Modify Skip Logic (Incremental)
- [ ] First, only ADD the new logic without changing existing behavior
- [ ] Add feature flag: `const ENHANCED_SKIP_LOGIC = false;`
- [ ] Implement enhanced logic in separate function
- [ ] **CHECKPOINT**: TypeScript compilation after each function
- [ ] **CHECKPOINT**: Existing behavior unchanged when flag is false

```typescript
function shouldForceReanalysis(domain: any, options: any): boolean {
  if (!ENHANCED_SKIP_LOGIC) return false;
  
  const targetHashChanged = domain.targetPageHash !== hashArray(domain.targetPageIds || []);
  const analysisIsStale = isAnalysisStale(domain.aiQualifiedAt);
  return targetHashChanged || analysisIsStale || options.forceRefresh;
}

// Modify existing logic
const forceReanalysis = shouldForceReanalysis(domain, options);
const hasDataForSeo = domain.hasDataForSeoResults;
const needsDataForSeo = (!hasDataForSeo || forceReanalysis) && !options.skipDataForSeo;
const needsAI = (domain.qualificationStatus === 'pending' || forceReanalysis) && !options.skipAI;
```

#### Subtask 2.2.3: Validate Logic Changes
- [ ] **CHECKPOINT**: TypeScript compilation clean
- [ ] **CHECKPOINT**: Run existing tests if any exist
- [ ] **CHECKPOINT**: Test with feature flag off - behavior unchanged
- [ ] **CHECKPOINT**: Test with feature flag on - enhanced behavior works

---

## PHASE 3: Enhanced Duplicate Detection API (Day 2-3)

### Task 3.1: Update Duplicate Detection Response
**Estimated Time**: 2 hours  
**Risk Level**: Medium (API changes)

#### Subtask 3.1.1: Extend Interface Gradually
- [ ] Open `/lib/db/bulkAnalysisService.ts`
- [ ] Locate `checkDuplicatesWithDetails` method (around line 710)
- [ ] First, add new fields to response type without changing logic

```typescript
// EXTEND existing interface - don't break current usage
interface EnhancedDuplicateInfo {
  // Keep ALL existing fields
  domain: string;
  existingDomainId: string;
  existingProjectId: string;
  existingProjectName: string;
  qualificationStatus: string;
  hasWorkflow: boolean;
  checkedAt?: Date;
  checkedBy?: string;
  isInCurrentProject?: boolean;
  
  // NEW fields (optional to maintain compatibility)
  duplicateType?: 'exact_match' | 'different_target';
  existingTargets?: string[];
  newTargets?: string[];
  orderStatus?: 'none' | 'draft' | 'pending' | 'paid' | 'active';
  analysisAge?: number;
  smartDefault?: 'skip' | 'move_here';
  reasoning?: string;
}
```

#### Subtask 3.1.2: Add Order Status Query (Careful!)
- [ ] Create separate function first: `getOrderStatusForDomains()`
- [ ] Test function independently before integrating
- [ ] **CHECKPOINT**: New function works correctly
- [ ] **CHECKPOINT**: TypeScript compilation clean
- [ ] Only integrate into main flow after validation

#### Subtask 3.1.3: Enhance Detection Logic Incrementally
- [ ] Add target comparison logic in small steps
- [ ] **CHECKPOINT**: After each logical addition, test compilation
- [ ] **CHECKPOINT**: After each addition, test API response format
- [ ] Maintain backward compatibility throughout

---

## PHASE 4: Update Duplicate Resolution Logic (Day 3-4)

### Task 4.1: Enhance move_to_new Resolution (VERY CAREFUL!)
**Estimated Time**: 3 hours  
**Risk Level**: CRITICAL (core business logic)

#### Subtask 4.1.1: Create Backup and Test Environment
- [ ] **CRITICAL**: Create full backup of `resolveDuplicatesAndCreate` method
- [ ] Create test scenarios with known data
- [ ] **CHECKPOINT**: Can restore original logic if needed

#### Subtask 4.1.2: Add Target Merging Logic (Step by Step)
- [ ] First, add logic to READ existing targets (don't modify yet)
- [ ] **CHECKPOINT**: Can successfully retrieve existing targets
- [ ] Add target merging logic (don't save yet)  
- [ ] **CHECKPOINT**: Merging logic produces correct arrays
- [ ] Add re-analysis trigger logic (don't apply yet)
- [ ] **CHECKPOINT**: Can correctly detect when re-analysis needed
- [ ] Finally, integrate all pieces
- [ ] **CHECKPOINT**: Full flow works end-to-end

#### Subtask 4.1.3: Test Resolution Logic Thoroughly
- [ ] Test Case 1: Exact duplicate (same targets)
- [ ] Test Case 2: Different targets (should merge)
- [ ] Test Case 3: Stale analysis (should trigger re-analysis)
- [ ] **CHECKPOINT**: All test cases pass
- [ ] **CHECKPOINT**: No data corruption in test database

---

## PHASE 5: Update User Interface (Day 4-5)

### Task 5.1: Update DuplicateResolutionModal
**Estimated Time**: 2 hours  
**Risk Level**: Low (UI only)

#### Subtask 5.1.1: Backup Current Component
- [ ] Create backup of `/components/ui/DuplicateResolutionModal.tsx`
- [ ] **CHECKPOINT**: Backup verified and can be restored

#### Subtask 5.1.2: Simplify Resolution Options Gradually
- [ ] First, add new simplified options alongside existing ones
- [ ] Test that existing options still work
- [ ] **CHECKPOINT**: No breaking changes to UI
- [ ] Gradually remove old options after new ones proven to work
- [ ] **CHECKPOINT**: TypeScript compilation clean throughout

#### Subtask 5.1.3: Add Smart Defaults UI
- [ ] Add smart defaults logic incrementally
- [ ] **CHECKPOINT**: Defaults can be overridden manually
- [ ] **CHECKPOINT**: "Apply to all" functionality works
- [ ] Test bulk resolution scenarios

---

## PHASE 6: Feature Flag Rollout & Testing (Day 5)

### Task 6.1: Enable Enhanced Logic with Feature Flags
**Estimated Time**: 1 hour  
**Risk Level**: Medium (logic changes)

#### Subtask 6.1.1: Gradual Feature Flag Activation
- [ ] Set `ENHANCED_SKIP_LOGIC = true` in development
- [ ] **CHECKPOINT**: Enhanced logic works as expected
- [ ] **CHECKPOINT**: Can disable flag if issues found
- [ ] Test all flows with enhanced logic enabled

#### Subtask 6.1.2: End-to-End Integration Testing
- [ ] Test complete flow: Add duplicates → Resolve → Verify results
- [ ] **CHECKPOINT**: Target merging works correctly
- [ ] **CHECKPOINT**: Re-analysis triggers when expected
- [ ] **CHECKPOINT**: Smart defaults make sense to users

---

## Daily Checkpoints

### Every Day:
- [ ] **Morning**: `git status` - verify clean working state
- [ ] **Morning**: `npm run build` - verify TypeScript compilation
- [ ] **Midday**: Test current feature in isolation
- [ ] **Evening**: `git add -A && git commit -m "Progress: [describe work]"`
- [ ] **Evening**: Document any issues or concerns

### Critical Checkpoints:
- [ ] **After each file modification**: TypeScript compilation must pass
- [ ] **After each database change**: Test rollback procedure
- [ ] **After each API change**: Test backward compatibility
- [ ] **Before any production deployment**: Full end-to-end testing

---

## Rollback Procedures

### If TypeScript Issues:
1. Revert last commit: `git reset --hard HEAD~1`
2. Fix incrementally with smaller changes
3. Never proceed with TypeScript errors

### If Database Issues:
1. Have rollback migration ready: `DROP COLUMN target_page_hash`
2. Test rollback procedure before applying migration
3. Never apply to production without tested rollback

### If Logic Issues:
1. Disable feature flags immediately
2. Revert to backup files
3. Investigate in isolation before re-attempting

---

## Success Criteria for Each Phase

### Phase 1: ✅ Database migration successful, TypeScript clean
### Phase 2: ✅ Utility functions tested, skip logic enhanced (flag off)
### Phase 3: ✅ API returns enhanced data, backward compatible  
### Phase 4: ✅ Resolution logic merges targets, triggers re-analysis
### Phase 5: ✅ UI simplified, smart defaults work
### Phase 6: ✅ End-to-end flow works with enhanced logic

## Final Pre-Production Checklist

- [ ] All phases completed successfully
- [ ] All TypeScript compilation clean
- [ ] All backward compatibility verified
- [ ] All rollback procedures tested
- [ ] Documentation updated with changes made
- [ ] Feature flags ready for production toggle

**Only proceed to production after ALL checkpoints pass.**