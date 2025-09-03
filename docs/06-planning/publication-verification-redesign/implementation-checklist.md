# Publication Verification Implementation Checklist
**Start Date**: ___________  
**Target Completion**: ___________  
**Developer**: ___________

## Pre-Development Setup
- [ ] Review planning document
- [ ] Set up Serper API account
- [ ] Add `SERPER_API_KEY` to `.env.local`
- [ ] Test Serper API endpoints manually
- [ ] Create feature branch: `feature/publication-verification-automation`

---

## Phase 1: Backend Services (Priority: HIGH)

### 1.1 Serper Service Integration
**File**: `lib/services/serperService.ts` (NEW)
- [ ] Create service file
- [ ] Add scraping method
  ```typescript
  async scrapeArticle(url: string): Promise<ScrapedContent>
  ```
- [ ] Add Google search method
  ```typescript
  async checkGoogleIndexed(url: string): Promise<boolean>
  ```
- [ ] Add retry logic for API failures
- [ ] Add error handling
- [ ] Add response caching (5 min TTL)

### 1.2 Publication Verification Service
**File**: `lib/services/publicationVerificationService.ts` (NEW)
- [ ] Create service file
- [ ] Define interfaces
  - [ ] `VerificationResult`
  - [ ] `AutoChecks`
  - [ ] `ManualChecks`
  - [ ] `VerificationScore`
- [ ] Implement core methods
  - [ ] `autoVerify(publishedUrl, lineItem, workflow)`
  - [ ] `extractClientLink(html, targetUrl)`
  - [ ] `verifyAnchorText(html, anchorText, targetUrl)`
  - [ ] `checkDofollow(linkHtml)`
  - [ ] `verifyDomain(publishedUrl, expectedDomain)`
  - [ ] `checkImages(html, expectedImages)`
  - [ ] `calculateScore(results)`
- [ ] Add logging for debugging
- [ ] Add metrics collection

### 1.3 Workflow-LineItem Sync Service
**File**: `lib/services/workflowLineItemSyncService.ts` (NEW)
- [ ] Create service file
- [ ] Implement sync method
  ```typescript
  async syncVerificationToLineItem(workflowId: string, verificationResult: VerificationResult)
  ```
- [ ] Update line item fields:
  - [ ] `publishedUrl`
  - [ ] `deliveredAt`
  - [ ] `status` → 'delivered'
  - [ ] `metadata.qaResults`
  - [ ] `metadata.verificationScore`
- [ ] Add transaction handling
- [ ] Add error recovery

### 1.4 API Endpoint
**File**: `app/api/workflows/[id]/verify-publication/route.ts` (NEW)
- [ ] Create route file
- [ ] Add POST handler
- [ ] Add authentication check (internal users only)
- [ ] Extract workflow and line item data
- [ ] Call verification service
- [ ] Return results
- [ ] Add rate limiting (10 requests per minute)
- [ ] Add error responses

---

## Phase 2: Frontend UI (Priority: HIGH)

### 2.1 Remove Old QA System
**File**: `components/steps/PublicationVerificationStep.tsx`
- [ ] Backup existing file
- [ ] Remove old QA checklist (lines 136-224)
- [ ] Remove `socialShareable` from initial state
- [ ] Remove old scoring display

### 2.2 Add Auto-Verification UI
**File**: `components/steps/PublicationVerificationStep.tsx`
- [ ] Add state management
  ```typescript
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  ```
- [ ] Add auto-verification button
- [ ] Add loading spinner during verification
- [ ] Add error message display
- [ ] Implement `runAutoVerification()` function
- [ ] Connect to API endpoint

### 2.3 Display Verification Results
**File**: `components/steps/PublicationVerificationStep.tsx`
- [ ] Create results display sections:
  - [ ] Critical Checks (red border)
  - [ ] Compliance Checks (yellow border)
  - [ ] Manual Checks (blue border)
