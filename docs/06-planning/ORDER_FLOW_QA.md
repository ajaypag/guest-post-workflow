# Order Flow QA Documentation

## Overview
This document outlines the expected order flow from external user creation through site selection, and compares it against the actual implementation to identify gaps and necessary updates.

## Expected Flow

### 1. External User Creates Order
**Page**: `/orders/new`

**Expected Behavior**:
- External user creates a new order with multiple clients
- Selects target pages and anchor texts for each client
- Order starts in `draft` status with `configuring` state
- Can save and continue editing later
- Submits order for review

**UI Should Show**:
- Clear multi-client order form
- Package selection (Bronze/Silver/Gold/Custom)
- Target page and anchor text inputs per client
- Save draft and Submit buttons

**Status After Submit**: 
- Status: `pending_confirmation`
- State: `awaiting_review`

### 2. External User Edits Order
**Page**: `/orders/[id]/edit`

**Expected Behavior**:
- User can edit order while in editable statuses (draft through invoiced)
- Can add more links/clients
- Can update target pages and anchor texts
- Auto-save functionality works correctly
- Re-submission updates the order properly

**Data Validation**:
- All changes persist in database
- Order groups update correctly
- Target pages and anchor texts save properly

### 3. Internal User First Pass Review
**Page**: `/orders/[id]/confirm`

**Expected Behavior**:
- Internal user reviews order details
- Checks target pages have proper keywords
- Generates keywords for each client/order group
- Creates bulk analysis projects automatically on confirmation

**Actions Required**:
1. Review client details and requirements
2. Generate keywords per order group
3. Confirm order (triggers bulk analysis project creation)

**Status After Confirm**:
- Status: `confirmed`
- State: `analyzing`

### 4. Bulk Analysis Process
**Page**: `/bulk-analysis/projects/[projectId]`

**Expected Behavior**:
- Bulk analysis projects created for each order group
- Internal user adds domains to analyze
- System analyzes domains based on keywords
- Internal user selects domains to submit to client

**UI Should Show**:
- Domain analysis interface
- Add domains functionality
- Domain metrics and qualification status
- Selection checkboxes for client submission

### 5. Site Submission to Client
**Action**: Internal user marks sites ready for review

**Expected Behavior**:
- Selected domains become site submissions
- Order state updates to `site_review`
- Client gets notified (future feature)
- Sites appear in order detail page for review

**Status After Submission**:
- Status: `confirmed` (unchanged)
- State: `site_review`

### 6. External User Site Review
**Page**: `/orders/[id]`

**Expected Behavior**:
- Progressive disclosure shows site review section
- User sees submitted domains with metrics
- Can approve/reject each domain
- Can add notes for rejections
- UI updates dynamically based on order state

**UI Should Show**:
- Site review cards per client group
- Domain metrics (DR, traffic, price)
- Approve/Reject buttons
- Notes field for feedback

## Test Scenarios

### Scenario 1: Order Creation and Editing
1. Create new multi-client order
2. Save as draft
3. Return and edit order
4. Add more links
5. Update target pages
6. Submit for review

**Check**:
- [ ] Order saves correctly as draft
- [ ] All data persists between sessions
- [ ] Order groups maintain integrity
- [ ] Status updates to pending_confirmation on submit

### Scenario 2: Internal Review and Confirmation
1. Access order as internal user
2. Review order details
3. Generate keywords for each group
4. Confirm order

**Check**:
- [ ] Keywords save per order group
- [ ] Bulk analysis projects auto-create
- [ ] Status updates to confirmed
- [ ] State updates to analyzing

### Scenario 3: Bulk Analysis Integration
1. Access bulk analysis project from order
2. Add domains for analysis
3. Wait for analysis completion
4. Select domains for client
5. Submit selections

**Check**:
- [ ] Projects linked correctly to order groups
- [ ] Domain analysis works
- [ ] Selections create site submissions
- [ ] Order state updates to site_review

### Scenario 4: Client Site Review
1. Access order as external user
2. View site submissions
3. Approve some sites
4. Reject others with notes
5. Complete review

**Check**:
- [ ] Site submissions display correctly
- [ ] Approve/reject functionality works
- [ ] Notes save properly
- [ ] Status updates reflect approvals

## Current Implementation Gaps

### To Be Tested:
1. **Auto-save race conditions** - Does the auto-save in edit page work correctly?
2. **Order re-submission** - Does re-submitting an edited order update all data?
3. **Keyword generation** - Is this implemented in the confirm page?
4. **Bulk analysis auto-creation** - Does this trigger on confirmation?
5. **Site submission flow** - How are domains submitted from bulk analysis to order?
6. **Progressive disclosure** - Does the order page show correct UI based on state?
7. **State transitions** - Are all state changes handled correctly?

## Testing Checklist

### Phase 1: Order Creation/Edit
- [ ] Create order with 2 clients
- [ ] Save as draft
- [ ] Edit and add third client
- [ ] Update target pages
- [ ] Verify all data saves
- [ ] Submit for review
- [ ] Check status is pending_confirmation

### Phase 2: Internal Processing
- [ ] Access order confirm page
- [ ] Check if keyword generation exists
- [ ] Confirm order
- [ ] Verify bulk analysis projects created
- [ ] Check project-order associations

### Phase 3: Site Selection
- [ ] Access bulk analysis project
- [ ] Add and analyze domains
- [ ] Select domains for submission
- [ ] Mark sites ready for review
- [ ] Verify site submissions created
- [ ] Check order state is site_review

### Phase 4: Client Review
- [ ] Access order as external user
- [ ] Verify site review UI appears
- [ ] Test approve functionality
- [ ] Test reject with notes
- [ ] Verify data persistence

## Next Steps
1. Execute each test scenario
2. Document actual behavior vs expected
3. Create tasks for fixing gaps
4. Update legacy code removal list