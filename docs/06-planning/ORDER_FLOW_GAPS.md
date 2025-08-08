# Order Flow Implementation Gaps

Based on detailed click-by-click testing of the order flow from external user creation through site review.

## Critical Issues

### 1. Site Submission Bridge Missing
**Problem**: No mechanism to submit domains from bulk analysis to orders
**Expected**: Internal user selects domains in bulk analysis → Creates site submissions for client review
**Actual**: Site-selections API exists but no UI/trigger from bulk analysis

**Fix Required**:
- Add "Submit to Client" action in bulk analysis domain table
- Create API endpoint to bridge bulk analysis selections to order site submissions
- Update order state when sites are submitted

### 2. Resubmission Flow Missing
**Problem**: External users can't resubmit edited orders
**Expected**: Edit order → Add/remove items → Resubmit → Back to pending_confirmation
**Actual**: Can only save draft, no resubmit action

**Fix Required**:
- Add "Resubmit Order" button on edit page for non-draft orders
- Create resubmit API endpoint that:
  - Validates changes
  - Updates status back to pending_confirmation
  - Notifies internal team

### 3. Site Review Completion
**Problem**: Order stays in site_review state after all sites reviewed
**Expected**: When all sites approved/rejected → Update to next state
**Actual**: Manual state update required

**Fix Required**:
- Add completion check in review endpoint
- Auto-update order state when all submissions reviewed
- Trigger workflow generation for approved sites

### 4. Domain Metadata
**Problem**: Site submissions show hardcoded DR/traffic values
**Expected**: Real metrics from bulk analysis domains
**Actual**: DR: 70, Traffic: 10000 (hardcoded)

**Fix Required**:
- Store metrics in bulkAnalysisDomains table
- Pass real metrics through to site submissions
- Display actual values in UI

### 5. Expandable Site Review UI
**Problem**: No toggle to expand/collapse site submissions per client
**Expected**: Click to expand client group and see site recommendations
**Actual**: expandedSubmission state exists but no toggle button

**Fix Required**:
- Add expand/collapse button on client group header
- Toggle expandedSubmission state on click
- Show/hide submissions based on state

## Minor Issues

### 6. Legacy Redirects
- `/orders/[id]/detail` redirects to `/orders/[id]` ✅ Good
- Clean up any remaining references to old routes

### 7. Missing Features
- Order duplication
- Bulk order actions
- Export functionality
- Email notifications on state changes

## Workflow Improvements

### 8. Status/State Clarity
Current flow works but could be clearer:
- Consider renaming states for clarity
- Add help text explaining each state
- Show estimated timeline per state

### 9. Permission Checks
- Most endpoints check permissions correctly
- Add middleware for consistent permission handling
- Log permission denials for security monitoring

## Next Steps

1. **Priority 1**: Implement site submission bridge from bulk analysis
2. **Priority 2**: Add resubmission flow for edited orders  
3. **Priority 3**: Auto-complete site review state
4. **Priority 4**: Fix domain metadata display
5. **Priority 5**: Add expand/collapse UI for site reviews