# COMPLETE CENTS CONVERSION PLAN
## 117 Files - Line-by-Line Changes Required

**Database Change**: `guest_post_cost DECIMAL(10,2)` → `guest_post_cost INTEGER`  
**Data Conversion**: `150.00` (dollars) → `15000` (cents)

---

## STEP 1: DATABASE MIGRATION

```sql
-- Migration file: convert_guest_post_cost_to_cents.sql
BEGIN;

-- Step 1: Alter column type and convert data
ALTER TABLE websites 
ALTER COLUMN guest_post_cost TYPE INTEGER 
USING (ROUND(guest_post_cost * 100)::INTEGER);

-- Step 2: Update any NULL or 0 values if needed
UPDATE websites SET guest_post_cost = NULL WHERE guest_post_cost = 0;

COMMIT;
```

---

## STEP 2: UPDATE DRIZZLE SCHEMA

### File: `/lib/db/websiteSchema.ts`
**Line 15 - CHANGE:**
```typescript
// BEFORE
guestPostCost: decimal('guest_post_cost', { precision: 10, scale: 2 }),

// AFTER
guestPostCost: integer('guest_post_cost'),
```

---

## STEP 3: API ENDPOINTS (25 files)

### 1. `/app/api/websites/search/route.ts`
**Line 49 - CHANGE:**
```typescript
// BEFORE
guestPostCost: w.guest_post_cost ? parseFloat(w.guest_post_cost) : null,

// AFTER
guestPostCost: w.guest_post_cost || null,
```

### 2. `/app/api/websites/cost/route.ts`
**Line 48 - NO CHANGE NEEDED**
```typescript
guestPostCost: website[0].guestPostCost,  // Already returns raw value
```

### 3. `/app/api/orders/estimate-pricing/route.ts`
**Lines - ANALYZE FOR CHANGES:**
```typescript
// Check if it's doing conversions - likely needs updates for cent comparisons
```

### 4. `/app/api/orders/[id]/groups/[groupId]/site-selections/route.ts`
**Line 95, 158 - CHANGE:**
```typescript
// BEFORE
const guestPostCost = website?.guestPostCost ? parseFloat(website.guestPostCost) : null;

// AFTER
const guestPostCost = website?.guestPostCost || null;
```

**Line 318 - CHANGE:**
```typescript
// BEFORE
const wholesaleCents = row.guest_post_cost 
  ? Math.round(parseFloat(row.guest_post_cost) * 100)
  : 20000;

// AFTER
const wholesaleCents = row.guest_post_cost || 20000;
```

### 5. `/app/api/contacts/search/route.ts` & `/app/api/contacts/export/route.ts`
**Filter parameters - CHANGE:**
```typescript
// BEFORE (expecting dollars)
if (filters.minCost !== undefined) {
  query += ` AND wc.guest_post_cost >= $${paramIndex}`;
  params.push(filters.minCost);
}

// AFTER (expecting cents from frontend)
if (filters.minCost !== undefined) {
  query += ` AND wc.guest_post_cost >= $${paramIndex}`;
  params.push(filters.minCost * 100);  // Convert input to cents
}
```

---

## STEP 4: UI COMPONENTS (15 files)

### 1. `/components/bulk-analysis/InlineDatabaseSelector.tsx`
**Line 535 - CHANGE:**
```typescript
// BEFORE
${website.guestPostCost}

// AFTER
${(website.guestPostCost / 100).toFixed(2)}
```

**Line 326 - CHANGE (Filter Input):**
```typescript
// BEFORE
onChange={(e) => setFilters(prev => ({ 
  ...prev, 
  maxCost: e.target.value ? parseInt(e.target.value) : undefined 
}))}

// AFTER
onChange={(e) => setFilters(prev => ({ 
  ...prev, 
  maxCost: e.target.value ? parseInt(e.target.value) * 100 : undefined  // Convert to cents
}))}
```

### 2. `/components/websites/WebsiteDetailModal.tsx`
**Line 254 - CHANGE:**
```typescript
// BEFORE
{website.guestPostCost ? `$${website.guestPostCost}` : '-'}

// AFTER
{website.guestPostCost ? `$${(website.guestPostCost / 100).toFixed(2)}` : '-'}
```

**Line 378 - CHANGE:**
```typescript
// BEFORE
Guest Post Cost: <span className="font-medium">${contact.guestPostCost}</span>

// AFTER
Guest Post Cost: <span className="font-medium">${(contact.guestPostCost / 100).toFixed(2)}</span>
```

### 3. `/components/ui/WebsiteSelector.tsx`
**Display changes needed - ADD cents conversion**

### 4. `/components/internal/InternalWebsitesList.tsx`
**Display changes needed - ADD cents conversion**

