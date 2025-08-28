# Duplicate Detection Enhancement - Implementation Plan

**Status**: 🔄 Ready for Implementation  
**Created**: 2025-08-28  
**Estimated Effort**: 4-5 days  
**Risk Level**: Low (works within existing constraints)

## Executive Summary

Enhance duplicate domain detection in bulk analysis with:
1. **Smart defaults** based on order status and target URL matching
2. **JSONB target merging** to handle multiple target URLs per domain
3. **Fixed analysis skip logic** to re-run when targets change or data is stale
4. **Simplified 2-option resolution** (skip vs move_here)

## Current System Analysis

### Database Schema (Production Verified)
**Table**: `bulk_analysis_domains`
**Location**: `/lib/db/bulkAnalysisSchema.ts`

**Key Fields** (Production Verified):
```typescript
domain: varchar('domain', { length: 255 }).notNull(),
clientId: uuid('client_id').notNull().references(() => clients.id),
projectId: uuid('project_id').references(() => bulkAnalysisProjects.id),
targetPageIds: jsonb('target_page_ids').notNull().default([]),
qualificationStatus: varchar('qualification_status', { length: 50 }).notNull().default('pending'),
hasDataForSeoResults: boolean('has_dataforseo_results').default(false), // ⚠️ Note: column name is has_dataforseo_results
aiQualifiedAt: timestamp('ai_qualified_at'),
targetMatchedAt: timestamp('target_matched_at'),
duplicateResolution: varchar('duplicate_resolution', { length: 50 }),
duplicateResolvedAt: timestamp('duplicate_resolved_at'),
```

**Current Constraint**:
```sql
CONSTRAINT bulk_analysis_domains_client_domain_unique UNIQUE (client_id, domain)
```

### Current Duplicate Resolution Options
**Location**: `/lib/db/bulkAnalysisService.ts:5`
```typescript
export type DuplicateResolution = 'keep_both' | 'move_to_new' | 'skip' | 'update_original';
```

### Current Analysis Skip Logic  
**Location**: `/lib/services/masterQualificationService.ts:110-167`
```typescript
// DataForSEO Skip
const hasDataForSeo = domain.hasDataForSeoResults;
const needsDataForSeo = !options.skipDataForSeo && !hasDataForSeo;

// AI Qualification Skip  
const needsAI = !options.skipAI && domain.qualificationStatus === 'pending';
```

## Problems Identified

### 1. Resolution Options Don't Work
- **`keep_both`**: Fails due to unique constraint violation
- **`update_original`**: Complex and rarely used
- **User confusion**: 4 options with unclear business meaning

### 2. Analysis Skip Logic is Wrong
- **Target changes ignored**: Adding new target URLs doesn't trigger re-analysis
- **Stale data used**: 6+ month old analysis treated as fresh
- **Chain dependency broken**: DataForSEO keywords affect AI qualification

### 3. No Smart Defaults
- **Manual resolution required**: User must click through every duplicate
- **No context provided**: Order status and target matching not considered

## Implementation Plan

## Phase 1: Update Duplicate Detection API

### File: `/app/api/clients/[id]/bulk-analysis/check-duplicates/route.ts`

**Current Logic**: Basic domain matching
**New Logic**: Enhanced categorization

```typescript
// CURRENT: Production duplicate detection (verified from checkDuplicatesWithDetails)
const allExisting = await db
  .select({
    id: bulkAnalysisDomains.id,
    domain: bulkAnalysisDomains.domain,
    projectId: bulkAnalysisDomains.projectId,
    projectName: bulkAnalysisProjects.name,
    qualificationStatus: bulkAnalysisDomains.qualificationStatus,
    hasWorkflow: bulkAnalysisDomains.hasWorkflow,
    checkedAt: bulkAnalysisDomains.checkedAt,
    checkedBy: bulkAnalysisDomains.checkedBy,
  })
  .from(bulkAnalysisDomains)
  .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
  .where(
    and(
      eq(bulkAnalysisDomains.clientId, clientId),
      inArray(bulkAnalysisDomains.domain, cleanedDomains)
    )
  );

// AFTER: Enhanced duplicate context
interface EnhancedDuplicateInfo {
  domain: string;
  existingDomainId: string;
  existingProjectId: string;
  existingProjectName: string;
  // NEW FIELDS:
  duplicateType: 'exact_match' | 'different_target';
  existingTargets: string[];
  newTargets: string[];
  orderStatus: 'none' | 'draft' | 'pending' | 'paid' | 'active';
  analysisAge: number; // days since aiQualifiedAt
  smartDefault: 'skip' | 'move_here';
  reasoning: string;
}
```

