# COMPLETE List of Files Requiring Updates - 94 Total

**Date**: 2025-08-29  
**Finding**: 94 files reference workflow domains (not 44 as initially thought)

## 1. WORKFLOW STEP COMPONENTS (30 files)

### Domain Selection Steps (2):
- `components/steps/DomainSelectionStep.tsx`
- `components/steps/DomainSelectionStepClean.tsx` ← PRIMARY

### Steps That Read Domain (28):
- `components/steps/KeywordResearchStep.tsx`
- `components/steps/KeywordResearchStepClean.tsx`
- `components/steps/TopicGenerationStep.tsx`
- `components/steps/TopicGenerationStepClean.tsx`
- `components/steps/TopicGenerationImproved.tsx`
- `components/steps/DeepResearchStep.tsx`
- `components/steps/DeepResearchStepClean.tsx`
- `components/steps/ArticleDraftStep.tsx`
- `components/steps/ArticleDraftStepClean.tsx`
- `components/steps/ContentAuditStep.tsx`
- `components/steps/ContentAuditStepClean.tsx`
- `components/steps/FinalPolishStep.tsx`
- `components/steps/FinalPolishStepClean.tsx`
- `components/steps/FormattingQAStep.tsx`
- `components/steps/FormattingQAStepClean.tsx`
- `components/steps/InternalLinksStep.tsx`
- `components/steps/ExternalLinksStep.tsx`
- `components/steps/ClientMentionStep.tsx`
- `components/steps/ClientLinkStep.tsx`
- `components/steps/ImagesStep.tsx`
- `components/steps/LinkRequestsStep.tsx`
- `components/steps/UrlSuggestionStep.tsx`
- `components/steps/EmailTemplateStep.tsx`
- `components/steps/PublisherPreApprovalStep.tsx`
- `components/steps/PublicationOutreachStep.tsx`
- `components/steps/PublicationVerificationStep.tsx`
- `components/StepForm.tsx`
- `components/steps/index.ts`
- `components/LinkOrchestrationStep.tsx`

## 2. BACKEND SERVICES (12 files)

### Workflow Services (5):
- `lib/services/workflowGenerationService.ts`
- `lib/services/workflowProgressService.ts`
- `lib/services/workflowEmailService.ts`
- `lib/services/taskService.ts`
- `lib/services/linkOrchestrationService.ts`

### AI Agent Services (7):
- `lib/services/agenticSemanticAuditService.ts`
- `lib/services/agenticSemanticAuditV2Service.ts`
- `lib/services/agenticArticleV2Service.ts`
- `lib/services/agenticFinalPolishService.ts`
- `lib/services/agenticFinalPolishV2Service.ts`
- `lib/services/chatwootSyncService.ts`
- Additional AI services that process domains

## 3. UI/DASHBOARD COMPONENTS (8 files)

### Workflow Display:
- `components/WorkflowList.tsx`
- `components/WorkflowListEnhanced.tsx` ← Line 673 critical
- `components/ui/AgenticOutlineGeneratorV2.tsx`
- `app/workflow/[id]/page.tsx`
- `app/workflow/[id]/overview/page.tsx`
- `app/workflow/new/page.tsx`

### Order Integration:
- `components/orders/OrderProgressSteps.tsx`
- `app/migrate-workflows-v2/page.tsx`

## 4. API ENDPOINTS (37 files)

### Core Workflow APIs (8):
- `app/api/workflows/route.ts`
- `app/api/workflows/[id]/route.ts`
- `app/api/workflows/[id]/step-completed/route.ts`
- `app/api/workflows/[id]/progress/route.ts`
- `app/api/workflows/[id]/validate/route.ts`
- `app/api/workflows/[id]/verify/route.ts`
- `app/api/workflows/[id]/assign/route.ts`
- `app/api/workflows/resolve-target-url/route.ts`