### 5. `/components/internal/WebsiteEditForm.tsx`
**Input/Output - CHANGE:**
```typescript
// Input: User enters dollars, convert to cents on save
// Display: Show cents as dollars
value={website.guestPostCost ? (website.guestPostCost / 100).toFixed(2) : ''}
onChange={(e) => setWebsite({...website, guestPostCost: Math.round(parseFloat(e.target.value) * 100)})}
```

---

## STEP 5: SERVICES (12 files)

### 1. `/lib/services/pricingService.ts`
**Line 66 - CHANGE:**
```typescript
// BEFORE
const wholesalePrice = website.guestPostCost ? parseFloat(website.guestPostCost) : 0;

// AFTER
const wholesalePrice = (website.guestPostCost || 0) / 100;  // Convert cents to dollars for calculation
```

### 2. `/lib/services/enhancedOrderPricingService.ts`
**Line 120-123 - CHANGE:**
```typescript
// BEFORE
const legacyPrice = website.guestPostCost ? parseFloat(website.guestPostCost) : 0;
const wholesalePriceInCents = Math.floor(legacyPrice * 100);

// AFTER
const legacyPriceInCents = website.guestPostCost || 0;
const wholesalePriceInCents = legacyPriceInCents;
```

### 3. `/lib/services/airtableSyncService.ts`
**Line 138 - CHANGE (Import from Airtable):**
```typescript
// BEFORE
guestPostCost: record.fields['Guest Post Cost'],

// AFTER
guestPostCost: record.fields['Guest Post Cost'] 
  ? Math.round(parseFloat(record.fields['Guest Post Cost']) * 100) 
  : null,  // Convert Airtable dollars to cents
```

**Lines 242-248 - NO CHANGE (filters already expect correct values)**

### 4. `/lib/services/shadowPublisherMigrationService.ts`
**Migration logic - CHANGE:**
```typescript
// BEFORE
const priceInCents = parseInt(parseFloat(shadowRow.guest_post_cost) * 100);

// AFTER
const priceInCents = shadowRow.guest_post_cost;  // Already in cents
```

---

## STEP 6: PAGES (10 files)

### 1. `/app/guest-posting-sites/[niche]/page.tsx`
**SQL query and display - CHANGE:**
```typescript
// SQL returns cents, display needs conversion
${(website.guestPostCost / 100).toFixed(2)}
```

### 2. `/app/admin/pricing-fixes/page.tsx`
**All price displays - ADD cents conversion**

### 3. `/app/vetted-sites/page.tsx`
**Price displays - ADD cents conversion**

---

## STEP 7: SCRIPTS (50+ files)

Most scripts are one-time use or testing. Key ones to update:

### 1. `/scripts/stress-test-derived-field.ts`
**Update test expectations for cents**

### 2. `/scripts/migrate-websites-to-publishers.ts`
**Update migration logic for cents**

---

## STEP 8: UTILITY FUNCTIONS TO ADD

### Create: `/lib/utils/pricing.ts`
```typescript
/**
 * Utility functions for handling price conversions
 */

export function centsToDisplay(cents: number | null | undefined): string {
  if (!cents) return '-';
  return `$${(cents / 100).toFixed(2)}`;
}

export function dollarsToCents(dollars: number | string): number {
  const amount = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  return Math.round(amount * 100);
}

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

// For form inputs where user types dollars
export function handleDollarInput(value: string): number {
  const dollars = parseFloat(value.replace(/[^0-9.]/g, ''));
  return isNaN(dollars) ? 0 : Math.round(dollars * 100);
}
```

---

## TESTING CHECKLIST

### 1. Database Migration
- [ ] Backup database before migration
- [ ] Run migration on test data
- [ ] Verify all values converted correctly (150.00 → 15000)

### 2. API Responses
- [ ] `/api/websites/search` returns cents
- [ ] `/api/websites/cost` returns cents
- [ ] Order APIs calculate correctly

### 3. UI Display
- [ ] InlineDatabaseSelector shows dollars correctly
- [ ] WebsiteDetailModal shows dollars correctly
- [ ] Filter inputs work with dollar amounts

### 4. Calculations
- [ ] Pricing service calculates correctly
- [ ] Order totals are accurate
- [ ] Service fees apply correctly

### 5. Data Import
- [ ] Airtable sync converts dollars to cents
- [ ] CSV imports handle conversion

---

## ROLLBACK PLAN

If issues arise:

```sql
-- Rollback migration
ALTER TABLE websites 
ALTER COLUMN guest_post_cost TYPE DECIMAL(10,2) 
USING (guest_post_cost::DECIMAL / 100);
```

Then revert code changes via git.

---

## EXECUTION ORDER

1. **First**: Update utility functions
2. **Second**: Migrate database
3. **Third**: Update schema file
4. **Fourth**: Update services (backend logic)
5. **Fifth**: Update APIs
6. **Sixth**: Update UI components
7. **Last**: Update scripts/tests

This ensures backend is ready before frontend starts sending cents.