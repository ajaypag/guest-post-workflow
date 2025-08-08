# Step Component Pattern

> **Why**: Technical debt created two versions of each component  
> **Use when**: Editing any step component  
> **Outcome**: Edit the right file, avoid wasted time

## The Problem

Two versions exist for historical reasons:
- `ArticleDraftStep.tsx` - ❌ DEPRECATED
- `ArticleDraftStepClean.tsx` - ✅ ACTIVE

## Finding the Active Version

### 1. Check StepForm.tsx
```typescript
// components/StepForm.tsx line ~40-57
const stepForms = {
  'article-draft': ArticleDraftStepClean,     // ← This one!
  'content-audit': ContentAuditStepClean,     // ← This one!
  'final-polish': FinalPolishStepClean,       // ← This one!
  // ... more mappings
};
```

### 2. Quick Check Command
```bash
grep -n "ComponentName" components/StepForm.tsx
```

## Verification Process

Before editing any step component:

1. **Find imports**: `grep -r "ComponentName" --include="*.tsx"`
2. **Check StepForm.tsx** mapping
3. **Look for duplicates** with/without "Clean"
4. **Edit only imported version**
5. **Test changes appear** in UI

## Current Active Components

| Step | Active File | Deprecated |
|------|------------|------------|
| Article Draft | `ArticleDraftStepClean.tsx` | `ArticleDraftStep.tsx` |
| Content Audit | `ContentAuditStepClean.tsx` | `ContentAuditStep.tsx` |
| Final Polish | `FinalPolishStepClean.tsx` | `FinalPolishStep.tsx` |
| Semantic Audit | `SemanticAuditStepClean.tsx` | `SemanticAuditStep.tsx` |

## Common Mistakes

### ❌ Editing deprecated file
```bash
# You edit ArticleDraftStep.tsx
# Changes don't appear
# Hours of confusion
```

### ✅ Correct approach
```bash
# Check StepForm.tsx first
# Edit ArticleDraftStepClean.tsx
# Changes work immediately
```

## Future Cleanup

Eventually:
1. Delete all deprecated files
2. Rename Clean files to remove "Clean"
3. Update all imports
4. Document in migration guide

For now: **Always check StepForm.tsx first!**