### AI Generation APIs (9):
- `app/api/workflows/[id]/auto-generate-v2/route.ts`
- `app/api/workflows/[id]/auto-generate-v2/stream/route.ts`
- `app/api/workflows/[id]/outline-generation/start/route.ts`
- `app/api/workflows/[id]/outline-generation/start-v2/route.ts`
- `app/api/workflows/[id]/outline-generation/stream/route.ts`
- `app/api/workflows/[id]/outline-generation/continue/route.ts`
- `app/api/workflows/[id]/outline-generation/cancel/route.ts`
- `app/api/workflows/[id]/outline-generation/status/route.ts`
- `app/api/workflows/[id]/outline-generation/latest/route.ts`

### Content Processing APIs (14):
- `app/api/workflows/[id]/semantic-audit/route.ts`
- `app/api/workflows/[id]/semantic-audit/stream/route.ts`
- `app/api/workflows/[id]/semantic-audit-v2/route.ts`
- `app/api/workflows/[id]/semantic-audit-v2/stream/route.ts`
- `app/api/workflows/[id]/final-polish/start/route.ts`
- `app/api/workflows/[id]/final-polish/stream/route.ts`
- `app/api/workflows/[id]/final-polish/[sessionId]/route.ts`
- `app/api/workflows/[id]/final-polish-v2/start/route.ts`
- `app/api/workflows/[id]/final-polish-v2/stream/route.ts`
- `app/api/workflows/[id]/formatting-qa/start/route.ts`
- `app/api/workflows/[id]/formatting-qa/stream/route.ts`
- `app/api/workflows/[id]/formatting-qa/latest/route.ts`
- `app/api/workflows/[id]/formatting-qa/[sessionId]/route.ts`
- `app/api/workflows/[id]/seo-audit/route.ts`
- `app/api/workflows/[id]/seo-audit/stream/route.ts`

### Link Processing APIs (2):
- `app/api/workflows/[id]/orchestrate-links/route.ts`
- `app/api/workflows/[id]/analyze-target-urls/route.ts`

### Other APIs (4):
- `app/api/workflows/[id]/restore-original-steps/route.ts`
- `app/api/workflows/[id]/polish-v2/cancel/route.ts`
- `app/api/database-checker/route.ts`
- `app/api/admin/bulk-analysis-debug/route.ts`

## 5. DATABASE & UTILITIES (7 files)

- `lib/db/workflowService.ts`
- `lib/db/schema.ts`
- `types/workflow.ts`
- `lib/utils/workflowUtils.ts`
- `lib/utils/workflowClientUtils.ts`
- `lib/workflow-templates-v2.ts`
- `lib/services/chatwootSyncService.ts`

## 6. ADMIN & DEBUG (3 files)

- `app/admin/link-orchestration-diagnostics/page.tsx`
- `verify-step-snapshot.ts`
- `verify-workflow-snapshots.ts`

---

## UPDATE PATTERN FOR ALL FILES

### For Step Components:
```typescript
// OLD
const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
const guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';

// NEW
const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
const websiteId = domainSelectionStep?.outputs?.websiteId;
const domain = domainSelectionStep?.outputs?.domain;

let guestPostSite = domain || '[Guest Post Site]';
if (websiteId) {
  const website = await getWebsite(websiteId);
  guestPostSite = website.name || website.domain;
}
```

### For APIs:
```typescript
// Add website data to responses
{
  ...workflow,
  targetDomain: workflow.targetDomain, // Keep for compatibility
  website: workflow.website_id ? await getWebsite(workflow.website_id) : null
}
```

### For UI Components:
```typescript
// Display website name instead of domain
{workflow.website?.name || workflow.targetDomain || 'Not selected'}
```

---

## IMPACT SUMMARY

**94 Total Files** requiring updates:
- 30 step components
- 12 backend services
- 8 UI components
- 37 API endpoints
- 7 database/utility files

This is **2.1x larger** than the initial 44 file estimate!