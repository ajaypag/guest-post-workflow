# Duplicate Domain Detection Improvement Plan

**Status**: 🔄 Planning  
**Created**: 2025-08-28  
**Context**: Improving duplicate detection in bulk analysis to be smarter and more flexible

## Current Problems

1. **Too Restrictive**: Current `(clientId, domain)` unique constraint blocks legitimate use cases
2. **Different Targets Blocked**: Can't add same domain with different target URLs
3. **No Override Option**: Users can't force-add duplicates when they have valid reasons
4. **"keep_both" Broken**: Database constraint prevents the keep_both resolution from working

## Philosophy: Smart Defaults with Override Capability

> "Smart defaults that can be unselected or modified. That's when you get a good system."

- **Smart defaults** prevent common mistakes (wasting money on duplicate analysis)
- **Always allow overrides** when the user knows what they want
- **No hard blocks** - just warnings and confirmations

## REVISED: Small-Scale Solution (After Impact Analysis)

**Decision**: Keep existing database constraint to avoid breaking 15+ critical systems

### Approach: JSONB Target URLs + Smart UX

**Key Insight**: Use existing `targetPageIds` JSONB array to store multiple target URLs per domain, avoiding constraint violation while solving the "different targets" problem.

**Solution**: 
- Domain-level data (DR, traffic, SEO) shared across all targets (cost efficient)
- Target-specific data stored per URL in JSONB array
- Multiple targets per domain without database constraint issues

### Smart Detection Categories

Show popup for ALL potential duplicates with better context:

```typescript
const duplicateTypes = {
  exactMatch: [],      // Same domain, same target (likely wasteful)
  differentTarget: [], // Same domain, different target (context needed)
  alreadyOrdered: [],  // Already in a paid order (risky)
  recentlyAnalyzed: [] // Analyzed < 30 days ago (possibly wasteful)
};
```

### Detection Rules & Smart Defaults

| Scenario | Smart Default | Alternative Option |
|----------|---------------|-------------------|
| Not in order + exact match | `move_here` | `skip` |
| Not in order + different target | `move_here` (+ merge targets) | `skip` |
| In draft order + exact match | `skip` | `move_here` |
| In draft order + different target | `move_here` (+ merge targets) | `skip` |
| In paid/active order | `skip` + force confirmation | `move_here` (high risk) |

## Final Resolution Options (Simplified)

### 1. **`skip`** - Don't add this domain
- **When**: Don't want domain in new project, already in paid order, accidental duplicate
- **Action**: Domain stays in original project, new project gets nothing
- **Data**: No changes

### 2. **`move_here`** - Move domain to this project  
- **When**: Want to work with domain in new project, consolidate projects
- **Action**: 
  - Move domain from original project → new project
  - If different targets: merge into `targetPageIds` array
  - Preserve all analysis data (DR, traffic, SEO)
- **Data**: 
  ```typescript
  // Before: targetPageIds: ["/pricing"] in Project A
  // After:  targetPageIds: ["/pricing", "/features"] in Project B
  ```

## UI Examples

```
⚠️ 4 Duplicate Domains Found

Smart defaults applied (you can change any):

[✓] example.com → /pricing (Exact, not ordered) → Move Here
[✓] example.com → /features (Different target, not ordered) → Move Here + Merge Targets
[✓] domain2.com → /pricing (In draft order) → Skip  
[✗] domain3.com → /about (In paid order) → Skip [NEEDS CONFIRMATION]

□ Apply these defaults to all
```

#### Smart Information Display

Show helpful context:
- "This domain was analyzed 5 days ago with 98% data completeness"
- "This domain is already in Order #ABC123 (Paid)"
- "Same domain but targeting different page (/pricing vs /features)"

### 5. Real-World Use Cases

#### Case 1: Client Wants Same Domain Multiple Times
**Scenario**: Client says "I want example.com 5 times for different campaigns"  
**System**: Warns about duplicates  
**User**: Checks "Force add all"  
**Result**: All 5 added with `force_duplicated = true`

#### Case 2: Accidental Duplicate Paste
**Scenario**: User accidentally pastes same list twice  
**System**: "23 exact duplicates detected"  
**User**: Accepts default (skip duplicates)  
**Result**: Duplicates prevented, money saved

