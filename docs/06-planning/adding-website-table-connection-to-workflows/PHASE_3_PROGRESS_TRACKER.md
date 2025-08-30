# Phase 3 Progress Tracker - Update 94 Files

**Strategy**: Update files in logical batches with TypeScript checks after each batch
**Pattern**: Add website context while maintaining domain fallback

---

## ✅ BATCH 1: Topic & Research Steps (COMPLETE - 2025-08-29)
These steps directly use the domain for AI context generation.

### Files Updated:
- ✅ `components/steps/TopicGenerationStep.tsx`
- ✅ `components/steps/TopicGenerationStepClean.tsx` 
- ✅ `components/steps/TopicGenerationImproved.tsx` ⚠️ ACTIVE IN PRODUCTION
- ✅ `components/steps/KeywordResearchStep.tsx`
- ✅ `components/steps/KeywordResearchStepClean.tsx`
- ✅ `components/steps/DeepResearchStep.tsx` (no domain reference)
- ✅ `components/steps/DeepResearchStepClean.tsx` (no domain reference)

### Update Pattern:
```typescript
// Find domain selection step
const domainStep = workflow.steps.find(s => s.id === 'domain-selection');
const websiteId = domainStep?.outputs?.websiteId;
const domain = domainStep?.outputs?.domain; // fallback

// Use website name if available, domain as fallback
let guestPostSite = domain || '[Guest Post Site]';
if (websiteId && workflow.website) {
  guestPostSite = workflow.website.name || workflow.website.domain;
  // Also use website.domainRating, website.totalTraffic for context
}
```

### Testing After Batch 1:
- ✅ TypeScript check: `timeout 60 npx tsc --noEmit` - NO ERRORS
- ✅ Updated 5 files with website connection
- ✅ Website metadata (DA, traffic, quality) added to AI prompts

---

## 🎯 BATCH 2: Content Generation Steps (Priority: HIGH)
These create the actual article content.

### Files to Update:
- [ ] `components/steps/ArticleDraftStep.tsx`
- [ ] `components/steps/ArticleDraftStepClean.tsx` ⚠️ ACTIVE
- [ ] `components/steps/ContentAuditStep.tsx`
- [ ] `components/steps/ContentAuditStepClean.tsx` ⚠️ ACTIVE
- [ ] `components/steps/FinalPolishStep.tsx`
- [ ] `components/steps/FinalPolishStepClean.tsx` ⚠️ ACTIVE
- [ ] `components/steps/FormattingQAStep.tsx`
- [ ] `components/steps/FormattingQAStepClean.tsx` ⚠️ ACTIVE

### Additional Context for AI:
```typescript
// Pass website quality metrics to AI
const websiteContext = workflow.website ? {
  quality: workflow.website.overallQuality,
  authority: workflow.website.domainRating,
  audience: workflow.website.totalTraffic
} : null;
```

### Testing After Batch 2:
- [ ] TypeScript check
- [ ] Generate article with new workflow
- [ ] Verify website context enriches AI output

---

## 🎯 BATCH 3: Link & SEO Steps (Priority: MEDIUM)

### Files to Update:
- [ ] `components/steps/InternalLinksStep.tsx`
- [ ] `components/steps/ExternalLinksStep.tsx`
- [ ] `components/steps/ClientMentionStep.tsx`
- [ ] `components/steps/ClientLinkStep.tsx`
- [ ] `components/steps/LinkRequestsStep.tsx`
- [ ] `components/steps/UrlSuggestionStep.tsx`
- [ ] `components/steps/ImagesStep.tsx`
- [ ] `components/LinkOrchestrationStep.tsx`

### Testing After Batch 3:
- [ ] TypeScript check
- [ ] Test link generation with website context

---

## 🎯 BATCH 4: Publishing Steps (Priority: LOW - Deferred)

### Files to Update:
- [ ] `components/steps/EmailTemplateStep.tsx`
- [ ] `components/steps/PublisherPreApprovalStep.tsx` (⚠️ Publisher contact deferred)
- [ ] `components/steps/PublicationOutreachStep.tsx` (⚠️ Publisher contact deferred)
- [ ] `components/steps/PublicationVerificationStep.tsx`
- [ ] `components/StepForm.tsx`
- [ ] `components/steps/index.ts`

---

## 🎯 BATCH 5: Backend Services (Priority: HIGH)

