# Migration Plan: Standardize to Cents

**Status**: 🔴 CRITICAL - Mixed units causing potential pricing errors  
**Scope**: 118+ files affected  
**Recommendation**: YES - Migrate to cents for long-term maintainability

## Executive Summary

After comprehensive audit, I **strongly recommend** migrating `guest_post_cost` to cents because:
1. **50+ files** have hardcoded $79 service fees
2. **100+ files** handle guest_post_cost conversions
3. Mixed dollar/cent handling creates bug risks
4. Industry standard (Stripe, Square, etc.) uses cents

## Current State Analysis

### The Problem
```typescript
// Current mess - mixing units everywhere:
guest_post_cost: DECIMAL (dollars) - "150.00"
base_price: INTEGER (cents) - 15000
service_fee: INTEGER (cents) - 7900

// Leading to confusion:
const total = parseFloat(guestPostCost) + 79;  // dollars
const total = guestPostCost + 7900;  // WRONG! mixing units
```

### Hardcoded $79 Service Fee Locations (Sample)
```
✅ Good (uses config): 
- /lib/config/pricing.ts: SERVICE_FEE_CENTS = 7900

❌ Bad (hardcoded):
- 12+ API routes: const SERVICE_FEE_CENTS = 7900
- 6 DB migrations: DEFAULT 7900
- 15+ components: serviceFee: 7900
- 5 services: + 79 or + 7900
```

## Migration Strategy

### Option A: Minimal Change (Keep Dollars) ❌
- Keep guest_post_cost as DECIMAL dollars
- Fix only the service fee hardcoding
- **Pros**: Less work initially
- **Cons**: Perpetual conversion bugs, inconsistent with rest of system

### Option B: Full Standardization (Convert to Cents) ✅ RECOMMENDED
- Convert guest_post_cost to INTEGER cents
- Standardize all pricing to cents
- **Pros**: Consistency, no conversion bugs, industry standard
- **Cons**: More files to update (but one-time effort)

## Implementation Plan

### Phase 1: Service Fee Centralization (Week 1)
```typescript
// 1. Create pricing configuration
export const PRICING = {
  SERVICE_FEE_CENTS: 7900,
  // Future: client-specific fees
  getServiceFee: (clientId?: string) => {
    // Custom logic here
    return 7900;
  }
};

// 2. Update all 50+ files to import instead of hardcode
import { PRICING } from '@/lib/config/pricing';
const fee = PRICING.SERVICE_FEE_CENTS;
```

### Phase 2: Create Migration Utilities (Week 1)
```typescript
// lib/utils/pricing.ts
export const pricingUtils = {
  // Conversion helpers
  dollarsToCents: (dollars: number) => Math.round(dollars * 100),
  centsToDollars: (cents: number) => cents / 100,
  
  // Database helpers - handle string/number conversion
  parseGuestPostCost: (value: string | number | null) => {
    if (!value) return null;
    const dollars = typeof value === 'string' ? parseFloat(value) : value;
    return Math.round(dollars * 100); // Always return cents
  },
  
  // Display helpers
  formatCents: (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  }
};
```

### Phase 3: Database Migration (Week 2)

#### Step 1: Add new column
```sql
-- Add cents column alongside dollars (for transition period)
ALTER TABLE websites 
  ADD COLUMN guest_post_cost_cents INTEGER;

-- Populate with converted values
UPDATE websites 
  SET guest_post_cost_cents = ROUND(guest_post_cost * 100)
  WHERE guest_post_cost IS NOT NULL;
```

#### Step 2: Update application code
```typescript
// Before (dollars):
const price = parseFloat(website.guestPostCost);

// After (cents):
const price = website.guestPostCostCents;
```

#### Step 3: Drop old column (after verification)
```sql
-- After all code updated and tested
ALTER TABLE websites 
  DROP COLUMN guest_post_cost;
ALTER TABLE websites 
  RENAME COLUMN guest_post_cost_cents TO guest_post_cost;
```

### Phase 4: Update All Components (Week 2-3)

#### API Updates
```typescript
// Before:
guestPostCost: website.guestPostCost ? parseFloat(website.guestPostCost) : null

// After:
guestPostCost: website.guestPostCost // Already in cents
```

#### Display Updates
```typescript
// Before:
<span>${website.guestPostCost}</span>

// After:
<span>{formatCents(website.guestPostCost)}</span>
```

## File Impact Analysis

### High Priority (Core Business Logic) - 25 files
- `/lib/services/pricingService.ts`
- `/lib/services/enhancedOrderPricingService.ts`
- `/lib/services/airtableSyncService.ts`
- `/app/api/websites/search/route.ts`
- `/app/api/orders/*/route.ts` (multiple)

### Medium Priority (Display/UI) - 40 files
- Components displaying prices
- Admin panels
- Public pages

### Low Priority (Can wait) - 53 files
- Test files
- Migration scripts
- Documentation

## Testing Strategy

### 1. Create Test Suite
```typescript
describe('Pricing Migration', () => {
  it('should handle cents correctly', () => {
    expect(pricingUtils.dollarsToCents(150.00)).toBe(15000);
    expect(pricingUtils.centsToDollars(15000)).toBe(150.00);
  });
  
  it('should format for display', () => {
    expect(pricingUtils.formatCents(15000)).toBe('$150.00');
  });
});
```

### 2. Parallel Running
- Run both dollar and cent calculations in parallel
- Log discrepancies for investigation
- Ensure both produce same results

### 3. Gradual Rollout
- Start with read-only operations
- Move to write operations
- Finally update critical paths

## Risk Mitigation

### Backup Strategy
```sql
-- Before migration
CREATE TABLE websites_pricing_backup AS 
  SELECT id, guest_post_cost, updated_at 
  FROM websites;
```

### Rollback Plan
```sql
-- If issues arise
UPDATE websites w
  SET guest_post_cost = b.guest_post_cost
  FROM websites_pricing_backup b
  WHERE w.id = b.id;
```

### Monitoring
- Add logging for all price calculations
- Alert on unusual values (negative, > $10000, etc.)
- Track conversion accuracy

## Benefits After Migration

### Immediate
- ✅ No more dollar/cent confusion
- ✅ Consistent with publisher_offerings.base_price
- ✅ Eliminate conversion bugs
- ✅ Centralized service fee configuration

### Long-term
- ✅ Easy to add tiered pricing
- ✅ Support for international currencies
- ✅ Better precision (no float rounding issues)
- ✅ Industry standard alignment

## Decision Matrix

| Factor | Keep Dollars | **Convert to Cents** |
|--------|--------------|---------------------|
| Work Required | Low | High (one-time) |
| Bug Risk | High (ongoing) | **Low** |
| Maintenance | Hard | **Easy** |
| Industry Standard | No | **Yes** |
| Future Flexibility | Limited | **High** |
| Team Confusion | High | **Low** |

## Recommendation

**PROCEED with cents standardization** because:

1. **One-time pain, long-term gain** - Yes, 118 files need updates, but then it's done forever
2. **Eliminates entire class of bugs** - No more unit mixing errors
3. **Industry alignment** - Every payment system uses cents
4. **Cleaner code** - No parseFloat() everywhere
5. **Better for triggers** - Your derived field approach works better with consistent units

## Next Steps

1. **Week 1**: Centralize service fee (fix 50+ hardcoded values)
2. **Week 2**: Add guest_post_cost_cents column, create utilities
3. **Week 3**: Update high-priority files
4. **Week 4**: Complete migration, remove old column

The effort is significant but the long-term benefits far outweigh the short-term pain.