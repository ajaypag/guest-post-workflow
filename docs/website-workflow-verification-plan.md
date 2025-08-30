# Website-Workflow Connection Verification Plan

## Status: Phase 3 - Verification & Testing
**Date**: 2025-08-30

## Completed Work
✅ Phase 1: Planning & Analysis
✅ Phase 2: Core Implementation
- Created WebsiteSelector component
- Added website_id to workflows table
- Updated DomainSelectionStepClean
- Modified workflowService to include website JOINs

✅ Phase 3: Step Updates (Partial)
- Updated Topic Generation steps
- Updated Research steps  
- Updated Link/SEO steps
- Reverted unnecessary metadata additions

## Verification Phase Tasks

### 1. Step Component Verification
Check that all workflow step components:
- [ ] Use `workflow.website.domain` when website is connected
- [ ] Fall back to `domainSelectionStep?.outputs?.domain` for legacy workflows
- [ ] Do NOT include metadata (DA, traffic, quality) in prompts
- [ ] Handle both new (website-connected) and old (text domain) workflows

### 2. Files to Verify
Priority files that handle domain/website references:
- `components/steps/*Clean.tsx` files (all Clean versions)
- `components/steps/TopicGenerationImproved.tsx`
- `components/steps/TopicGenerationStep.tsx`
- `components/steps/KeywordResearchStep.tsx`
- `components/steps/UrlSuggestionStep.tsx`
- `components/LinkOrchestrationStep.tsx`
- `components/steps/InternalLinksStep.tsx`
- `components/steps/LinkRequestsStep.tsx`

### 3. Verification Checklist
- [ ] No `websiteMetadata` variables remain
- [ ] No metadata injection in prompts
- [ ] Consistent pattern: check websiteId → use workflow.website.domain
- [ ] TypeScript compilation passes
- [ ] Build completes successfully

### 4. Testing Phase
After verification:
- [ ] Create new workflow with website selector
- [ ] Edit existing text-domain workflow
- [ ] Verify domain displays correctly in all steps
- [ ] Test auto-save functionality
- [ ] Check workflow validation

### 5. API & Backend Updates
Check and update if needed:
- [ ] `/api/workflows/create`
- [ ] `/api/workflows/[id]/update`
- [ ] Order-to-workflow generation
- [ ] Bulk analysis workflow creation

### 6. Cleanup Tasks
- [ ] Remove temporary scripts from `/scripts/`
- [ ] Update CLAUDE.md with final status
- [ ] Document any discovered issues
- [ ] Create migration guide if needed

## Success Criteria
- All workflow steps use website connection properly
- No metadata leaks into prompts
- Backward compatibility maintained
- TypeScript/build passes
- New and old workflows both function correctly