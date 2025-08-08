# Advertiser Layer Proposal for PostFlow

## Executive Summary
This document outlines the proposed implementation of a client/advertiser layer for PostFlow, enabling external advertisers to view qualified domains, create orders, and track their guest post campaigns.

## Current System Analysis

### User System
- Users table with roles: 'user' | 'admin'
- User types: 'internal' | 'advertiser' | 'publisher'
- Multi-client access via `userClientAccess` table
- Invitation-only registration system

### Bulk Analysis System
- Projects contain domains for analysis
- Domains qualified into 4 tiers: high_quality, good_quality, marginal_quality, disqualified
- AI-powered qualification with human verification
- DataForSEO integration for domain metrics

### Workflow System
- JSON-based workflow storage in `workflows` table
- Multi-step AI-powered content generation
- No direct connection to bulk analysis domains currently

### Pricing Structure
- Websites synced from Airtable with `guestPostCost`
- No separation between wholesale/retail pricing
- Pricing stored at website level, not domain analysis level

## Proposed Architecture

### 1. User Roles & Permissions
```typescript
userType: 'internal' | 'advertiser' | 'publisher'
```
- **Internal**: Full access (current users)
- **Advertiser**: Limited access to:
  - View qualified domains in assigned projects
  - See retail pricing only
  - Create/manage orders
  - View order status

### 2. Security Implementation
- Row-level security using `userClientAccess` table
- API middleware to filter data based on user type
- Separate pricing columns: `wholesale_price` vs `retail_price`
- Project-based access control

### 3. Order System
```typescript
orders {
  id: uuid
  clientId: uuid
  advertiserId: uuid  
  projectId: uuid
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed'
  items: OrderItem[]
  subtotalRetail: decimal
  discountAmount: decimal
  finalTotalRetail: decimal
  totalWholesalePrice: decimal  // Internal only
  paymentStatus: 'pending' | 'invoice_sent' | 'paid'
  includesClientReview: boolean
  clientReviewFee: decimal
}

orderItems {
  orderId: uuid
  domainId: uuid
  retailPrice: decimal
  wholesalePrice: decimal
  workflowId: uuid
  currentStage: varchar
  currentStatus: varchar
}
```

### 4. Volume Discount System
```typescript
discountTiers {
  id: uuid
  clientId: uuid  // Optional client-specific
  minQuantity: integer
  maxQuantity: integer
  discountPercent: decimal
}
```

### 5. Order Lifecycle Tracking
- Integration with existing workflow system
- Post-workflow tracking (blogger outreach, publication)
- Client review options with additional fees
- Payment status management

### 6. Public Preview Links
- Token-based preview system
- Progressive data disclosure
- Lead capture before full access

## Self-Critique & Integration Analysis

### ❌ Critical Issues Found

1. **Pricing Model Mismatch**
   - **Assumption**: Separate wholesale/retail columns
   - **Reality**: Pricing comes from Airtable `guestPostCost` - only one price
   - **Issue**: Need to determine markup strategy and where to store retail pricing
   - **Finding**: `websites` table has `guest_post_cost` but bulk analysis domains don't have pricing at all

2. **Workflow-Domain Disconnect**
   - **Assumption**: Orders link domains to workflows
   - **Reality**: Workflows store complete data as JSON in `content` field, no direct domain reference
   - **Issue**: `bulkAnalysisDomains` table has no `workflowId` field
   - **Finding**: Workflows track `clientId` and `targetPages` (JSON) but not which bulk analysis domain triggered them

3. **No Existing Order Infrastructure**
   - **Assumption**: Build on existing order system
   - **Reality**: No order system exists - workflows are created directly
   - **Issue**: Major new subsystem required
   - **Finding**: Workflows are standalone entities with no parent relationship

4. **Client Access Complexity**
   - **Assumption**: Simple advertiser → client relationship
   - **Reality**: `userClientAccess` table already handles multi-client access for internal users
   - **Issue**: Advertisers need project-level access, not full client access
   - **Finding**: `bulkAnalysisDomains` has `projectId` which could be the access control point

5. **Data Storage Patterns**
   - **Assumption**: Normalized relational data
   - **Reality**: Heavy use of JSON columns (`content`, `targetPages`, `inputs`, `outputs`)
   - **Issue**: Complex queries and data integrity challenges
   - **Finding**: This pattern makes it hard to query across workflows and domains

### ⚠️ Integration Challenges

1. **Database Schema Changes**
   - Need new tables: orders, orderItems, discountTiers, etc.
   - Must add retail pricing somewhere (websites? bulk_analysis_domains?)
   - Bridge table needed: bulk_analysis_domains → workflows

2. **API Security Overhaul**
   - Every API route needs user type checking
   - Complex filtering for advertiser vs internal data
   - Existing routes assume internal users only

3. **UI/UX Considerations**
   - Current UI is internal-focused with full data access
   - Need completely separate advertiser views
   - Shared components need conditional rendering