- [ ] Add check item components
  - [ ] ✅ Green check for pass
  - [ ] ❌ Red X for fail
  - [ ] ⏳ Gray dash for pending
- [ ] Add score display (X/100)
- [ ] Add pass/fail status badge

### 2.4 Manual Quality Checks
**File**: `components/steps/PublicationVerificationStep.tsx`
- [ ] Add manual check section
- [ ] Add checkbox: "Formatting preserved"
- [ ] Add checkbox: "Overall quality good"
- [ ] Update score when manual checks change
- [ ] Save manual checks to step outputs

### 2.5 Completion Gate
**File**: `components/steps/PublicationVerificationStep.tsx`
- [ ] Disable "Mark as Delivered" if critical checks fail
- [ ] Show warning message if score < 60
- [ ] Add confirmation dialog
- [ ] Call order update on completion

---

## Phase 3: Order Integration (Priority: MEDIUM)

### 3.1 Step Completion Handler
**File**: `app/api/workflows/[id]/step-completed/route.ts`
- [ ] Add check for publication-verification step
- [ ] Extract verification results from step outputs
- [ ] Call sync service if step completed
- [ ] Update line item status
- [ ] Log completion event

### 3.2 Order Progress Update
**File**: `lib/services/workflowProgressService.ts`
- [ ] Add verification score to progress calculation
- [ ] Update order completion check
- [ ] Add delivered status handling
- [ ] Update order state when all items delivered

### 3.3 Line Item Status Display
**File**: `components/orders/LineItemsReviewTable.tsx`
- [ ] Add QA score column
- [ ] Add delivered status badge
- [ ] Show verification timestamp
- [ ] Add re-verify button for delivered items

---

## Phase 4: Testing & Deployment (Priority: HIGH)

### 4.1 Unit Tests
**File**: `__tests__/services/publicationVerification.test.ts` (NEW)
- [ ] Test auto-verify with mock data
- [ ] Test score calculation
- [ ] Test each verification check
- [ ] Test error handling
- [ ] Test retry logic

### 4.2 Integration Tests
**File**: `__tests__/api/verify-publication.test.ts` (NEW)
- [ ] Test API endpoint
- [ ] Test with mock Serper responses
- [ ] Test authentication
- [ ] Test rate limiting
- [ ] Test error responses

### 4.3 E2E Tests
**File**: `__tests__/e2e/publication-verification.spec.ts` (NEW)
- [ ] Test full verification flow
- [ ] Test UI interactions
- [ ] Test order updates
- [ ] Test edge cases

### 4.4 Documentation
- [ ] Update CLAUDE.md with new QA system
- [ ] Create user guide for verification
- [ ] Document API endpoints
- [ ] Add troubleshooting guide

### 4.5 Deployment
- [ ] Test on staging environment
- [ ] Verify Serper API connectivity
- [ ] Monitor first 10 verifications
- [ ] Check error logs
- [ ] Verify order updates work
- [ ] Deploy to production
- [ ] Monitor metrics for 24 hours

---

## Post-Deployment

### Monitoring & Optimization
- [ ] Track verification success rate
- [ ] Monitor API costs
- [ ] Collect user feedback
- [ ] Optimize verification accuracy
- [ ] Add caching if needed
- [ ] Fine-tune scoring weights

### Future Enhancements
- [ ] Add bulk verification for multiple URLs
- [ ] Add scheduled re-verification
- [ ] Add client notification on delivery
- [ ] Add verification history tracking
- [ ] Add manual override options
- [ ] Add more automated checks

---

## Sign-Off

### Development Complete
- Developer: __________ Date: __________
- Code Review: __________ Date: __________

### Testing Complete  
- QA Tester: __________ Date: __________
- UAT Complete: __________ Date: __________

### Deployment Complete
- DevOps: __________ Date: __________
- Product Owner: __________ Date: __________

---

## Notes
_Use this space for any implementation notes, issues encountered, or deviations from the plan:_

________________________________________________
________________________________________________
________________________________________________
________________________________________________