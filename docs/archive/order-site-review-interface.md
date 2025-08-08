# Order Site Review Interface Testing Guide

## Overview
This guide outlines test scenarios for the unified order site review interface that leverages the BulkAnalysisTable component.

## Test Scenarios

### 1. Internal User Testing
**Path**: `/clients/{clientId}/bulk-analysis/projects/{projectId}?orderId={orderId}&orderGroupId={orderGroupId}`

#### Test Steps:
1. **Order Context Display**
   - Verify order information banner appears when `orderId` and `orderGroupId` params are present
   - Check that "Add to Order" button is visible in table actions
   - Confirm order context persists through pagination

2. **Site Suggestion Workflow**
   - Select domains using checkboxes
   - Click "Add to Order" button
   - Verify domains are added as submissions with "pending" status
   - Check that success message appears

3. **Status Management**
   - Change submission status to "submitted", "completed", etc.
   - Verify status changes are reflected in order review page
   - Test bulk status updates

4. **Navigation**
   - Click "View Order" link in banner
   - Verify navigation to `/account/orders/{orderId}/sites`
   - Check that selected group is pre-selected

### 2. Account User Testing
**Path**: `/account/orders/{orderId}/sites`

#### Test Steps:
1. **Pending Review Tab**
   - Verify only pending/submitted domains appear
   - Check that approve/reject actions are available
   - Test review workflow with notes

2. **All Suggestions Tab**
   - Verify all suggested domains are visible
   - Check that domain details modal works
   - Test guided domain functionality (click for details)

3. **Approved Tab**
   - Verify only approved domains appear
   - Check approval count updates correctly
   - Test re-review functionality if available

4. **Client Selector** (Multi-client orders)
   - Switch between different clients
   - Verify domains update correctly
   - Check that approval counts are client-specific

### 3. Integration Testing

#### Workflow End-to-End:
1. **Internal User Creates Suggestions**
   - Navigate to bulk analysis with order context
   - Add 5-10 domains to order
   - Set some as "submitted", leave others "pending"

2. **Account User Reviews**
   - Login as account user
   - Navigate to order sites page
   - Review pending tab (should show submitted domains)
   - Approve 3, reject 2 with notes
   - Check approved tab shows correct count

3. **Internal User Sees Updates**
   - Return to bulk analysis page
   - Verify approved/rejected statuses are visible
   - Add more suggestions if needed

### 4. Edge Cases

1. **No Suggestions Yet**
   - Test empty state messaging
   - Verify helpful instructions appear

2. **All Domains Approved**
   - Check completion messaging
   - Verify no more actions needed state

3. **Mixed Permissions**
   - Test that account users can't access internal links
   - Verify security boundaries are maintained

4. **Large Dataset**
   - Test with 100+ domain suggestions
   - Verify performance and pagination

## Expected Behaviors

### BulkAnalysisTable Integration
- ✅ Table displays all domain data correctly
- ✅ Sorting and filtering work as expected
- ✅ Domain detail modals accessible
- ✅ Guided domain links functional (`?guided={domainId}`)
- ✅ Target page selection visible
- ✅ Notes and special instructions saveable

### Order Context
- ✅ Order information persists across page refreshes
- ✅ Correct permissions enforced (internal vs account)
- ✅ Status updates reflect immediately
- ✅ Cross-client data properly isolated

### Navigation Flow
- ✅ Seamless transition between bulk analysis and order review
- ✅ Breadcrumbs and back navigation work correctly
- ✅ Deep links preserve state

## Common Issues to Watch For

1. **Type Mismatches**
   - Domain data conversion between APIs
   - Null vs undefined handling
   - Date formatting consistency

2. **Permission Boundaries**
   - Account users accessing internal features
   - Cross-client data leakage
   - Unauthorized status changes

3. **State Synchronization**
   - Status updates not reflecting immediately
   - Tab counts not updating
   - Selected domains clearing unexpectedly

## Test Data Setup

```sql
-- Create test order with multiple groups
INSERT INTO orders (id, account_id, status, total_price)
VALUES ('test-order-1', 'test-account-1', 'confirmed', 5000);

-- Create order groups for different clients
INSERT INTO order_groups (id, order_id, client_id, link_count, price_per_link)
VALUES 
  ('test-group-1', 'test-order-1', 'test-client-1', 10, 250),
  ('test-group-2', 'test-order-1', 'test-client-2', 5, 300);

-- Create bulk analysis project with domains
INSERT INTO bulk_analysis_projects (id, client_id, name)
VALUES ('test-project-1', 'test-client-1', 'Test Order Suggestions');

-- Add project-order association
INSERT INTO project_order_associations (order_id, order_group_id, project_id, association_type)
VALUES ('test-order-1', 'test-group-1', 'test-project-1', 'primary');
```

## Success Criteria

1. Both user types can effectively use the interface for their workflows
2. No security violations or cross-client data exposure
3. All status transitions work correctly
4. Navigation between views is seamless
5. Performance remains acceptable with large datasets
6. Error states are handled gracefully