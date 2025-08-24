# E2E Test Problems to Fix

## Current Test Status: 7/9 PASSING - 2 FAILURES

## FIXED PROBLEMS ✅

### 1. Shadow Data Migration Skipping (FIXED)
- Changed skip logic to update existing relationships
- Now successfully creates relationships: "Migration completed: 4 websites, 4 offerings, 4 relationships"

### 2. Offering Creation in Migration (FIXED)  
- Fixed offering creation logic
- Removed incorrect websiteId field reference
- Added proper offering names and attributes
- Creates 4 offerings successfully

### 3. Reset Utilities Created (FIXED)
- Created `/api/test/clear-relationships` - clears all relationships/offerings
- Created `/api/test/reset-shadow-migration` - resets migration status
- Created `/api/test/reset-publisher-claim` - resets publisher to shadow

### 4. UI Display Issue - All 4 Websites Now Showing (FIXED)
- Fixed by properly scrolling in the test to see all content
- All 4 websites correctly displayed after migration
- Test now properly detects all 4 domains

### 5. Multi-Step Form Navigation (FIXED)
- Onboarding is a multi-step form with separate pages for Websites/Offerings/Payment/Review
- Updated test to click "Next" button to navigate between steps
- Offerings are on step 2, accessed after completing website configuration

### 6. Offerings UI Improvement (FIXED)
- Added website selector dropdown to each offering
- Now clearly shows which website each offering belongs to
- Prevents confusion about offering-website associations

## REMAINING PROBLEMS:

### 7. Offerings Detection in Test
**Problem**: Test finds offering indicators but reports 0 offerings
**Status**: Offerings exist on page but counting logic needs refinement
**Fix Required**: Better offering element detection in the test

### 8. Edit Button Detection
**Problem**: Edit buttons not being detected properly
**Status**: Add button found (1), but edit buttons not detected
**Fix Required**: Check actual button implementation in UI

## Migration Success Evidence:
```
Starting shadow data migration for publisher: c7cb27d3-4343-422d-9cf7-754dfcdfee56
Found 4 shadow websites to migrate
Migration completed: 4 websites, 4 offerings, 4 relationships
Shadow data migration successful: 4 websites, 4 offerings
```

## Next Steps:
1. Debug onboarding-data API response format
2. Check UI component rendering logic
3. Fix button display conditions
4. Run final test