4. **Workflow Integration**
   - Workflows currently standalone
   - Need to track which workflow belongs to which order item
   - Lifecycle tracking requires workflow status updates

### ✅ What Can Be Leveraged

1. **User System Foundation**
   - userType field already exists
   - Invitation system can handle advertiser invites
   - userClientAccess pattern can extend to advertisers

2. **Bulk Analysis Structure**
   - Domain qualification system is solid
   - Project grouping works well for advertiser access
   - AI qualification provides good data for advertisers

3. **Existing UI Components**
   - BulkAnalysisTable can be adapted for advertiser view
   - Modal patterns (DataForSeoResultsModal) can be reused
   - Header/AuthWrapper handle user context

### 🔍 Additional Critical Findings

1. **Bulk Analysis → Workflow Gap**
   - Bulk analysis qualifies domains but doesn't create workflows
   - No `createWorkflow` button in bulk analysis UI
   - Workflows are created from scratch, not from qualified domains
   - Missing: "Create Guest Post" action on qualified domains

2. **Pricing Location Problem**
   - Websites table: Has `guest_post_cost` from Airtable
   - Bulk analysis domains: No price field at all
   - Need to JOIN websites table on domain match to get pricing
   - Risk: Domain format mismatches (www vs non-www)

3. **Project-Based Access Model**
   - Projects (`bulk_analysis_projects`) exist but aren't in schema.ts
   - Advertisers should access projects, not clients
   - Need new table: `userProjectAccess` for advertiser permissions

4. **Workflow Ownership**
   - Workflows have `userId` (creator) but no concept of "for whom"
   - No way to track if workflow is for internal vs advertiser use
   - Need to add `orderId` or `orderItemId` to workflows table

### 📋 Revised Implementation Plan (Reality-Based)

#### Phase 0: Critical Infrastructure (Week 1)
1. **Add workflow creation from bulk analysis**
   - Add "Create Guest Post" button to qualified domains
   - Link `bulkAnalysisDomains.id` to new workflows
   - Add `sourceType` and `sourceDomainId` to workflows table

2. **Fix pricing data flow**
   - Add price lookup: bulkAnalysisDomains → websites.guest_post_cost
   - Create pricing service to handle domain matching
   - Add retail markup configuration

3. **Create projects table in schema**
   - Migrate existing project data properly
   - Add foreign key constraints

#### Phase 1: Order System Foundation (Week 2)
1. **Minimal order tables**
   ```sql
   orders: id, clientId, projectId, advertiserId, status, total
   order_items: orderId, domainId, workflowId, price
   ```
2. **Link workflows to orders**
   - Add `orderItemId` to workflows table
   - Update workflow creation to accept order context

#### Phase 2: Advertiser Access (Week 3)
1. **Project-based permissions**
   - Create `userProjectAccess` table
   - Modify bulk analysis API to check project access
   - Hide wholesale pricing in API responses

2. **Advertiser routes**
   - `/advertiser/projects` - List accessible projects
   - `/advertiser/projects/[id]` - View qualified domains only
   - Reuse existing components with permission checks

#### Phase 3: Order Creation Flow (Week 4)
1. **Simple order builder**
   - Select domains from qualified list
   - Show retail pricing with automatic discounts
   - Create order with "pending_approval" status

2. **Internal approval**
   - Notification to internal team
   - Simple approve/reject flow
   - Auto-create workflows on approval

#### Phase 4: Basic Tracking (Week 5)
1. **Workflow status visibility**
   - Show workflow progress to advertisers
   - Hide sensitive internal steps
   - Basic completion notifications

2. **Manual payment tracking**
   - Mark orders as paid
   - Simple invoice generation

### 🤔 Open Questions

1. **Pricing Strategy**: How is retail price calculated from wholesale?
2. **Advertiser-Client Relationship**: Can one advertiser access multiple clients?
3. **Order Approval**: Who approves orders internally?
4. **Workflow Assignment**: How are orders distributed to team members?
5. **Legacy Data**: How to handle existing workflows without orders?

## Recommendations

1. **Start with Pricing Model**: Resolve wholesale/retail strategy first
2. **Build Order System Separately**: Don't try to retrofit existing workflows
3. **Create New API Layer**: `/api/advertiser/*` routes instead of modifying existing
4. **Prototype First**: Build minimal advertiser view to test assumptions
5. **Migration Strategy**: Plan for existing data migration upfront

## Final Reality Check

After deep analysis, the main challenges are:

1. **Disconnected Systems**: Bulk analysis and workflows don't communicate
2. **JSON Storage**: Makes relational queries and reporting difficult  
3. **Missing Infrastructure**: No projects table, no order system, no workflow-domain link
4. **Pricing Complexity**: Need to match domains across tables and apply markups
5. **Access Control**: Current system assumes all users see everything

The proposed implementation focuses on:
- Building missing connections between existing systems
- Creating minimal order infrastructure
- Leveraging project-based access control
- Gradual rollout with internal testing first

This is a significant undertaking that requires careful planning and iterative development. The phased approach allows for validation at each step before proceeding.