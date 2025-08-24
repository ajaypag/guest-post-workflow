# Publisher Claim E2E Test Plan

## Test Subject: Malemodelscene Publishing
- **Publisher ID**: c7cb27d3-4343-422d-9cf7-754dfcdfee56
- **Email**: info@malemodelscene.net
- **Current Status**: shadow
- **Websites**: 4 (archiscene.net, beautyscene.net, designscene.net, malemodelscene.net)
- **Offerings**: 4 pre-configured

## Pre-Test State (Baseline)
- Account Status: `shadow`
- Verified Status: Not tracked in publishers table
- Invitation Sent: 2025-08-23 04:46:55
- Invitation Token: 6c1a9c7b-28a5-4a83-ba13-9321b54a6d2c

## Test Steps & Success Criteria

### 1. Claim Link Access ✅
**URL**: `http://localhost:3002/publisher/claim?token=6c1a9c7b-28a5-4a83-ba13-9321b54a6d2c`
- [ ] Link loads without error
- [ ] Shows publisher info (name, email)
- [ ] Allows setting password
- [ ] Successfully creates account

### 2. Data Display Verification ✅
After signup, verify onboarding shows:
- [ ] Company Name: Malemodelscene Publishing
- [ ] Contact Name: Info
- [ ] Email: info@malemodelscene.net

**Websites Section:**
- [ ] archiscene.net (DR: 53, Traffic: 267.88, Price: $230)
- [ ] beautyscene.net (DR: 28, Traffic: 762.12, Price: $110)
- [ ] designscene.net (DR: 67, Traffic: 13909.02, Price: $270)
- [ ] malemodelscene.net (DR: 55, Traffic: 2993.30, Price: $180)

**Offerings Section:**
- [ ] 4 offerings displayed with correct pricing
- [ ] Turnaround times shown
- [ ] Link types (guest_post/link_insertion)

### 3. Editing Capabilities ✅
Test ability to:
- [ ] Edit website details (categories, niches)
- [ ] Modify offering prices
- [ ] Update turnaround times
- [ ] Change content requirements
- [ ] Auto-save functionality works

### 4. Adding New Items ✅
- [ ] Add a 5th website successfully
- [ ] Add a new offering type
- [ ] Verify new items save correctly

### 5. Form Submission ✅
- [ ] Complete all onboarding steps
- [ ] Submit successfully
- [ ] No validation errors
- [ ] Redirect to dashboard

## Post-Test Database Verification

### Publisher Table Updates:
```sql
-- Expected changes:
-- account_status: shadow → active
-- password_hash: should be set
-- onboarding_completed_at: should be set
```

### Publisher Offering Relationships:
```sql
-- Expected:
-- verification_status: pending → verified (for claimed websites)
-- relationship_type: should remain 'owner'
```

### New Records Created:
- [ ] Any new websites added
- [ ] Any new offerings added
- [ ] Proper relationships established

## Automated Test Script
Will create Playwright test to verify all steps programmatically.

## Manual Test Results
Document actual results here...