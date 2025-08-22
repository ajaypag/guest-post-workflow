# Deprecated Order Groups APIs Migration Plan

## Overview
This document lists all deprecated order groups API endpoints and their line items replacements.

## Deprecated API Endpoints

### 1. Order Groups Management
- **OLD**: `/api/orders/[id]/groups/route.ts`
- **NEW**: Use `/api/orders/[id]/line-items/route.ts`
- **Status**: Line items API fully implemented
- **Used By**: Order edit page (already migrated)

### 2. Submissions Management
- **OLD**: `/api/orders/[id]/groups/[groupId]/submissions/route.ts`
- **NEW**: Use `/api/orders/[id]/line-items/available-domains/route.ts`
- **Status**: Available domains API created
- **Used By**: Order review page (partially migrated)

### 3. Submission Editing
- **OLD**: `/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/edit/route.ts`
- **NEW**: Should update line item metadata via `/api/orders/[id]/line-items/[lineItemId]/route.ts`
- **Status**: Needs implementation
- **Used By**: Order review page - handleEditSubmission

### 4. Site Selections
- **OLD**: `/api/orders/[id]/groups/[groupId]/site-selections/route.ts`
- **NEW**: Use `/api/orders/[id]/line-items/[lineItemId]/assign-domain/route.ts`
- **Status**: Assign domain API implemented
- **Used By**: Order review page - handleAssignTargetPage

### 5. Bulk Analysis Projects
- **OLD**: `/api/orders/[id]/groups/[groupId]/bulk-analysis/route.ts`
- **NEW**: Projects created directly in `/api/orders/[id]/confirm/route.ts`
- **Status**: Already migrated
- **Used By**: Order confirmation flow

### 6. Workflow Generation
- **OLD**: `/api/orders/[id]/groups/[groupId]/generate-workflows/route.ts`
- **NEW**: Use `/api/orders/[id]/generate-workflows/route.ts` with line items
- **Status**: Already migrated
- **Used By**: WorkflowGenerationButton component

### 7. Change Project Assignment
- **OLD**: `/api/orders/[id]/groups/[groupId]/change-project/route.ts`
- **NEW**: Update line item metadata with new project ID
- **Status**: Needs implementation
- **Used By**: ChangeBulkAnalysisProject component

### 8. Request More Sites
- **OLD**: `/api/orders/[id]/groups/[groupId]/request-more-sites/route.ts`
- **NEW**: Add more line items via `/api/orders/[id]/line-items/route.ts`
- **Status**: Line items POST endpoint supports this
- **Used By**: Unknown - possibly not used

### 9. Associated Domains
- **OLD**: `/api/orders/[id]/groups/[groupId]/associated-domains/route.ts`
- **NEW**: Get domains via bulk analysis projects
- **Status**: Needs review
- **Used By**: Unknown

### 10. Submission Status Updates
- **OLD**: `/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/status/route.ts`
- **NEW**: Update via line items API
- **Status**: Needs implementation
- **Used By**: Order review components

### 11. Submission Review
- **OLD**: `/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/review/route.ts`
- **NEW**: Not needed - review handled by line items status
- **Status**: Can be deprecated
- **Used By**: Unknown

### 12. Submission Inclusion
- **OLD**: `/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/inclusion/route.ts`
- **NEW**: Handle via line item domain assignment
- **Status**: Partially implemented
- **Used By**: Order review page

### 13. Switch Submission
- **OLD**: `/api/orders/[id]/groups/[groupId]/site-selections/[submissionId]/switch/route.ts`
- **NEW**: Reassign domain to different line item
- **Status**: Needs implementation
- **Used By**: Unknown

### 14. Target URL Updates
- **OLD**: `/api/orders/[id]/groups/[groupId]/site-selections/[submissionId]/target-url/route.ts`
- **NEW**: Update line item targetPageUrl field
- **Status**: Line items PATCH supports this
- **Used By**: Order review components

### 15. Add Site Selections
- **OLD**: `/api/orders/[id]/groups/[groupId]/site-selections/add/route.ts`
- **NEW**: Assign domains to line items
- **Status**: Implemented via assign-domain endpoint
- **Used By**: Unknown

## Migration Priority

### Phase 1: Critical Path (IMMEDIATE)
1. Fix handleEditSubmission in review page - update to use line items
2. Fix handleAssignTargetPage in review page - update to use line items
3. Update ChangeBulkAnalysisProject component

### Phase 2: Cleanup (NEXT SPRINT)
1. Remove unused endpoints with no references
2. Add redirects/deprecation notices to old endpoints
3. Update any remaining internal pages

### Phase 3: Final Migration (FUTURE)
1. Archive order_groups table
2. Remove all groups-related code
3. Update documentation

## Components Still Using Groups APIs

### High Priority (Active Components)
- `/app/orders/[id]/review/page.tsx` - 2 references
- `/app/orders/[id]/internal/page.tsx` - Multiple references
- `/components/orders/OrderSiteReviewTableV2.tsx` - Several references
- `/components/orders/ChangeBulkAnalysisProject.tsx` - Project management

### Medium Priority (Less Used)
- `/app/orders/[id]/page.tsx` - Order details page
- `/app/clients/[id]/bulk-analysis/projects/[projectId]/page.tsx` - Project page
- `/app/account/orders/[id]/status/page.tsx` - Status page

### Low Priority (Already Migrated)
- `/components/orders/WorkflowGenerationButton.tsx` - Has fallback to new API

## Implementation Notes

1. **Pseudo-Groups Approach**: The review page creates pseudo-groups from line items grouped by client. This maintains UI compatibility while using line items backend.

2. **Domain Assignment**: Instead of "submissions", we now have domains that can be assigned to line items. The concept of "approving" a submission is replaced with assigning a domain to a line item.

3. **Metadata Storage**: Line items have a metadata field that can store additional information previously stored in submissions.

4. **Backward Compatibility**: Some components check for both orderGroups and lineItems to maintain compatibility during migration.

## Testing Checklist

- [ ] Create new order with line items
- [ ] Edit order - add/remove line items
- [ ] Submit order for confirmation
- [ ] Internal user confirms order
- [ ] Bulk analysis projects created
- [ ] Review available domains
- [ ] Assign domains to line items
- [ ] Change target pages and anchor text
- [ ] Generate workflows from line items
- [ ] Complete order flow

## Rollback Plan

If issues arise:
1. The pseudo-groups approach allows frontend to work with either system
2. Feature flags can disable line items system
3. Database has both tables - can switch back if needed
4. APIs can be restored from git history

---

*Generated: 2025-08-19*
*Status: Active Migration*