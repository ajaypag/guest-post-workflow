# ManyReach Import V2 - Comprehensive Test Plan

## Overview
This document outlines the testing procedures for all the enhancements made to the ManyReach import system.

## Test Environment Setup

### Prerequisites
1. Run database migration:
```bash
psql $DATABASE_URL < migrations/0098_add_manyreach_import_recovery.sql
```

2. Ensure you're logged in as an internal user (authentication required)

3. Navigate to: `/admin/manyreach-import-v2`

## Feature Testing Checklist

### 1. ✅ Authentication
- [ ] Access page without login → Should redirect to login
- [ ] Access page as account user → Should show 403 error
- [ ] Access page as internal user → Should load successfully
- [ ] API routes without auth → Should return 401
- [ ] API routes as account user → Should return 403

**Test Commands:**
```bash
# Test without auth
curl http://localhost:3000/api/admin/manyreach/campaigns-v2
# Should return: {"error":"Unauthorized"}

# Test with account user token
curl -H "Cookie: your-account-cookie" http://localhost:3000/api/admin/manyreach/campaigns-v2
# Should return: {"error":"This action requires internal user access"}
```

### 2. ✅ Bulk Campaign Import
- [ ] Select multiple campaigns using checkboxes
- [ ] Click "Select All" button
- [ ] Verify count badge shows correct number
- [ ] Click "Import X Campaigns" button
- [ ] Monitor progress for each campaign
- [ ] Check error handling for failed imports
- [ ] Verify summary statistics after completion

**Test Scenarios:**
1. Import 3 campaigns simultaneously
2. Import with one failing campaign (invalid API key)
3. Import with email limit set to 5
4. Import with "Process All" checked

### 3. ✅ Batch Draft Approval
- [ ] Select multiple drafts using checkboxes
- [ ] Click "Select All" on current page
- [ ] Click "Bulk Approve" button
- [ ] Confirm approval dialog
- [ ] Monitor progress indicator
- [ ] Check created publishers/websites/offerings
- [ ] Verify error handling for conflicts

**Test Scenarios:**
1. Approve 5 drafts with no conflicts
2. Approve drafts with duplicate publishers
3. Approve drafts with price conflicts
4. Mixed approval (some succeed, some fail)

### 4. ✅ Advanced Filtering & Search
- [ ] Filter by status (pending/approved/rejected)
- [ ] Filter by "Has Offer" (Yes/No)
- [ ] Filter by "Has Pricing" (Yes/No)
- [ ] Search by company name
- [ ] Search by email domain
- [ ] Search by website domain
- [ ] Date range filtering
- [ ] Combine multiple filters
- [ ] Clear filters and verify reset

**Test Queries:**
1. Status="pending" + HasOffer="true"
2. Search="gmail" + HasPricing="false"
3. DateFrom="2024-01-01" + Status="approved"

### 5. ✅ Export Functionality
- [ ] Export all drafts as CSV
- [ ] Export filtered drafts as CSV
- [ ] Export all drafts as JSON
- [ ] Export filtered drafts as JSON
- [ ] Verify file downloads
- [ ] Check data integrity in exports
- [ ] Verify date in filename

**Validation:**
1. Open CSV in Excel/Google Sheets
2. Verify all columns present
3. Check special characters handling
4. Validate JSON structure

### 6. ✅ JSON Error Recovery
- [ ] Click code icon on draft with broken JSON
- [ ] JSON editor dialog opens
- [ ] Edit JSON to fix errors
- [ ] Save changes
- [ ] Verify draft updates
- [ ] Test invalid JSON rejection

**Test Cases:**
```json
// Broken JSON to fix:
{
  "publisher": {
    "companyName": "Test Co",
    // Missing closing brace
  "websites": []
}

// Fixed JSON:
{
  "publisher": {
    "companyName": "Test Co"
  },
  "websites": [],
  "offerings": [],
  "hasOffer": true
}
```

### 7. ✅ Manual Domain/Offering Addition
- [ ] Open ManualDataEntry dialog
- [ ] Add new domain with all fields
- [ ] Add domain with minimal fields
- [ ] Remove existing domain
- [ ] Add new offering for existing domain
- [ ] Add offering with pricing
- [ ] Add offering without pricing
- [ ] Set offering requirements
- [ ] Review all changes before saving
- [ ] Save and verify updates