### Core Workflow Services:
- [ ] `lib/services/workflowGenerationService.ts`
- [ ] `lib/services/workflowProgressService.ts`
- [ ] `lib/services/workflowEmailService.ts`
- [ ] `lib/services/taskService.ts`
- [ ] `lib/services/linkOrchestrationService.ts`

### AI Agent Services:
- [ ] `lib/services/agenticSemanticAuditService.ts`
- [ ] `lib/services/agenticSemanticAuditV2Service.ts`
- [ ] `lib/services/agenticArticleV2Service.ts`
- [ ] `lib/services/agenticFinalPolishService.ts`
- [ ] `lib/services/agenticFinalPolishV2Service.ts`
- [ ] `lib/services/chatwootSyncService.ts`

### Testing After Batch 5:
- [ ] Full build test: `timeout 600 npm run build`
- [ ] Test AI agents with website context

---

## 🎯 BATCH 6: UI/Dashboard Components (Priority: HIGH)

### Files to Update:
- [ ] `components/WorkflowList.tsx`
- [ ] `components/WorkflowListEnhanced.tsx` ⚠️ Line 673 CRITICAL
- [ ] `components/ui/AgenticOutlineGeneratorV2.tsx`
- [ ] `app/workflow/[id]/page.tsx`
- [ ] `app/workflow/[id]/overview/page.tsx`
- [ ] `app/workflow/new/page.tsx`
- [ ] `components/orders/OrderProgressSteps.tsx`
- [ ] `app/migrate-workflows-v2/page.tsx`

### Display Pattern:
```typescript
// Show website name instead of domain
{workflow.website?.name || workflow.targetDomain || 'Not selected'}

// Show website badge with DA
{workflow.website?.domainRating && (
  <span className="badge">DA {workflow.website.domainRating}</span>
)}
```

---

## 🎯 BATCH 7: API Endpoints (Priority: CRITICAL)

### Core Workflow APIs (8):
- [ ] `/api/workflows/route.ts`
- [ ] `/api/workflows/[id]/route.ts`
- [ ] `/api/workflows/[id]/step-completed/route.ts`
- [ ] `/api/workflows/[id]/progress/route.ts`
- [ ] `/api/workflows/[id]/validate/route.ts`
- [ ] `/api/workflows/[id]/verify/route.ts`
- [ ] `/api/workflows/[id]/assign/route.ts`
- [ ] `/api/workflows/resolve-target-url/route.ts`

### API Response Pattern:
```typescript
// Include website in responses
return {
  ...workflow,
  targetDomain: workflow.targetDomain, // Keep for compatibility
  website: workflow.website || null
};
```

### Testing After APIs:
- [ ] Test each endpoint with Postman
- [ ] Verify backward compatibility
- [ ] Check response includes website data

---

## 🎯 BATCH 8: Remaining APIs (29 endpoints)

### AI Generation APIs (9)
### Content Processing APIs (14)
### Link Processing APIs (2)
### Other APIs (4)

[List continues as per COMPLETE_FILE_LIST.md]

---

## 🔍 VALIDATION CHECKPOINTS

### After Each Batch:
1. **TypeScript Check**: `timeout 60 npx tsc --noEmit`
2. **Spot Test**: Test specific functionality
3. **Git Commit**: Commit working batch

### After All Batches:
1. **Full Build**: `timeout 600 npm run build`
2. **E2E Test**: Complete workflow creation
3. **Legacy Test**: Verify old workflows work
4. **Performance Test**: Check for degradation

---

## 📊 PROGRESS METRICS

| Batch | Files | Status | TypeScript | Tests |
|-------|-------|--------|------------|-------|
| Batch 1 | 7/7 | ✅ | ✅ | ✅ |
| Batch 2 | 8/8 | ⏳ | - | - |
| Batch 3 | 8/8 | - | - | - |
| Batch 4 | 6/6 | - | - | - |
| Batch 5 | 12/12 | - | - | - |
| Batch 6 | 8/8 | - | - | - |
| Batch 7 | 8/8 | - | - | - |
| Batch 8 | 37/37 | - | - | - |

**Total Progress**: 0/94 files (0%)

---

## 🚨 ROLLBACK PLAN

If issues arise:
```bash
git stash  # Save current work
git checkout HEAD~1  # Revert to last working commit
npm run build  # Verify it builds
```

---

Last Updated: 2025-08-29 | Next Review: After Batch 1