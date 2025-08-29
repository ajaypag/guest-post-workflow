# 🎯 GRANULAR IMPLEMENTATION CHECKLIST - Website Connection to Workflows

**Total Files**: 94  
**Estimated Time**: 3-4 weeks  
**Risk Level**: HIGH - Touching core workflow functionality  
**Strategy**: Incremental implementation with continuous testing & validation

---

## 📋 PRE-FLIGHT CHECKLIST

### Initial Setup & Validation
- [ ] **1.1 Establish Baseline**
  - [ ] Run `timeout 600 npm run build` - Record build time & any warnings
  - [ ] Run `npm test` - Record passing test count
  - [ ] Document current TypeScript error count (should be 0)
  - [ ] Take database backup: `pg_dump -h localhost -U postgres guest_post_order_flow > backup_$(date +%Y%m%d).sql`
  - [ ] Create new git branch: `git checkout -b website-workflow-connection`

- [ ] **1.2 Verify Current State**
  - [ ] Test create new workflow with manual domain entry
  - [ ] Test view existing workflow with domain
  - [ ] Test complete workflow end-to-end
  - [ ] Screenshot dashboard showing current domain display
  - [ ] Document current API response format for `/api/workflows/[id]`

---

## 🔧 PHASE 2: CORE WEBSITE CONNECTION (Week 1)

### STAGE 2.1: Database Migration
**Files**: 1 | **Risk**: HIGH | **Testing**: Critical

- [ ] **2.1.1 Create Migration File**
  ```sql
  -- migrations/0XXX_add_website_to_workflows.sql
  ALTER TABLE workflows 
  ADD COLUMN website_id UUID REFERENCES websites(id);
  
  -- Index for performance
  CREATE INDEX idx_workflows_website_id ON workflows(website_id);
  ```

- [ ] **2.1.2 Test Migration**
  - [ ] Apply to test database first
  - [ ] Run `npm run db:generate` to update TypeScript types
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`
  - [ ] Verify no compilation errors from schema change
  - [ ] Test rollback: `ALTER TABLE workflows DROP COLUMN website_id;`

- [ ] **2.1.3 Validate Schema**
  - [ ] Check TypeScript interfaces updated in `lib/db/schema.ts`
  - [ ] Verify `website_id` field in workflow type
  - [ ] Run query test: `SELECT * FROM workflows WHERE website_id IS NOT NULL;`
  - [ ] Confirm returns 0 rows (no data yet)

### STAGE 2.2: WebsiteSelector Component
**Files**: 1 new | **Risk**: LOW | **Testing**: Component

- [ ] **2.2.1 Create Component File**
  - [ ] Create `/components/ui/WebsiteSelector.tsx`
  - [ ] Import website types from schema
  - [ ] Implement search/filter logic
  - [ ] Add loading states

- [ ] **2.2.2 Component Features**
  ```typescript
  interface WebsiteSelectorProps {
    websites: Website[];
    value?: string;
    onChange: (website: Website) => void;
    required?: boolean;
  }
  ```
  - [ ] Search by name functionality
  - [ ] Search by domain functionality
  - [ ] Display DA, traffic, categories
  - [ ] No manual text entry (dropdown only)
  - [ ] Empty state handling

- [ ] **2.2.3 Component Testing**
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`
  - [ ] Create test file: `WebsiteSelector.test.tsx`
  - [ ] Test search with "tech" - should find TechCrunch
  - [ ] Test selection triggers onChange
  - [ ] Test empty state displays correctly
  - [ ] Test with 1000+ websites (performance)

### STAGE 2.3: API Endpoint for Websites
**Files**: 1 new | **Risk**: LOW | **Testing**: API

- [ ] **2.3.1 Create API Route**
  - [ ] Create `/app/api/websites/search/route.ts`
  - [ ] Implement search with pagination
  - [ ] Add caching for performance
  - [ ] Include website metadata in response

- [ ] **2.3.2 API Testing**
  - [ ] Test with Postman/curl
  - [ ] Verify search returns correct results
  - [ ] Test pagination works
  - [ ] Test empty search returns all
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

### STAGE 2.4: Update DomainSelectionStepClean
**Files**: 1 | **Risk**: HIGH | **Testing**: Critical

- [ ] **2.4.1 Backup Current Implementation**
  - [ ] Copy current file to `.backup` extension
  - [ ] Document current behavior

