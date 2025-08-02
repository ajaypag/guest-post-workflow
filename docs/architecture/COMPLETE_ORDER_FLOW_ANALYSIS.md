# Complete Order Flow Analysis - External vs Internal Users

**Created**: August 2, 2025  
**Status**: Current (based on live codebase analysis)

## Scenario: New Account User Orders Guest Posts for 2 Clients (3 Links Each)

This document provides a granular, step-by-step analysis of the order flow from both external (account) and internal user perspectives, including handoff points, system actions, and page interactions.

---

## PHASE 1: EXTERNAL USER (ACCOUNT) WORKFLOW

### Step 1: Order Creation
**Page**: `/orders/new`  
**User**: External Account User  
**Status**: N/A (pre-order)  

**Actions Performed**:
1. **Left Column - Select Brands**: 
   - Checks 2 clients from their client list
   - Sets link count: Client A = 3 links, Client B = 3 links
   - Can create new clients if needed via "+" button

2. **Middle Column - Target Pages**:
   - Views target pages from selected clients
   - Can add custom target pages via "+" button
   - Sees DR/traffic estimates for each page

3. **Right Column - Order Configuration**:
   - Creates 6 line items total (3 per client)
   - For each line item:
     - Selects target page URL from dropdown
     - Enters anchor text (optional at this stage)
     - Selects package: Good ($230), Better ($279), or Best ($349)
   - Reviews total cost: 6 × $279 = $1,674 (if all "Better" package)

4. **Order Submission**:
   - Clicks "Continue to Site Selection" button
   - System validates: all line items have clients and target pages
   - Calls `handleSubmit()` function

**API Call**: `POST /api/orders/drafts`
```json
{
  "orderData": {
    "accountId": "user-id",
    "accountEmail": "user@company.com", 
    "accountName": "John Doe",
    "accountCompany": "",
    "orderType": "guest_post",
    "orderGroups": [
      {
        "clientId": "client-a-id",
        "linkCount": 3,
        "targetPages": [
          {"pageId": "page-1-id", "url": "https://clienta.com/page1"},
          {"pageId": "page-2-id", "url": "https://clienta.com/page2"},
          {"pageId": "page-3-id", "url": "https://clienta.com/page3"}
        ],
        "anchorTexts": ["anchor1", "anchor2", "anchor3"]
      },
      {
        "clientId": "client-b-id", 
        "linkCount": 3,
        "targetPages": [
          {"pageId": "page-4-id", "url": "https://clientb.com/page1"},
          {"pageId": "page-5-id", "url": "https://clientb.com/page2"},
          {"pageId": "page-6-id", "url": "https://clientb.com/page3"}
        ],
        "anchorTexts": ["anchor4", "anchor5", "anchor6"]
      }
    ]
  }
}
```

**System Actions**:
- Creates order record with status: `draft`
- Creates 2 order groups (one per client)
- Creates 6 guest post items (line items)
- Redirects to: `/account/orders/{orderId}/confirm`

### Step 2: Order Confirmation & Review
**Page**: `/account/orders/[id]/confirm`  
**User**: External Account User  
**Status**: `draft`

**Actions Performed**:
1. **Review Order Details**:
   - Views order summary with all line items
   - Sees total cost breakdown
   - Reviews client information and target pages
   - Can see target page details

2. **Confirm Order**:
   - Clicks "Confirm Order" button
   - Confirms they want to proceed

**API Call**: `POST /api/orders/{orderId}/submit`

**System Actions**:
- Updates order status: `draft` → `pending_confirmation`
- Updates order state: → `awaiting_review`
- Triggers notification to internal team (TODO in code)
- Redirects to: `/account/orders/{orderId}/status`

### Step 3: Order Status Monitoring  
**Page**: `/account/orders/[id]/status`  
**User**: External Account User  
**Status**: `pending_confirmation`

**Actions Performed**:
1. **View Order Progress**:
   - Sees progress steps: Order Confirmed → Finding Sites → Review Sites → Creating Content → Completed
   - Current step: "Order Confirmed" 
   - Status: "Awaiting Confirmation"
   - Auto-refreshes every 30 seconds

2. **Wait for Internal Processing**: 
   - User can only monitor; no actions available
   - Receives notifications when status changes (future feature)

---

## HANDOFF POINT 1: EXTERNAL → INTERNAL
**Trigger**: Order submitted by external user  
**Status Change**: `draft` → `pending_confirmation`  
**Notification**: Internal team notified of new order (TODO)  
**Next Action**: Internal user must confirm order

