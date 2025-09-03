# Publication Verification & QA System Redesign
**Version**: 1.0  
**Date**: 2025-09-03  
**Status**: Planning Phase  
**Author**: System Architecture Team

## Executive Summary

This document outlines the complete redesign of the Publication Verification & QA system for the Guest Post Workflow platform. The new system will replace the existing generic 7-point checklist with an intelligent, automated verification system that validates actual delivery of promised link building services.

## Problem Statement

### Current Issues
1. **Generic QA Checklist** - Current 7 checks don't verify core deliverables (anchor text, target URL, dofollow status)
2. **No Automation** - All checks are manual, leading to human error and inefficiency
3. **Missing Critical Verifications** - No verification of:
   - Correct anchor text usage
   - Link pointing to correct client URL
   - Dofollow vs nofollow status
   - Google indexing status
4. **No Integration** - QA results don't flow back to order line items
5. **Binary Pass/Fail** - No nuanced scoring system
6. **8th Check Bug** - System shows "X/8 checks" but only displays 7 checkboxes

### Business Impact
- **Quality Issues** - Links may not deliver promised SEO value
- **Client Dissatisfaction** - Deliverables don't match promises
- **Manual Overhead** - Team spends unnecessary time on verifiable checks
- **Incomplete Orders** - No automated flow from workflow completion to order delivery

## Solution Overview

### Core Concept
A hybrid automated/manual verification system that:
1. **Auto-verifies** objective criteria using Serper API (web scraping & Google search)
2. **Manual verifies** subjective quality assessments
3. **Calculates scores** with weighted importance
4. **Updates orders** automatically when verification passes

### Key Features
- **80% Automated** - 8 of 10 checks automated via API
- **Critical Gate** - Must pass all critical checks to mark as delivered
- **Scoring System** - 100-point scale with category weights
- **Order Integration** - Auto-updates line item status and metadata
- **Real-time Feedback** - Instant verification results

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Publication Verification Flow              │
└─────────────────────────────────────────────────────────────┘

1. User Interface Layer
   ├── PublicationVerificationStep.tsx (Enhanced UI)
   ├── MissingFieldsModal.tsx (New - collects required data)
   ├── Auto-verification trigger button
   ├── Manual check inputs (2 checkboxes)
   └── Detailed breakdown display

2. Service Layer
   ├── WebScrapingService.ts (New - renamed from SerperService)
   │   ├── scrapeArticle() - Serper scraping
   │   ├── checkGoogleIndexed() - Search API
   │   └── Rate limiting (10 req/min)
   ├── PublicationVerificationService.ts (New)
   │   ├── autoVerify() - Main orchestrator with pre-check
   │   ├── extractClientMention() - Check brand+keyword
   │   └── calculateScore() - Detailed scoring
   └── WorkflowLineItemSyncService.ts (New)
       └── syncVerificationToLineItem() - Order updates

3. External APIs
   ├── Serper Scrape API (scrape.serper.dev)
   │   └── Extract HTML, check links, images
   └── Serper Search API (google.serper.dev)
       └── Check Google indexing status

4. Data Layer
   ├── Workflow Step Outputs (JSONB in content field)
   │   ├── autoVerification results
   │   ├── manualChecks object
   │   ├── verificationHistory array
   │   └── overrides object (for manual corrections)
   └── Order Line Item Updates
       ├── publishedUrl
       ├── deliveredAt
       ├── status → 'delivered'
       └── metadata.qaResults (detailed results)
```

### Data Flow

```
[Published Article URL]
         ↓
[Run Auto-Verification]
         ↓
    [Serper API]
    ├── Scrape page
    └── Check Google
         ↓
[Calculate Auto Score]
         ↓
[Manual Checks by User]
         ↓
[Calculate Total Score]
         ↓
[Critical Checks Pass?]
    ├── Yes → [Update Line Item]
    │         └── [Mark Delivered]
    └── No → [Block Completion]