- [ ] **2.4.2 Replace Manual Input**
  ```typescript
  // OLD: <input type="text" value={domain} />
  // NEW: <WebsiteSelector websites={websites} onChange={handleWebsiteSelect} />
  ```
  - [ ] Import WebsiteSelector component
  - [ ] Fetch websites on mount
  - [ ] Update onChange handler
  - [ ] Store both `websiteId` and `domain` in outputs

- [ ] **2.4.3 Backward Compatibility**
  ```typescript
  outputs: {
    websiteId: selectedWebsite.id,  // NEW
    domain: selectedWebsite.domain,  // LEGACY SUPPORT
    websiteData: selectedWebsite     // Cache for display
  }
  ```

- [ ] **2.4.4 Testing Domain Selection**
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`
  - [ ] Create new workflow
  - [ ] Select website from dropdown
  - [ ] Verify `website_id` saved to database
  - [ ] Verify `domain` still populated
  - [ ] Check step can be marked complete
  - [ ] Test validation (required field)

### STAGE 2.5: Database Service Updates
**Files**: 2 | **Risk**: MEDIUM | **Testing**: Integration

- [ ] **2.5.1 Update workflowService.ts**
  - [ ] Add website JOIN to workflow queries
  - [ ] Include website data in responses
  - [ ] Maintain backward compatibility

- [ ] **2.5.2 Update Workflow Creation**
  ```typescript
  // When creating workflow from domain selection
  if (domainStep.outputs.websiteId) {
    workflow.website_id = domainStep.outputs.websiteId;
  }
  ```

- [ ] **2.5.3 Testing Database Operations**
  - [ ] Test workflow creation with website_id
  - [ ] Test workflow retrieval includes website data
  - [ ] Test existing workflows still work (null website_id)
  - [ ] **🔍 SCHEMA CHECK**: Verify foreign key constraint working
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

### 🔍 PHASE 2 VALIDATION CHECKPOINT
- [ ] **Full System Test**
  - [ ] Run `timeout 600 npm run build` - Should complete without errors
  - [ ] Run `npm test` - All tests should pass
  - [ ] Create 5 new workflows with website selector
  - [ ] Verify all 5 have website_id in database
  - [ ] Test 5 legacy workflows still display correctly
  - [ ] No console errors in browser
  - [ ] No 500 errors in server logs

---

## 📦 PHASE 3: UPDATE ALL DEPENDENCIES (Week 2-3)

### STAGE 3.1: Update Workflow Step Components (30 files)
**Risk**: HIGH | **Testing**: Each component

#### Batch 1: Topic & Research Steps (10 files)
- [ ] **3.1.1 Update Topic Generation Steps**
  - [ ] `TopicGenerationStep.tsx`
  - [ ] `TopicGenerationStepClean.tsx`
  - [ ] `TopicGenerationImproved.tsx`
  - [ ] Apply pattern:
    ```typescript
    const websiteId = domainStep?.outputs?.websiteId;
    const domain = domainStep?.outputs?.domain; // fallback
    let guestPostSite = domain || '[Guest Post Site]';
    if (websiteId && workflow.website) {
      guestPostSite = workflow.website.name || workflow.website.domain;
    }
    ```
  - [ ] **🔍 TYPESCRIPT CHECK**: After each file

- [ ] **3.1.2 Update Research Steps**
  - [ ] `KeywordResearchStep.tsx`
  - [ ] `KeywordResearchStepClean.tsx`
  - [ ] `DeepResearchStep.tsx`
  - [ ] `DeepResearchStepClean.tsx`
  - [ ] Test each step displays website name
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

- [ ] **3.1.3 Testing Batch 1**
  - [ ] Create workflow, complete through research
  - [ ] Verify website name displays in each step
  - [ ] Test with legacy workflow (domain only)
  - [ ] Check AI prompts include website context

#### Batch 2: Content Generation Steps (10 files)
- [ ] **3.1.4 Update Draft & Audit Steps**
  - [ ] `ArticleDraftStep.tsx`
  - [ ] `ArticleDraftStepClean.tsx`
  - [ ] `ContentAuditStep.tsx`
  - [ ] `ContentAuditStepClean.tsx`
  - [ ] Each needs website context for AI
  - [ ] **🔍 TYPESCRIPT CHECK**: After every 2 files

- [ ] **3.1.5 Update Polish & QA Steps**
  - [ ] `FinalPolishStep.tsx`
  - [ ] `FinalPolishStepClean.tsx`
  - [ ] `FormattingQAStep.tsx`
  - [ ] `FormattingQAStepClean.tsx`
  - [ ] Verify AI agents get website metadata
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

- [ ] **3.1.6 Testing Batch 2**
  - [ ] Generate article with new workflow
  - [ ] Verify website context in AI responses
  - [ ] Test auto-save still works
  - [ ] Monitor for race conditions

#### Batch 3: Link & Publishing Steps (10 files)
- [ ] **3.1.7 Update Link Steps**
  - [ ] `InternalLinksStep.tsx`
  - [ ] `ExternalLinksStep.tsx`
  - [ ] `ClientMentionStep.tsx`
  - [ ] `ClientLinkStep.tsx`
  - [ ] `LinkRequestsStep.tsx`
  - [ ] `LinkOrchestrationStep.tsx`
  - [ ] **🔍 TYPESCRIPT CHECK**: Every 3 files

- [ ] **3.1.8 Update Publishing Steps**
  - [ ] `PublisherPreApprovalStep.tsx`
  - [ ] `PublicationOutreachStep.tsx`
  - [ ] `PublicationVerificationStep.tsx`
  - [ ] `EmailTemplateStep.tsx`
  - [ ] Note: Publisher contact deferred for Phase 5
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

- [ ] **3.1.9 Testing Batch 3**
  - [ ] Complete full workflow end-to-end
  - [ ] Verify all steps show website correctly
  - [ ] Test email templates include website name
  - [ ] Check link orchestration works

### STAGE 3.2: Update Backend Services (12 files)
**Risk**: HIGH | **Testing**: Service integration

#### Core Services (5 files)
- [ ] **3.2.1 Workflow Services**
  - [ ] `workflowGenerationService.ts`
    - [ ] Include website in generation context
    - [ ] Test workflow auto-generation
  - [ ] `workflowProgressService.ts`
    - [ ] Update progress tracking
    - [ ] Test progress calculations
  - [ ] `workflowEmailService.ts`
    - [ ] Include website in emails
    - [ ] Test email generation
  - [ ] **🔍 TYPESCRIPT CHECK**: After each service

- [ ] **3.2.2 Task & Link Services**
  - [ ] `taskService.ts`
    - [ ] Update task creation with website context
  - [ ] `linkOrchestrationService.ts`
    - [ ] Include website in orchestration
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

#### AI Agent Services (7 files)
- [ ] **3.2.3 Semantic Audit Services**
  - [ ] `agenticSemanticAuditService.ts`
  - [ ] `agenticSemanticAuditV2Service.ts`
  - [ ] Add website context to prompts
  - [ ] Test AI uses website metadata
  - [ ] **🔍 TYPESCRIPT CHECK**: After each

- [ ] **3.2.4 Article & Polish Services**
  - [ ] `agenticArticleV2Service.ts`
  - [ ] `agenticFinalPolishService.ts`
  - [ ] `agenticFinalPolishV2Service.ts`
  - [ ] Verify website enriches AI context
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

- [ ] **3.2.5 Testing AI Services**
  - [ ] Generate content with each service
  - [ ] Verify website context improves output
  - [ ] Check for memory/performance issues
  - [ ] Test error handling

### STAGE 3.3: Update UI Components (8 files)
**Risk**: MEDIUM | **Testing**: Visual & functional

- [ ] **3.3.1 Workflow List Components**
  - [ ] `WorkflowList.tsx`
    - [ ] Show website name not domain
  - [ ] `WorkflowListEnhanced.tsx` (Line 673)
    - [ ] Critical dashboard display
    - [ ] Add website badges
  - [ ] **🔍 TYPESCRIPT CHECK**: After each

- [ ] **3.3.2 Workflow Pages**
  - [ ] `app/workflow/[id]/page.tsx`
  - [ ] `app/workflow/[id]/overview/page.tsx`
  - [ ] `app/workflow/new/page.tsx`
  - [ ] Display website metadata
  - [ ] **🔍 TYPESCRIPT CHECK**: `timeout 60 npx tsc --noEmit`

- [ ] **3.3.3 UI Testing**
  - [ ] Visual regression testing
  - [ ] Check responsive design
  - [ ] Test with 100+ workflows
  - [ ] Verify search/filter works

### STAGE 3.4: Update API Endpoints (37 files)
**Risk**: HIGH | **Testing**: API contracts

#### Core Workflow APIs (8 endpoints)
- [ ] **3.4.1 Main Workflow APIs**
  - [ ] `/api/workflows/route.ts`
    - [ ] Include website in list response
  - [ ] `/api/workflows/[id]/route.ts`
    - [ ] JOIN website data
    - [ ] Keep targetDomain for compatibility
  - [ ] `/api/workflows/[id]/step-completed/route.ts`
    - [ ] Handle website_id in step data
  - [ ] **🔍 API CONTRACT TEST**: Postman collection

#### AI Generation APIs (9 endpoints)
- [ ] **3.4.2 Outline Generation APIs**
  - [ ] `/api/workflows/[id]/outline-generation/start/route.ts`
  - [ ] `/api/workflows/[id]/outline-generation/start-v2/route.ts`
  - [ ] Pass website context to AI
  - [ ] **🔍 TYPESCRIPT CHECK**: Every 3 endpoints

#### Content Processing APIs (14 endpoints)
- [ ] **3.4.3 Semantic & Polish APIs**
  - [ ] Update all 14 content APIs
  - [ ] Include website in AI context
  - [ ] Test each endpoint
  - [ ] **🔍 LOAD TEST**: 50 concurrent requests

### STAGE 3.5: Database & Utilities (7 files)
**Risk**: HIGH | **Testing**: Core functionality

- [ ] **3.5.1 Core Files**
  - [ ] `lib/db/schema.ts`
    - [ ] Ensure types aligned
  - [ ] `types/workflow.ts`
    - [ ] Add website types
  - [ ] `lib/utils/workflowUtils.ts`
    - [ ] Update utilities
  - [ ] **🔍 TYPESCRIPT CHECK**: Critical after schema

- [ ] **3.5.2 Testing Utilities**
  - [ ] Unit tests for each utility
  - [ ] Integration tests
  - [ ] Performance benchmarks

---

## 🔍 PHASE 3 VALIDATION CHECKPOINT

### Comprehensive Testing Suite
- [ ] **3.6.1 Backward Compatibility Tests**
  - [ ] Test 20 random existing workflows
  - [ ] All should display with domain fallback
  - [ ] No data corruption
  - [ ] No UI breaks

- [ ] **3.6.2 New Functionality Tests**
  - [ ] Create 10 new workflows with website selector
  - [ ] Complete each through different stages
  - [ ] Verify website data throughout

- [ ] **3.6.3 Performance Tests**
  - [ ] Dashboard load time < 2 seconds
  - [ ] No N+1 query problems
  - [ ] Memory usage stable

- [ ] **3.6.4 Final Validation**
  - [ ] **🔍 FULL BUILD**: `timeout 600 npm run build`
  - [ ] **🔍 FULL TEST SUITE**: `npm test`
  - [ ] **🔍 TYPESCRIPT**: Zero errors
  - [ ] **🔍 E2E TEST**: Complete workflow creation

---

## 📊 ROLLOUT PLAN

### STAGE 4.1: Staging Deployment
- [ ] **4.1.1 Deploy to Staging**
  - [ ] Run migration on staging DB
  - [ ] Deploy code to staging
  - [ ] Full regression test

- [ ] **4.1.2 Staging Validation**
  - [ ] 24 hour monitoring
  - [ ] Check error rates
  - [ ] Performance metrics

### STAGE 4.2: Production Rollout
- [ ] **4.2.1 Canary Deployment**
  - [ ] 10% traffic for 24 hours
  - [ ] Monitor closely
  - [ ] Rollback plan ready

- [ ] **4.2.2 Full Deployment**
  - [ ] 100% traffic
  - [ ] Monitor for 48 hours
  - [ ] Document any issues

---

## 🚨 ROLLBACK PROCEDURES

### Emergency Rollback
```bash
# Code rollback
git revert <commit-hash>
git push origin main
npm run build && npm run deploy

# Database rollback
ALTER TABLE workflows DROP COLUMN website_id;
DROP INDEX idx_workflows_website_id;

# Clear cache
redis-cli FLUSHDB
```

---

## ✅ SUCCESS METRICS

### Must Pass All:
- [ ] 100% backward compatibility
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] < 5% performance degradation
- [ ] Zero data corruption
- [ ] Error rate < 0.1%
- [ ] All 94 files updated
- [ ] Full E2E workflow completion

---

## 📝 NOTES

**Frequency of Checks**:
- TypeScript: After EVERY file change
- Schema: After ANY database change  
- Build: After each major stage
- Tests: After each component batch

**Risk Mitigation**:
- Always backup before changes
- Test on staging first
- Have rollback ready
- Monitor continuously

**Time Estimates**:
- Phase 2: 5-7 days
- Phase 3: 10-14 days
- Testing: 3-5 days
- Total: 3-4 weeks

---

**This checklist contains 200+ individual tasks with integrated testing at every stage**