#### Case 3: Different Target Pages
**Scenario**: Adding example.com→/features when example.com→/pricing exists  
**System**: Allows automatically (smart default)  
**Result**: Both entries exist for different targets

### 6. API Cost Optimization

When duplicates are force-added, optimize API usage:

```typescript
if (isDuplicate && userChoice === 'keep_both') {
  // Copy existing analysis data that won't change
  newDomain.dataForSeoData = existingDomain.dataForSeoData;
  newDomain.traffic = existingDomain.traffic;
  newDomain.dr = existingDomain.dr;
  
  // Only run target-specific analysis
  if (newDomain.targetPageUrl !== existingDomain.targetPageUrl) {
    await runTargetMatching(newDomain);
  }
}
```

### 7. Implementation Steps (REVISED)

1. **Phase 1**: Update duplicate detection API to categorize by order status and target matching
2. **Phase 2**: Enhance `move_to_new` resolution to merge targets into `targetPageIds` JSONB array  
3. **Phase 3**: Fix analysis skip logic to detect target changes and stale data
4. **Phase 4**: Update DuplicateResolutionModal with simplified 2-option interface and smart defaults
5. **Phase 5**: Add bulk resolution with "Apply defaults to all" functionality  
6. **Phase 6**: Monitor usage and adjust smart defaults based on user behavior

**Estimated Effort**: 3-4 days total  
**Risk Level**: Low - works within existing database constraint  
**Key Innovation**: JSONB array for multiple targets per domain + Smart analysis re-run logic

## Critical Fix: Analysis Skip Logic 

### Current Problem:
When merging domains with `move_here`, the system incorrectly skips analysis because:
```typescript
// Current skip conditions (masterQualificationService.ts:110-167)
const hasDataForSeo = domain.hasDataForSeoResults;      // true = SKIP
const needsAI = domain.qualificationStatus === 'pending'; // not pending = SKIP  
```

### Why This is Wrong:
1. **New targets added**: Keywords from new target URLs should trigger full re-analysis
2. **Stale data**: Analysis from months ago should be refreshed 
3. **Chain dependency**: DataForSEO (with target keywords) → AI Qualification → Target Matching

### Solution - Enhanced Skip Logic:
```typescript
// Detect when re-analysis is needed
const targetHashChanged = hasTargetUrlsChanged(domain.targetPageIds, newTargetPageIds);
const analysisIsStale = Date.now() - domain.aiQualifiedAt?.getTime() > STALE_THRESHOLD;
const forceReanalysis = targetHashChanged || analysisIsStale || options.forceRefresh;

// Override skip logic when re-analysis needed
const needsDataForSeo = (!hasDataForSeo || forceReanalysis) && !options.skipDataForSeo;  
const needsAI = (qualificationStatus === 'pending' || forceReanalysis) && !options.skipAI;
const needsTargetMatch = (forceReanalysis || !domain.targetMatchedAt) && isQualified;
```

### Implementation Details:
- **Target Change Detection**: Hash `targetPageIds` array, compare with stored hash
- **Stale Threshold**: 6 months (180 days) for analysis age  
- **Force Refresh**: UI option for manual override
- **Preserve Chain**: DataForSEO → AI → Target Matching dependency maintained

### Cost Impact:
- **Before**: Free (incorrect skips)
- **After**: ~$0.20 per domain when targets change or data stale
- **Business Value**: Accurate analysis for changed requirements

### 8. Success Metrics

- Reduced support tickets about "can't add domain"
- Fewer accidental duplicate analyses (cost savings)
- Ability to handle edge cases without code changes
- Clear audit trail of why duplicates exist

### 9. Migration Considerations

- Existing duplicates (if any) will be preserved
- No data loss from removing constraint
- Can roll back by re-adding constraint if needed

### 10. Future Enhancements

- Auto-expire analysis after X days
- Bulk duplicate resolution ("Apply to all similar")
- Domain history view showing all analyses
- Cost tracking for duplicate analyses

## Decision Points

- [ ] Approve database schema changes
- [ ] Confirm default behaviors are correct
- [ ] Review UI/UX mockups
- [ ] Set duplicate detection time windows (30 days?)
- [ ] Define "strong warning" vs "soft warning" thresholds

## Notes

- This approach follows the principle of "smart defaults with escape hatches"
- No customer use case is blocked, but foot-guns are protected against
- System remains flexible for future requirements