```

## Verification Criteria

### Critical Checks (Must All Pass for Delivery)
| Check | Method | Description | Implementation |
|-------|--------|-------------|----------------|
| URL is live | Auto | HTTP 200 status | Serper scrape API |
| Client link present | Auto | Target URL found in HTML | Search for exact URL |
| Anchor text correct | Auto | Exact match with order | Case-sensitive match |
| Link is dofollow | Auto | No rel="nofollow" | Check link attributes |
| Correct domain | Auto | Exact or subdomain match | Normalized comparison |
| Client mention present | Auto | Brand + keyword proximity | Within same paragraph |

### Additional Checks (Informational)
| Check | Method | Description | Implementation |
|-------|--------|-------------|----------------|
| Google indexed | Auto | Page in Google index | site:url search, can be pending |
| Images included | Auto | At least one image | Check for <img> tags |
| URL matches suggestion | Auto | Matches workflow step | Compare with suggestion |

### Manual Quality Checks
| Check | Method | Description |
|-------|--------|-------------|
| Formatting preserved | Manual | Article structure maintained |
| Overall quality good | Manual | Meets quality standards |

### Scoring Rules
- **Minimum Pass**: 60/100 (all critical checks)
- **Good**: 80/100
- **Excellent**: 95/100
- **Delivery Gate**: Can only mark as delivered if score ≥ 60

## Implementation Decisions

### Phase 1 Decisions (Backend)
- **API Key**: Use provided Serper key directly (555225bf...)
- **Rate Limiting**: 10 requests/minute with "wait a minute" message
- **Service Naming**: `webScrapingService.ts` instead of SerperService
- **Missing Fields**: Show modal to collect before verification
- **Client Mention**: Check for brand + keyword in same paragraph
- **Domain Matching**: Allow exact match or subdomain (blog.example.com)
- **Google Index**: Allow "pending" status for new articles, recheck later
- **Data Storage**: Use JSONB content field in workflow steps (existing pattern)

### Phase 2 Decisions (Frontend)
- **UI Framework**: Follow existing React + TypeScript + Tailwind pattern
- **Verification Display**: Show all results at once (not progressive)
- **Results Focus**: Detailed breakdown by check, not single score
- **Manual Checks**: Just 2 checkboxes, no scoring
- **Completion**: User-controlled, no auto-complete
- **Missing Fields**: Modal popup to fill inline
- **Visual Priority**: Show failures prominently, then details

## Implementation Plan

### Phase 1: Backend Services (Week 1)
**Goal**: Create core verification logic

#### Tasks:
1. **Create Web Scraping Service Integration**
   - [ ] Add SERPER_API_KEY to environment variables
   - [ ] Create `lib/services/webScrapingService.ts` with scraping methods
   - [ ] Create `lib/services/publicationVerificationService.ts`
   - [ ] Implement `autoVerify()` method with missing fields pre-check
   - [ ] Implement `calculateScore()` method
   - [ ] Add error handling with user-friendly messages
   - [ ] Add rate limiting (10 requests/minute)

2. **Create Line Item Sync Service**
   - [ ] Create `lib/services/workflowLineItemSyncService.ts`
   - [ ] Implement `syncVerificationToLineItem()` method
   - [ ] Add status transition logic (in_progress → delivered)
   - [ ] Update metadata with QA results

3. **API Endpoints**
   - [ ] Create `/api/workflows/[id]/verify-publication` endpoint
   - [ ] Add authentication and rate limiting
   - [ ] Return verification results

**Deliverable**: Working API that can auto-verify a published URL

### Phase 2: Frontend UI (Week 1-2)
**Goal**: Replace existing QA checklist with new system

#### Tasks:
1. **Enhance Client Mention Step**
   - [ ] Add "Expected Client Mention Phrase" field to ClientMentionStep.tsx
   - [ ] Store expected phrase in step.outputs.expectedPhrase

2. **Create Missing Fields Modal**
   - [ ] Create `MissingFieldsModal.tsx` component
   - [ ] Collect required fields inline before verification
   - [ ] Save to workflow outputs before running checks

3. **Refactor PublicationVerificationStep.tsx**
   - [ ] Remove old 7-point checklist and socialShareable ghost check
   - [ ] Add "Run Verification" button
   - [ ] Show loading spinner during verification (all checks at once)
   - [ ] Display detailed breakdown of each check result
   - [ ] Critical checks section (red border, must pass)
   - [ ] Additional checks section (informational)
   - [ ] Add "Recheck Google Index" button for pending items

4. **Manual Quality Checks**
   - [ ] Add 2 manual checkboxes (formatting, overall quality)
   - [ ] Update workflow outputs on change
   - [ ] No scoring, just checkboxes

5. **Completion Section**
   - [ ] Show verification summary with check counts
   - [ ] Enable "Mark as Delivered" only if critical checks pass
   - [ ] User controls final action (no auto-complete)

**Deliverable**: New UI with detailed check breakdown and user-controlled completion

### Phase 3: Order Integration (TBD - After Phase 2 Testing)
**Goal**: Connect workflow completion to order updates

**Prerequisites**: 
- Phase 1 & 2 fully implemented
- Phase 2 tested with real workflows
- Verification system proven stable

#### Planning Questions (To Be Answered After Phase 2):
1. When should line items be updated with QA results?
2. What status transitions make sense based on actual usage?
3. How much QA detail should be stored in line items?
4. Should order completion be automatic or manual?
5. What should clients see in their portal?

#### Proposed Tasks (Subject to Change):
- [ ] Define line item update trigger points
- [ ] Implement status transition logic
- [ ] Store appropriate QA data in line items
- [ ] Handle order completion flow
- [ ] Update client-facing displays

**Note**: Detailed implementation plan will be created after Phase 2 testing reveals actual workflow patterns and requirements.

**Deliverable**: TBD based on Phase 2 outcomes

### Phase 4: Testing & Deployment (After Each Phase)
**Goal**: Ensure reliability before moving to next phase

#### After Phase 1 (Backend):
- [ ] Unit test webScrapingService with mock Serper responses
- [ ] Test publicationVerificationService logic
- [ ] Test API endpoint with Postman/curl
- [ ] Verify rate limiting works

#### After Phase 2 (Frontend):
- [ ] Test missing fields modal flow
- [ ] Test verification with real published articles
- [ ] Test edge cases (failed checks, network errors)
- [ ] Test manual overrides and rechecks
- [ ] Gather team feedback on UI/UX

#### After Phase 3 (Integration):
- [ ] Test line item updates
- [ ] Test order completion flow
- [ ] Test client portal displays
- [ ] Run full end-to-end workflow

#### Production Deployment:
- [ ] Deploy incrementally (Phase 1 → Phase 2 → Phase 3)
- [ ] Monitor Serper API usage and costs
- [ ] Track verification success rates
- [ ] Document any issues for iteration

**Deliverable**: Each phase deployed and tested before proceeding

## Success Metrics

### Quantitative
- **Automation Rate**: 80% of checks automated (8 of 10)
- **Verification Speed**: < 5 seconds for auto-verification
- **Accuracy**: 95% accuracy on automated checks
- **Completion Rate**: 90% of workflows successfully verified

### Qualitative
- **User Satisfaction**: Reduced manual effort
- **Client Trust**: Verifiable delivery proof
- **Quality Improvement**: Catch issues before delivery

## Risk Analysis

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Serper API downtime | Low | High | Implement retry logic, manual fallback |
| False positives | Medium | High | Manual review option, adjustable thresholds |
| JS-rendered pages | Medium | Medium | Use headless browser fallback |
| Rate limiting | Low | Medium | Implement caching, batch requests |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Publisher resistance | Low | Medium | Clear communication of benefits |
| Cost overruns | Low | Low | Monitor API usage, set limits |
| User adoption | Low | Low | Training, clear UI, show time savings |

## Cost Analysis

### Serper API Pricing
- **Search API**: $50 for 2,500 searches ($0.02 per search)
- **Scrape API**: $150 for 25,000 pages ($0.006 per page)

### Estimated Monthly Usage
- **Workflows**: ~500 per month
- **Verifications**: 2 per workflow (initial + re-check)
- **Total API Calls**: 1,000 searches + 1,000 scrapes
- **Monthly Cost**: $20 (searches) + $6 (scrapes) = **$26/month**

### ROI Calculation
- **Time Saved**: 5 minutes per verification × 500 = 2,500 minutes = 41 hours
- **Cost Savings**: 41 hours × $30/hour = $1,230/month
- **Net Benefit**: $1,230 - $26 = **$1,204/month saved**

## Migration Strategy

### Backward Compatibility
- Existing workflows continue to work with manual checks
- New workflows get auto-verification
- Can retroactively verify old workflows

### Data Migration
- No database schema changes required
- QA results stored in existing metadata field
- Status field already supports 'delivered' state

## Rollout Plan

### Week 1
- Deploy backend services
- Enable for internal testing
- Monitor API usage

### Week 2  
- Deploy frontend changes
- Train internal team
- Gather feedback

### Week 3
- Full production rollout
- Monitor metrics
- Iterate based on feedback

## Appendix

### A. Serper API Examples

#### Scraping Request
```javascript
const response = await fetch("https://scrape.serper.dev", {
  method: "POST",
  headers: {
    "X-API-KEY": "555225bf71d614f7a908566279b5ddf723021ad8",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "url": "https://example.com/article",
    "includeMarkdown": true
  })
});
```

#### Search Request
```javascript
const response = await fetch("https://google.serper.dev/search", {
  method: "POST",
  headers: {
    "X-API-KEY": "555225bf71d614f7a908566279b5ddf723021ad8",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "q": "site:https://example.com/article"
  })
});
```

### B. Database Fields Utilized

#### Order Line Item Fields
- `targetPageUrl` - Client's target URL
- `anchorText` - Required anchor text
- `assignedDomain` - Expected publication domain
- `publishedUrl` - Actual published URL
- `deliveredAt` - Delivery timestamp
- `status` - Order status progression
- `metadata` - JSON storage for QA results

#### Workflow Step Outputs
- `autoVerification` - Automated check results
- `manualChecks` - Manual verification inputs
- `verificationScore` - Calculated scores
- `lastVerifiedAt` - Verification timestamp

### C. Related Documentation
- [Order System Documentation](../order-system.md)
- [Workflow Progress Service](../../services/workflow-progress.md)
- [Serper API Documentation](https://serper.dev/docs)

---

**Next Steps**: 
1. Review and approve this plan
2. Create implementation tickets
3. Begin Phase 1 development