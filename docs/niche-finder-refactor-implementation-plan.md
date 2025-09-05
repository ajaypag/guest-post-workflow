# Niche Finder Refactor Implementation Plan

## Overview
This document provides a step-by-step plan to refactor the niche-finder from using raw SQL string concatenation to proper Drizzle ORM operations, following the successful pattern used in the ManyReach import implementation.

## Current Problems

### 1. Raw SQL String Concatenation
**File:** `/app/api/admin/niche-finder/analyze/route.ts`
**Lines:** 77-87

**Current (BROKEN):**
```typescript
const updateQuery = sql.raw(`
  UPDATE websites
  SET 
    niche = ${nichesArray},
    categories = ${categoriesArray},
    website_type = ${websiteTypesArray},
    last_niche_check = NOW(),
    suggested_niches = ${suggestedNichesArray},
    suggested_categories = ${suggestedCategoriesArray}
  WHERE id = '${website.id}'
`);
```

### 2. Manual PostgreSQL Array Construction
**Lines:** 61-75

**Current (ERROR-PRONE):**
```typescript
const nichesArray = allNiches.length > 0 
  ? `ARRAY[${allNiches.map(n => `'${n.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
  : `'{}'::TEXT[]`;
```

### 3. O3 Response Parsing Complexity
**File:** `/lib/services/nicheAnalyzer.ts`
**Lines:** 116-299
- Checks multiple nested locations for response data
- No standardized extraction method
- Prone to missing data when O3 changes response structure

## Implementation Steps

### Step 1: Add Missing Fields to Website Schema
**File to modify:** `/lib/db/websiteSchema.ts`

**Add these fields to the `websites` table definition:**
```typescript
// After line 59 (internalNotes field)
suggestedNiches: text('suggested_niches').array(),
suggestedCategories: text('suggested_categories').array(), 
lastNicheCheck: timestamp('last_niche_check'),
```

**Create migration file:** `/migrations/00XX_add_niche_finder_fields.sql`
```sql
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS suggested_niches TEXT[],
ADD COLUMN IF NOT EXISTS suggested_categories TEXT[],
ADD COLUMN IF NOT EXISTS last_niche_check TIMESTAMP;
```

### Step 2: Create O3 Response Extraction Utility
**New file:** `/lib/utils/o3ResponseParser.ts`

```typescript
/**
 * Standardized O3 response extraction utility
 * Priority order:
 * 1. result.state._currentStep.output
 * 2. result.state.currentStep.output  
 * 3. result.output (if object with domain)
 * 4. result.state._modelResponses[0].output
 */
export function extractO3Output(result: any): any {
  // Implementation based on nicheAnalyzer.ts lines 116-299
  // but simplified and standardized
}
```

### Step 3: Refactor the Analyze Route
**File to modify:** `/app/api/admin/niche-finder/analyze/route.ts`

#### 3.1: Import Drizzle Schema
```typescript
import { websites } from '@/lib/db/websiteSchema';
import { eq, inArray } from 'drizzle-orm';
```

#### 3.2: Replace Website Query (Lines 25-32)
**Current:**
```typescript
const websitesQuery = sql.raw(`
  SELECT id, domain
  FROM websites
  WHERE id = ANY(ARRAY[${websiteIds.map(id => `'${id}'`).join(',')}]::uuid[])
`);
const websitesResult = await db.execute(websitesQuery);
```

**New:**
```typescript
const websitesResult = await db
  .select({
    id: websites.id,
    domain: websites.domain
  })
  .from(websites)
  .where(inArray(websites.id, websiteIds));
```

#### 3.3: Replace Update Query (Lines 77-87)
**Current:**
```typescript
const updateQuery = sql.raw(`
  UPDATE websites
  SET 
    niche = ${nichesArray},
    categories = ${categoriesArray},
    website_type = ${websiteTypesArray},
    last_niche_check = NOW(),
    suggested_niches = ${suggestedNichesArray},
    suggested_categories = ${suggestedCategoriesArray}
  WHERE id = '${website.id}'
`);
await db.execute(updateQuery);
```

**New:**
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

#### 3.4: Remove Manual Array Construction (Lines 61-75)
**Remove all of this:**
```typescript
const nichesArray = allNiches.length > 0 
  ? `ARRAY[${allNiches.map(n => `'${n.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
  : `'{}'::TEXT[]`;
// ... similar for other arrays
```

**Replace with simple JavaScript arrays:**
```typescript
// Combine existing niches with suggested new niches
const allNiches = [...analysis.niches];
if (analysis.suggestedNewNiches?.length > 0) {
  allNiches.push(...analysis.suggestedNewNiches);
}

// Combine existing categories with suggested new categories  
const allCategories = [...analysis.categories];
if (analysis.suggestedNewCategories?.length > 0) {
  allCategories.push(...analysis.suggestedNewCategories);
}
```

### Step 4: Create/Update Niches Table Schema
**Check if exists:** `/lib/db/nichesSchema.ts`

If it doesn't have proper Drizzle schema:
```typescript
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const niches = pgTable('niches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  source: varchar('source', { length: 50 }).default('o3_suggested'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const suggestedTags = pgTable('suggested_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  tagName: varchar('tag_name', { length: 255 }).notNull(),
  tagType: varchar('tag_type', { length: 20 }).notNull(), // 'niche' or 'category'
  websiteCount: integer('website_count').default(1),
  exampleWebsites: text('example_websites').array(),
  firstSuggestedAt: timestamp('first_suggested_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

### Step 5: Refactor Helper Functions

#### 5.1: addNicheIfNotExists (Lines 137-160)
**Current:**
```typescript
async function addNicheIfNotExists(nicheName: string) {
  const existingQuery = sql.raw(`
    SELECT id FROM niches WHERE LOWER(name) = LOWER('${nicheName.replace(/'/g, "''")}')
  `);
  // ...
  const insertQuery = sql.raw(`
    INSERT INTO niches (name, source, created_at, updated_at)
    VALUES ('${nicheName.replace(/'/g, "''")}', 'o3_suggested', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING
  `);
}
```

**New:**
```typescript
async function addNicheIfNotExists(nicheName: string) {
  // Check if exists
  const existing = await db
    .select()
    .from(niches)
    .where(eq(sql`LOWER(${niches.name})`, nicheName.toLowerCase()))
    .limit(1);
  
  if (existing.length === 0) {
    // Insert new niche
    await db
      .insert(niches)
      .values({
        name: nicheName,
        source: 'o3_suggested'
      })
      .onConflictDoNothing();
    
    console.log(`✅ Added new niche: ${nicheName}`);
  }
}
```

#### 5.2: trackSuggestedTag (Lines 162-208)
Similar refactor pattern - use Drizzle ORM instead of raw SQL.

### Step 6: Update nicheAnalyzer.ts
**File:** `/lib/services/nicheAnalyzer.ts`

1. Import the new O3 response parser utility
2. Replace lines 116-299 with a call to the utility
3. Add validation for the extracted data

```typescript
import { extractO3Output } from '@/lib/utils/o3ResponseParser';

// Replace complex parsing logic with:
const output = extractO3Output(result);

// Validate output
if (!output || !output.domain) {
  throw new Error(`Invalid O3 response for ${domain}`);
}

return output;
```

## Testing Plan

### 1. Unit Tests
- Test O3 response parser with various response formats
- Test array handling (empty arrays, special characters)
- Test database update operations

### 2. Integration Tests
- Select a test website
- Run the niche finder
- Verify database updates correctly
- Check suggested niches/categories are stored

### 3. Manual Testing Checklist
- [ ] Server starts without errors
- [ ] Niche finder page loads
- [ ] Can select websites
- [ ] Analysis runs without errors
- [ ] Database updates correctly
- [ ] Suggested niches appear in the table
- [ ] No SQL syntax errors in logs

## Rollback Plan
If issues occur after deployment:
1. Keep backup of current (broken) implementation
2. Test in development environment first
3. Have database backup before running in production
4. Monitor error logs closely after deployment

## Success Criteria
- No raw SQL string concatenation
- All database operations use Drizzle ORM
- O3 response parsing is standardized
- Arrays are handled properly (including empty arrays)
- No SQL syntax errors
- Suggested niches/categories are stored correctly

## Files to Modify
1. `/lib/db/websiteSchema.ts` - Add missing fields
2. `/lib/utils/o3ResponseParser.ts` - Create new utility (NEW FILE)
3. `/app/api/admin/niche-finder/analyze/route.ts` - Main refactor
4. `/lib/services/nicheAnalyzer.ts` - Simplify response parsing
5. `/lib/db/nichesSchema.ts` - Ensure proper schema exists
6. Create migration file for database changes

## Estimated Time
- Planning: ✅ Complete
- Implementation: 1-2 hours
- Testing: 30 minutes
- Total: 2-3 hours

## Risk Assessment
- **High Risk:** Breaking existing niche finder completely
  - Mitigation: Thorough testing, keep backup
- **Medium Risk:** Data loss in database
  - Mitigation: Use transactions, test on dev first
- **Low Risk:** Performance degradation
  - Mitigation: Drizzle ORM is typically faster than raw SQL

## Notes
- Follow ManyReach import pattern exactly
- Use Drizzle ORM for ALL database operations
- No raw SQL except for migrations
- Test with websites that have special characters in names
- Ensure empty arrays are handled properly