**Database Queries Needed** (using correct column names):
```sql
-- Check order status for domains
SELECT 
  bad.domain,
  bad.target_page_ids as existing_targets,
  bad.ai_qualified_at,
  bad.has_dataforseo_results, -- ⚠️ Correct column name
  CASE 
    WHEN oli.id IS NULL THEN 'none'
    WHEN o.status IN ('paid', 'in_progress', 'completed') THEN 'active'  
    WHEN o.status IN ('draft', 'pending_confirmation') THEN 'draft'
    ELSE 'none'
  END as order_status
FROM bulk_analysis_domains bad
LEFT JOIN order_line_items oli ON oli.assigned_domain_id = bad.id
LEFT JOIN orders o ON o.id = oli.order_id
WHERE bad.client_id = $1 AND bad.domain = ANY($2)
```

## Phase 2: Enhance move_to_new Resolution

### File: `/lib/db/bulkAnalysisService.ts` (line ~520)

**Current `move_to_new` Logic**:
```typescript
case 'move_to_new':
  const [moved] = await db
    .update(bulkAnalysisDomains)
    .set({
      projectId: sanitizeUUID(projectId),
      targetPageIds: deduplicateArray(targetPageIds), // ❌ OVERWRITES existing targets
      // ... other fields
    })
```

**Enhanced Logic with Target Merging**:
```typescript
case 'move_to_new':
  // Get existing domain data
  const existingDomain = await db.query.bulkAnalysisDomains.findFirst({
    where: eq(bulkAnalysisDomains.id, resolution.existingDomainId)
  });
  
  // Merge target URLs
  const existingTargets = existingDomain?.targetPageIds || [];
  const newTargets = targetPageIds || [];
  const mergedTargets = [...new Set([...existingTargets, ...newTargets])];
  
  // Detect if targets changed (triggers re-analysis)
  const targetsChanged = mergedTargets.length !== existingTargets.length;
  const analysisStale = isAnalysisStale(existingDomain?.aiQualifiedAt);
  const needsReanalysis = targetsChanged || analysisStale;
  
  const [moved] = await db
    .update(bulkAnalysisDomains)
    .set({
      projectId: sanitizeUUID(projectId),
      targetPageIds: mergedTargets, // ✅ MERGE instead of overwrite
      // Reset analysis flags if re-analysis needed
      ...(needsReanalysis && {
        qualificationStatus: 'pending',
        hasDataForSeoResults: false, // Maps to has_dataforseo_results column
        aiQualifiedAt: null,
        targetMatchedAt: null,
        // Store hash of current targets for future change detection
        targetPageHash: hashArray(mergedTargets)
      }),
      // ... metadata fields
    })
```

**Helper Function to Add**:
```typescript
function isAnalysisStale(aiQualifiedAt: Date | null): boolean {
  if (!aiQualifiedAt) return true;
  const STALE_THRESHOLD = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
  return Date.now() - aiQualifiedAt.getTime() > STALE_THRESHOLD;
}

function hashArray(arr: string[]): string {
  return crypto.createHash('md5').update(arr.sort().join('|')).digest('hex');
}
```

## Phase 3: Fix Analysis Skip Logic

### File: `/lib/services/masterQualificationService.ts` (line 110)

**Current Skip Logic**:
```typescript
const hasDataForSeo = domain.hasDataForSeoResults;
const needsDataForSeo = !options.skipDataForSeo && !hasDataForSeo;
const needsAI = !options.skipAI && domain.qualificationStatus === 'pending';
```

**Enhanced Skip Logic**:
```typescript
// Check for analysis invalidation triggers
const targetHashChanged = domain.targetPageHash !== hashArray(domain.targetPageIds);
const analysisIsStale = isAnalysisStale(domain.aiQualifiedAt);
const forceReanalysis = targetHashChanged || analysisIsStale || options.forceRefresh;

// Enhanced skip conditions
const hasDataForSeo = domain.hasDataForSeoResults;
const needsDataForSeo = (!hasDataForSeo || forceReanalysis) && !options.skipDataForSeo;
const needsAI = (domain.qualificationStatus === 'pending' || forceReanalysis) && !options.skipAI;

// Log why re-analysis triggered
if (forceReanalysis) {
  console.log(`[REANALYSIS] Domain ${domain.domain}: ${
    targetHashChanged ? 'targets changed' : 
    analysisIsStale ? 'data stale' : 'forced'
  }`);
}
```

**Database Schema Addition Needed**:
```typescript
// Add to bulkAnalysisSchema.ts (after line 102)
targetPageHash: varchar('target_page_hash', { length: 32 }), // MD5 hash of sorted targets for change detection
```

## Phase 4: Update DuplicateResolutionModal

### File: `/components/ui/DuplicateResolutionModal.tsx`

**Current Resolution Options** (line 231):
```typescript
const actions: Array<{
  value: DuplicateResolution;
  label: string;
  description: string;
}> = [
  { value: 'keep_both', label: 'Keep in Both Projects', description: '...' },
  { value: 'move_to_new', label: 'Move to New Project', description: '...' },
  { value: 'skip', label: 'Skip This Domain', description: '...' },
  { value: 'update_original', label: 'Update Original Entry', description: '...' }
];
```