**Test Data:**
```
Domain: testsite.com
DR: 45
Categories: Technology, Business
Niche: SaaS, B2B
Type: Blog

Offering: Guest Post
Price: $150 USD
Turnaround: 7 days
Word Count: 500-2000
```

### 8. ✅ Error Recovery & Resume
- [ ] Start large import (100+ emails)
- [ ] Kill process mid-import
- [ ] Restart import for same campaign
- [ ] Verify resume from last position
- [ ] Check skipped already-processed emails
- [ ] View failed emails list
- [ ] Retry failed emails only

**Simulation:**
1. Start import with 50 emails
2. After 20 emails, close browser tab
3. Return to page and re-import
4. Should start from email 21

### 9. ✅ Responsive Design
- [ ] Desktop view (1920x1080)
- [ ] Laptop view (1366x768)
- [ ] Tablet view (768x1024)
- [ ] Mobile view (375x667)
- [ ] Test all interactive elements
- [ ] Verify modals/dialogs responsive
- [ ] Check table horizontal scroll
- [ ] Test filter panel collapse

**Breakpoints to Test:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### 10. ✅ Pagination
- [ ] Navigate between pages
- [ ] Change page size (25/50/100)
- [ ] Verify correct item count
- [ ] Test with filters applied
- [ ] Check "Previous/Next" buttons
- [ ] Verify page persistence on refresh

## Performance Testing

### Load Testing
1. Import 500+ drafts
2. Test filtering performance
3. Test bulk approval with 50+ drafts
4. Monitor memory usage
5. Check API response times

**Expected Performance:**
- Page load: < 2 seconds
- Filter apply: < 500ms
- Export 1000 drafts: < 5 seconds
- Bulk approve 50: < 30 seconds

## Security Testing

### Authorization
1. Test all endpoints with different user types
2. Verify SQL injection prevention in search
3. Test XSS in manual data entry
4. Verify CSRF protection
5. Check rate limiting on bulk operations

## Integration Testing

### End-to-End Workflows
1. **Complete Import Flow:**
   - Select workspace
   - Configure settings
   - Import campaign
   - Filter drafts
   - Fix JSON errors
   - Add manual data
   - Bulk approve
   - Export results

2. **Error Recovery Flow:**
   - Start import
   - Simulate network failure
   - Resume import
   - Complete successfully

3. **Bulk Operations Flow:**
   - Select 10 campaigns
   - Bulk import
   - Select resulting drafts
   - Bulk approve
   - Verify database records

## Regression Testing

### Existing Features
- [ ] Single campaign import still works
- [ ] Individual draft approval works
- [ ] Draft editing functionality intact
- [ ] Workspace switching works
- [ ] Original page (`/admin/manyreach-import`) still functional

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Known Issues & Workarounds

1. **Large imports may timeout**
   - Workaround: Use smaller batch sizes
   - Fix: Implemented progress tracking

2. **JSON editor may lag with large data**
   - Workaround: Use external JSON editor
   - Fix: Added debouncing

3. **Mobile tables need horizontal scroll**
   - Workaround: Pinch to zoom
   - Fix: Added scroll indicators

## Test Data

### Sample Campaigns
```
Campaign 1: "Tech Publishers Outreach"
Campaign 2: "Finance Blogs Q1"
Campaign 3: "Health Sites Partnership"
```

### Sample Drafts
```
Draft 1: Complete with pricing
Draft 2: Missing pricing
Draft 3: No offer detected
Draft 4: Broken JSON
Draft 5: Duplicate publisher
```

## Deployment Checklist

Before deploying to production:
1. [ ] Run all tests above
2. [ ] Check database migration applied
3. [ ] Verify environment variables set
4. [ ] Test with production data subset
5. [ ] Backup database
6. [ ] Monitor error logs during rollout
7. [ ] Have rollback plan ready

## Post-Deployment Validation

After deployment:
1. [ ] Test authentication on production
2. [ ] Import one small campaign
3. [ ] Approve one draft
4. [ ] Export data
5. [ ] Check error monitoring
6. [ ] Verify performance metrics

## Support Documentation

For issues, check:
1. Browser console for errors
2. Network tab for failed requests
3. Application logs at `/admin/logs`
4. Database logs for query errors

## Contact

For questions about this test plan:
- Check implementation at `/admin/manyreach-import-v2`
- Review code changes in git history
- API documentation at `/api/admin/manyreach/*`