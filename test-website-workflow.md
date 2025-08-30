# Website-Workflow Frontend Testing Report

## Test Environment
- **Date**: 2025-08-30
- **Server**: http://localhost:3000
- **Testing Focus**: Website selector integration in workflow creation

## Test 1: Create New Workflow with Website Selector
**Path**: `/workflows/new`

### Steps:
1. Navigate to workflow creation page
2. Check if WebsiteSelector dropdown appears in Step 0 (Domain Selection)
3. Test website search functionality
4. Select a website from dropdown
5. Verify website details display

### Expected Results:
- [ ] WebsiteSelector dropdown loads with 956 websites
- [ ] Search filters websites in real-time
- [ ] Selecting website shows domain and DA
- [ ] Website ID saved in step outputs

## Test 2: Website Data Propagation
**Path**: Continue from Test 1

### Steps:
1. After selecting website, move to Step 2 (Topic Generation)
2. Check if domain appears correctly
3. Move to Step 3 (Keyword Research)
4. Verify domain is referenced

### Expected Results:
- [ ] Domain from selected website appears in Topic Generation
- [ ] Keyword Research shows correct guest post site
- [ ] No metadata (DA, traffic) appears in prompts

## Test 3: Backward Compatibility
**Path**: `/workflows/[existing-id]/edit`

### Steps:
1. Open an existing workflow created before website connection
2. Check Step 0 (Domain Selection)
3. Verify text domain still displays
4. Edit and save workflow

### Expected Results:
- [ ] Old workflows show text domain (not website selector)
- [ ] Domain displays correctly in all steps
- [ ] Can edit and save without issues

## Test 4: Auto-save Functionality
**Path**: `/workflows/new`

### Steps:
1. Create new workflow
2. Select website from dropdown
3. Wait for auto-save indicator
4. Refresh page
5. Check if website selection persisted

### Expected Results:
- [ ] Auto-save triggers after website selection
- [ ] Website selection persists after refresh
- [ ] No data loss on page reload

## Test 5: Validation
**Path**: `/workflows/new`

### Steps:
1. Try to proceed without selecting website
2. Select then deselect website
3. Check validation messages

### Expected Results:
- [ ] Cannot proceed without domain/website
- [ ] Clear validation error messages
- [ ] Step shows incomplete status when empty

## Test Results Summary
- **Total Tests**: 5
- **Passed**: TBD
- **Failed**: TBD
- **Blocked**: TBD

## Issues Found
(To be filled during testing)

## Screenshots/Evidence
(To be added during testing)