**Simplified Options**:
```typescript
const actions: Array<{
  value: 'skip' | 'move_here';
  label: string;
  description: string;
  icon: React.ReactElement;
  recommended?: boolean;
}> = [
  {
    value: 'move_here',
    label: 'Move to This Project',
    description: duplicate.duplicateType === 'different_target' 
      ? `Merge targets: ${duplicate.existingTargets.join(', ')} + ${duplicate.newTargets.join(', ')}`
      : 'Consolidate domain in this project',
    icon: <ArrowRight className="w-5 h-5" />,
    recommended: duplicate.smartDefault === 'move_here'
  },
  {
    value: 'skip',
    label: 'Skip This Domain',
    description: duplicate.orderStatus === 'active' 
      ? 'Domain is in active order - skipping to avoid conflicts'
      : 'Keep domain in original project only',
    icon: <X className="w-5 h-5" />,
    recommended: duplicate.smartDefault === 'skip'
  }
];
```

**Smart Defaults Pre-Selection**:
```typescript
useEffect(() => {
  // Pre-select smart defaults
  setDuplicates(initialDuplicates.map(d => ({ 
    ...d, 
    action: d.smartDefault || 'skip' 
  })));
}, [initialDuplicates]);
```

## Phase 5: Bulk Resolution Enhancement

**Add "Apply Defaults to All" Functionality**:
```typescript
const handleApplyDefaults = () => {
  setDuplicates(prev => prev.map(d => ({
    ...d,
    action: d.smartDefault || 'skip'
  })));
};
```

**UI Addition**:
```typescript
<div className="flex items-center gap-3 mb-4">
  <button
    onClick={handleApplyDefaults}
    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded"
  >
    ✨ Apply Smart Defaults to All
  </button>
  <span className="text-xs text-gray-500">
    {duplicates.filter(d => d.action === d.smartDefault).length}/{duplicates.length} using defaults
  </span>
</div>
```

## Database Migration Required

### Migration: `0072_add_target_page_hash.sql`

```sql
-- Add target page hash column for change detection
ALTER TABLE bulk_analysis_domains 
ADD COLUMN target_page_hash VARCHAR(32);

-- Create index for performance  
CREATE INDEX idx_bulk_domains_target_hash ON bulk_analysis_domains(target_page_hash);

-- Backfill existing data (using correct column name target_page_ids)
UPDATE bulk_analysis_domains 
SET target_page_hash = MD5(
  CASE 
    WHEN target_page_ids IS NULL OR target_page_ids = '[]' THEN ''
    ELSE (
      SELECT string_agg(value, '|' ORDER BY value)
      FROM jsonb_array_elements_text(target_page_ids) AS value
    )
  END
)
WHERE target_page_hash IS NULL;
```

## Testing Checklist

### Critical Path Tests
- [ ] Domain with exact target match → smart default = move_here or skip based on order status
- [ ] Domain with different targets → merge targets into JSONB array
- [ ] Domain in paid order → force confirmation with warning
- [ ] Stale analysis (6+ months) → trigger re-analysis on move
- [ ] Target hash change detection → invalidate analysis flags

### Edge Cases  
- [ ] Empty target page IDs → handle gracefully
- [ ] Very old domains (no aiQualifiedAt) → treat as stale
- [ ] Multiple projects with same domain → order status priority
- [ ] Concurrent duplicate resolution → optimistic locking

### Integration Tests
- [ ] DuplicateResolutionModal → BulkAnalysisService → Database updates
- [ ] Master qualification service → enhanced skip logic
- [ ] Analysis chain: DataForSEO → AI → Target matching

## Rollback Plan

If issues arise:
1. **Database**: Rollback migration `0072_add_target_page_hash.sql`
2. **Code**: Revert to original `DuplicateResolution` type with 4 options
3. **Skip Logic**: Remove enhanced conditions, use original logic
4. **UI**: Restore original 4-option modal

## Success Metrics

- **Reduced Support Tickets**: "Can't add domain" complaints drop by 80%
- **Cost Efficiency**: Duplicate analysis costs reduced (fewer accidental re-runs)
- **User Experience**: Average resolution time per duplicate < 5 seconds
- **Data Quality**: Analysis accuracy improved with proper re-run triggers

## Files Modified Summary

1. **`/app/api/clients/[id]/bulk-analysis/check-duplicates/route.ts`** - Enhanced duplicate detection
2. **`/lib/db/bulkAnalysisService.ts`** - Target merging in move_to_new resolution  
3. **`/lib/services/masterQualificationService.ts`** - Fixed analysis skip logic
4. **`/components/ui/DuplicateResolutionModal.tsx`** - Simplified 2-option UI with smart defaults
5. **`/lib/db/bulkAnalysisSchema.ts`** - Add targetPageHash field
6. **`/migrations/0072_add_target_page_hash.sql`** - Database migration

**Total Estimated Lines Changed**: ~300-400 lines
**New Code Added**: ~200 lines  
**Complexity**: Medium (mostly logic enhancement, no architectural changes)