---

## PHASE 2: INTERNAL USER WORKFLOW

### Step 4: Order Confirmation (Internal)
**Page**: `/orders/[id]/confirm`  
**User**: Internal User  
**Status**: `pending_confirmation`

**Actions Performed**:
1. **Review Order Details**:
   - Sees complete order breakdown
   - Reviews client requirements and target pages
   - Checks if target pages have keywords/descriptions

2. **Generate Missing Keywords** (if needed):
   - For target pages without keywords:
     - Clicks "Generate Keywords" for individual pages
     - System calls OpenAI to generate keywords for target page URL
     - Updates target page with generated keywords

3. **Assign Order**:
   - Selects internal user from dropdown to assign bulk analysis
   - Uses UserSelector component

4. **Confirm Order**:
   - Clicks "Confirm Order" button
   - Confirms bulk analysis project creation

**API Call**: `POST /api/orders/{orderId}/confirm`
```json
{
  "assignedTo": "internal-user-id"
}
```

**System Actions**:
- Updates order status: `pending_confirmation` → `confirmed`
- Updates order state: `awaiting_review` → `analyzing`  
- For each order group:
  - Creates bulk analysis project with name: "Order #{orderId} - {clientName}"
  - Generates keywords for target pages without them
  - Links order group to bulk analysis project via `bulkAnalysisProjectId`
- Assigns bulk analysis projects to specified internal user
- Redirects to: `/orders/{orderId}/detail`

### Step 5: Bulk Analysis & Site Selection
**Page**: `/clients/[clientId]/bulk-analysis/projects/[projectId]`  
**User**: Internal User (assigned)  
**Status**: `confirmed`, State: `analyzing`

**Actions Performed**:
1. **Domain Research**:
   - Uses AI research agents to find qualifying domains
   - Processes DataForSEO results
   - Filters domains by DR, traffic, niche relevance

2. **Domain Qualification**:
   - Reviews each domain manually or with AI assistance
   - Sets qualification status: qualified/rejected/pending
   - Adds notes about domain suitability

3. **Site Selection**:
   - Selects qualifying domains for the order
   - Ensures enough domains to fulfill link requirements (6 total)
   - May select 8-10 domains to give client choices

4. **Submit Sites for Review**:
   - Clicks "Add to Order" → selects associated order
   - Confirms domain selection
   - Moves domains to order site submissions

**API Calls**:
- `POST /api/orders/{orderId}/site-submissions` - Submit selected domains
- Various bulk analysis APIs for domain research

**System Actions**:
- Creates `orderSiteSubmissions` records for each selected domain
- Links domains to order groups
- Updates order status: `confirmed` → `sites_ready`
- Updates order state: `analyzing` → `site_review`

---

## HANDOFF POINT 2: INTERNAL → EXTERNAL
**Trigger**: Internal user submits site selections  
**Status Change**: `confirmed` → `sites_ready`  
**Notification**: External user notified sites are ready for review  
**Next Action**: External user reviews and approves sites

---

## PHASE 3: EXTERNAL USER SITE REVIEW

### Step 6: Site Review & Approval
**Page**: `/account/orders/[id]/sites`  
**User**: External Account User  
**Status**: `sites_ready`

**Actions Performed**:
1. **Review Suggested Sites**:
   - Views 3 tabs: "Pending Review", "All Suggestions", "Approved"
   - Sees domain metrics: DR, traffic, niche
   - Can filter and search domains

2. **For Each Domain**:
   - **Approve**: Clicks approve button
   - **Reject**: Clicks reject button, enters rejection reason
   - **Special Instructions**: Adds notes for approved domains

3. **Bulk Actions**:
   - Can approve/reject multiple domains at once
   - Must approve exactly 6 domains (3 per client) 

4. **Submit Review**:
   - Once required number approved, submits review
   - Confirms final site selection

**API Calls**:
- `POST /api/orders/{orderId}/site-submissions/{submissionId}/review`
```json
{
  "status": "client_approved|client_rejected",
  "clientReviewNotes": "Rejection reason or special instructions",
  "specialInstructions": "Any special requirements"
}
```

**System Actions**:
- Updates `orderSiteSubmissions` with client review status
- When all required sites approved:
  - Updates order status: `sites_ready` → `client_reviewing` → `client_approved`
  - Updates order state: `site_review` → `payment_pending`

