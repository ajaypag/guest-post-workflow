# Niche Finder Refactor: Step-by-Step Implementation Tasks

## Methodology
Each step includes validation before moving to the next. If any validation fails, stop and fix before proceeding.

---

## Phase 1: Database Schema Updates

### Task 1.1: Check Current Database State
- [ ] Run SQL query to check if fields already exist in database:
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'websites' 
  AND column_name IN ('suggested_niches', 'suggested_categories', 'last_niche_check');
  ```
- [ ] Document which fields exist and which are missing

### Task 1.2: Update Website Schema File
- [ ] Open `/lib/db/websiteSchema.ts`
- [ ] Add missing fields after line 59:
  ```typescript
  suggestedNiches: text('suggested_niches').array(),
  suggestedCategories: text('suggested_categories').array(),
  lastNicheCheck: timestamp('last_niche_check'),
  ```
- [ ] Save file

### Task 1.3: Validate Schema Changes
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Verify no TypeScript errors related to websiteSchema
- [ ] If errors, fix them before proceeding

### Task 1.4: Create Migration File
- [ ] Check latest migration number in `/migrations/`
- [ ] Create new migration file with next number
- [ ] Add SQL for missing fields only (based on Task 1.1 findings)
- [ ] Save migration file

### Task 1.5: Run Migration
- [ ] Run migration against database
- [ ] Verify fields were added successfully
- [ ] Run query from Task 1.1 again to confirm

### Task 1.6: Test Build
- [ ] Run: `npm run build`
- [ ] Ensure build passes with new schema
- [ ] If build fails, fix issues before proceeding

---

## Phase 2: Create Utility Functions

### Task 2.1: Create O3 Response Parser Utility
- [ ] Create new file: `/lib/utils/o3ResponseParser.ts`
- [ ] Add basic structure with TypeScript types
- [ ] Copy extraction logic from `nicheAnalyzer.ts` (lines 116-299)
- [ ] Simplify into single function with clear priority order

### Task 2.2: Validate O3 Parser Utility
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Verify no TypeScript errors in new utility
- [ ] Create simple test to ensure it compiles

### Task 2.3: Check Niches Schema
- [ ] Check if `/lib/db/nichesSchema.ts` exists
- [ ] If exists, verify it has Drizzle schema (not just types)
- [ ] If not proper Drizzle schema, create it
- [ ] Add `niches` and `suggestedTags` table definitions

### Task 2.4: Validate Niches Schema
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Ensure no errors in nichesSchema
- [ ] Run build to verify: `npm run build`

---

## Phase 3: Refactor Analyze Route (Incremental)

### Task 3.1: Add Imports
- [ ] Open `/app/api/admin/niche-finder/analyze/route.ts`
- [ ] Add imports for Drizzle schema:
  ```typescript
  import { websites } from '@/lib/db/websiteSchema';
  import { niches, suggestedTags } from '@/lib/db/nichesSchema';
  import { eq, inArray, sql } from 'drizzle-orm';
  import { extractO3Output } from '@/lib/utils/o3ResponseParser';
  ```
- [ ] Save file

### Task 3.2: Validate Imports
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Fix any import errors before proceeding

### Task 3.3: Replace Website Query (Lines 25-32)
- [ ] Comment out old raw SQL query (keep as backup)
- [ ] Add new Drizzle query:
  ```typescript
  const websitesResult = await db
    .select({
      id: websites.id,
      domain: websites.domain
    })
    .from(websites)
    .where(inArray(websites.id, websiteIds));
  ```
- [ ] Update variable references from `websitesResult.rows` to `websitesResult`

### Task 3.4: Test Website Query
- [ ] Save file
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Test the endpoint with a single website ID
- [ ] Verify it retrieves the website correctly
- [ ] Check server logs for any errors

### Task 3.5: Remove Array Construction Logic
- [ ] Comment out lines 61-75 (manual array construction)
- [ ] Replace with simple JavaScript arrays:
  ```typescript
  const allNiches = [...analysis.niches];
  if (analysis.suggestedNewNiches?.length > 0) {
    allNiches.push(...analysis.suggestedNewNiches);
  }
  
  const allCategories = [...analysis.categories];
  if (analysis.suggestedNewCategories?.length > 0) {
    allCategories.push(...analysis.suggestedNewCategories);
  }
  ```

### Task 3.6: Validate Array Logic
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Ensure variables are properly typed

### Task 3.7: Replace Update Query (Lines 77-87)
- [ ] Comment out old raw SQL update (keep as backup)
- [ ] Add new Drizzle update:
  ```typescript
  await db
    .update(websites)
    .set({
      niche: allNiches,
      categories: allCategories,
      websiteType: analysis.websiteTypes,
      lastNicheCheck: new Date(),
      suggestedNiches: analysis.suggestedNewNiches || [],
      suggestedCategories: analysis.suggestedNewCategories || []
    })
    .where(eq(websites.id, website.id));
  ```

### Task 3.8: Test Update Query
- [ ] Save file
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Test with a single website
- [ ] Verify database update works
- [ ] Check that arrays are stored correctly in PostgreSQL

---

## Phase 4: Refactor Helper Functions

### Task 4.1: Refactor addNicheIfNotExists
- [ ] Comment out old function (lines 137-160)
- [ ] Add new Drizzle-based version
- [ ] Use proper Drizzle insert with onConflictDoNothing

### Task 4.2: Test addNicheIfNotExists
- [ ] Run TypeScript check
- [ ] Test with a new niche name
- [ ] Test with existing niche name
- [ ] Verify proper behavior in both cases

### Task 4.3: Refactor trackSuggestedTag
- [ ] Comment out old function (lines 162-208)
- [ ] Add new Drizzle-based version
- [ ] Use proper select, update, and insert operations

### Task 4.4: Test trackSuggestedTag
- [ ] Run TypeScript check
- [ ] Test with new tag
- [ ] Test with existing tag
- [ ] Verify count increments correctly

---

## Phase 5: Update Niche Analyzer

### Task 5.1: Simplify nicheAnalyzer.ts
- [ ] Open `/lib/services/nicheAnalyzer.ts`
- [ ] Import O3 response parser utility
- [ ] Replace lines 116-299 with utility call

### Task 5.2: Validate Niche Analyzer
- [ ] Run TypeScript check
- [ ] Ensure no errors in nicheAnalyzer

---

## Phase 6: Full Integration Testing

### Task 6.1: Build Test
- [ ] Run full build: `timeout 120 npm run build`
- [ ] Ensure no TypeScript errors
- [ ] Verify all pages compile

### Task 6.2: Manual Testing
- [ ] Start dev server
- [ ] Navigate to `/admin/niche-finder`
- [ ] Select a single test website
- [ ] Run analysis
- [ ] Check console logs for errors
- [ ] Verify database updates correctly

### Task 6.3: Test Edge Cases
- [ ] Test with website that has no niches
- [ ] Test with website that suggests new niches
- [ ] Test with special characters in niche names
- [ ] Test with empty response from O3

### Task 6.4: Database Verification
- [ ] Query database to verify:
  - [ ] Niches array is stored correctly
  - [ ] Categories array is stored correctly
  - [ ] Suggested niches are stored
  - [ ] Suggested categories are stored
  - [ ] last_niche_check timestamp is set
  - [ ] Niches table has new entries

---

## Phase 7: Cleanup

### Task 7.1: Remove Old Code
- [ ] After confirming everything works, remove commented old code
- [ ] Keep backup copy of old implementation

### Task 7.2: Final Build Check
- [ ] Run: `timeout 600 npm run build`
- [ ] Ensure extended build passes
- [ ] No TypeScript errors

### Task 7.3: Documentation
- [ ] Update any relevant documentation
- [ ] Add comments explaining Drizzle usage

---

## Validation Checkpoints

### After Each Phase:
1. ✅ TypeScript check passes: `npx tsc --noEmit`
2. ✅ Build succeeds: `npm run build`
3. ✅ No console errors in browser
4. ✅ Server logs show no SQL errors
5. ✅ Database updates correctly

### If Any Checkpoint Fails:
1. ⛔ STOP - Do not proceed to next task
2. 🔍 Debug the issue
3. 🔧 Fix the problem
4. ✅ Re-run validation
5. ➡️ Only then proceed

---

## Success Criteria
- [ ] All raw SQL replaced with Drizzle ORM
- [ ] TypeScript compilation passes
- [ ] Build completes without errors
- [ ] Niche finder analyzes websites successfully
- [ ] Database stores arrays correctly
- [ ] Suggested niches/categories are tracked
- [ ] No SQL syntax errors in logs

---

## Rollback Points
Each phase is a safe rollback point. If issues occur:
1. Revert changes from current phase only
2. Keep successful phases
3. Debug issue in isolation
4. Retry phase with fix