### Step 7: Payment Processing
**Page**: `/account/orders/[id]/status`  
**User**: External Account User  
**Status**: `client_approved`

**Actions Performed**:
1. **View Invoice** (Manual Process):
   - Internal team generates invoice manually
   - External user receives invoice via email
   - External user pays invoice through external payment system

2. **Monitor Payment Status**:
   - Order status page shows "Ready for Payment"
   - User waits for internal team to confirm payment

**Manual Process**: Payment confirmation is currently manual

**System Actions** (when payment confirmed by internal):
- Internal user updates order status: `client_approved` → `invoiced` → `paid`
- Updates order state: `payment_pending` → `in_progress`

---

## HANDOFF POINT 3: EXTERNAL → INTERNAL
**Trigger**: Payment received and confirmed  
**Status Change**: `client_approved` → `paid`  
**Side Effect**: Workflow creation triggered  
**Next Action**: Internal team begins content creation

---

## PHASE 4: WORKFLOW EXECUTION

### Step 8: Workflow Creation (Automated)
**Trigger**: Order status becomes `paid`  
**User**: System Automated  
**Status**: `paid`, State: `in_progress`

**System Actions**:
- `OrderService.createWorkflowsForOrder()` called automatically
- Creates 6 workflows (one per approved domain)
- Each workflow includes:
  - Client information and target page
  - Domain and site details  
  - Article requirements and guidelines
  - Anchor text and linking instructions

### Step 9: Content Creation & Publishing
**Page**: Various workflow pages  
**User**: Internal Content Team  
**Status**: `paid`, State: `in_progress`

**Actions Performed**:
1. **Content Creation**:
   - Use workflow system to create articles
   - Follow client guidelines and requirements
   - Include specified anchor text and links

2. **Article Publishing**:
   - Coordinate with site owners
   - Publish articles with backlinks
   - Update workflow with published URL

3. **Track Completion**:
   - Mark workflows as completed
   - Update `guestPostItems` with `publishedUrl`
   - Verify publication

**System Actions**:
- Updates workflow status throughout process
- Records published URLs in order items
- When all 6 links completed:
  - Updates order status: `paid` → `in_progress` → `completed`
  - Updates order state: `in_progress` → `completed`

---

## FINAL HANDOFF: INTERNAL → EXTERNAL
**Trigger**: All workflows completed and links published  
**Status Change**: `in_progress` → `completed`  
**Notification**: External user notified of completion  
**Deliverables**: Published URLs and completion report

---

## STATUS PROGRESSION SUMMARY

| Phase | User Type | Status | State | Page | Key Actions |
|-------|-----------|--------|--------|------|-------------|
| 1 | External | `draft` | - | `/orders/new` | Create order, select clients/targets |
| 2 | External | `draft` | - | `/account/orders/[id]/confirm` | Review and submit order |
| 3 | External | `pending_confirmation` | `awaiting_review` | `/account/orders/[id]/status` | Monitor progress |
| 4 | Internal | `pending_confirmation` | `awaiting_review` | `/orders/[id]/confirm` | Confirm order, create projects |
| 5 | Internal | `confirmed` → `sites_ready` | `analyzing` → `site_review` | `/clients/[id]/bulk-analysis/projects/[id]` | Research and select sites |
| 6 | External | `sites_ready` → `client_approved` | `site_review` → `payment_pending` | `/account/orders/[id]/sites` | Review and approve sites |
| 7 | External | `client_approved` → `paid` | `payment_pending` → `in_progress` | Manual payment process | Pay invoice |
| 8 | Internal | `paid` → `completed` | `in_progress` → `completed` | Workflow system | Create content, publish links |

## KEY INTEGRATION POINTS

1. **Order Groups**: Link orders to specific clients and their requirements
2. **Bulk Analysis Projects**: Created per order group for site research
3. **Order Site Submissions**: Track domain selections and client approval
4. **Workflows**: Auto-created for each approved domain when paid
5. **Guest Post Items**: Track individual link placement and completion

## MISSING PIECES IDENTIFIED

1. **Automated Notifications**: No email notifications implemented
2. **Payment Integration**: Currently manual process  
3. **Published URL Tracking**: Workflows don't auto-update order items
4. **Client Dashboard**: Limited progress visibility for external users
5. **Bulk Operations**: No bulk approve/reject for site reviews

This analysis shows a well-structured but partially implemented order flow with clear handoff points between external and internal users, though some automation gaps remain.