# Pricing System Migration - Final Implementation Guide

## Priority Order
1. **Fix hardcoded service fees** (49 files) - Quick win, 2 days
2. **Extend PricingService** - Add dynamic fee methods, 2 days  
3. **Convert to cents** (117 files) - Eliminate bugs, 1 week
4. **Add triggers** - Automated pricing, 3 days

## Current State
- `guest_post_cost`: DECIMAL storing dollars ("150.00")
- `publisher_offerings.base_price`: INTEGER storing cents (15000)
- Service fee: Hardcoded as 7900 in 49+ files (config exists but unused!)
- **PricingService**: Basic functionality, needs extension
- **PRICING_CONFIG**: Already exists with SERVICE_FEE_CENTS
- **Problem**: Mixed units causing bugs, hardcoded fees, no flexibility

## Migration Steps

### Step 1: Data Reconciliation
Fix 98 websites with price mismatches between guest_post_cost and publisher offerings.
Use admin panel at `/admin/pricing-fixes` to reconcile.

### Step 2: Convert guest_post_cost to Cents
**Database Migration:**
```sql
ALTER TABLE websites 
ALTER COLUMN guest_post_cost TYPE INTEGER 
USING (ROUND(guest_post_cost * 100)::INTEGER);
```

**Schema Update:**
```typescript
// lib/db/websiteSchema.ts - Line 15
// CHANGE FROM: decimal('guest_post_cost', { precision: 10, scale: 2 })
// CHANGE TO:
guestPostCost: integer('guest_post_cost'),
```

### Step 3: Update 117 Files

**Pattern 1 - API Returns (25 files):**
```typescript
// BEFORE: guestPostCost: w.guest_post_cost ? parseFloat(w.guest_post_cost) : null
// AFTER:
guestPostCost: w.guest_post_cost || null
```

**Pattern 2 - UI Display (15 files):**
```typescript
// BEFORE: ${website.guestPostCost}
// AFTER:
${(website.guestPostCost / 100).toFixed(2)}
```

**Pattern 3 - Service Calculations (12 files):**
```typescript
// BEFORE: const price = parseFloat(website.guestPostCost) * 100
// AFTER:
const price = website.guestPostCost  // Already in cents
```

**Pattern 4 - User Input Filters:**
```typescript
// User enters dollars, convert to cents for comparison
onChange={(e) => setFilters({
  maxCost: e.target.value ? parseInt(e.target.value) * 100 : undefined
})}
```

### Step 4: Add Utility Functions
Create `/lib/utils/pricing.ts`:
```typescript
export function centsToDisplay(cents: number | null): string {
  if (!cents) return '-';
  return `$${(cents / 100).toFixed(2)}`;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
```

### Step 5: Extend Pricing Service Architecture

#### Current State
- **PricingService** exists with basic functionality
- **PRICING_CONFIG** exists with SERVICE_FEE_CENTS = 7900
- **Problem**: 49 files hardcode 7900 instead of using config
- **pricingRules** table already supports client-specific discounts

#### Phase 1: Fix Hardcoded Service Fees (49 files)
```typescript
// Find all files with: const SERVICE_FEE_CENTS = 7900
// Replace with:
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

// Fix pricingService.ts line 68
// BEFORE: const retailPrice = wholesalePrice + 79;
// AFTER:
const retailPrice = wholesalePrice + (SERVICE_FEE_CENTS / 100);
```

#### Phase 2: Extend PricingService with Dynamic Fees
```typescript
// lib/services/pricingService.ts - Add method
static async getServiceFee(options?: {
  clientId?: string;
  orderType?: string;
  quantity?: number;
}): Promise<number> {
  // Check for client-specific fee in pricingRules
  if (options?.clientId) {
    const rule = await db.query.pricingRules.findFirst({
      where: eq(pricingRules.clientId, options.clientId)
    });
    if (rule?.serviceFee) return rule.serviceFee;
  }
  
  // Default to standard fee
  return SERVICE_FEE_CENTS;
}
```

#### Phase 3: Database Extension for Dynamic Pricing
```sql
-- Add service fee override to existing pricingRules table
ALTER TABLE pricing_rules 
ADD COLUMN service_fee_cents INTEGER,
ADD COLUMN fee_type VARCHAR(50); -- 'fixed', 'percentage', 'tiered'

-- Example: Enterprise client gets $59 service fee
INSERT INTO pricing_rules (client_id, service_fee_cents) 
VALUES ('enterprise-client-uuid', 5900);
```

#### Phase 4: Evolve PRICING_CONFIG
```typescript
// lib/config/pricing.ts - Extend with methods
export const PRICING_CONFIG = {
  serviceFee: {
    standard: 7900,
    // Remove legacy package tiers
  },
  
  // Add dynamic calculation
  calculateTotalPrice: async (
    wholesalePrice: number,
    clientId?: string
  ) => {
    const serviceFee = await PricingService.getServiceFee({ clientId });
    return wholesalePrice + serviceFee;
  }
};
```

### Step 6: Add Database Triggers
```sql
CREATE OR REPLACE FUNCTION calculate_guest_post_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE websites 
  SET guest_post_cost = (
    SELECT MIN(po.base_price)
    FROM publisher_offerings po
    JOIN publishers p ON po.publisher_id = p.id
    JOIN publisher_websites pw ON p.id = pw.publisher_id
    WHERE pw.website_id = NEW.website_id
  )
  WHERE id = NEW.website_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_website_pricing
AFTER INSERT OR UPDATE OR DELETE ON publisher_offerings
FOR EACH ROW EXECUTE FUNCTION calculate_guest_post_cost();
```

## Key Files to Update

### APIs (Must Update First)
- `/app/api/websites/search/route.ts` - Line 49
- `/app/api/orders/[id]/groups/[groupId]/site-selections/route.ts` - Lines 95, 158, 318
- `/app/api/websites/cost/route.ts` - Line 48

### Services (Update Second)
- `/lib/services/pricingService.ts` - Line 66
- `/lib/services/enhancedOrderPricingService.ts` - Lines 120-123
- `/lib/services/airtableSyncService.ts` - Line 138 (convert Airtable dollars to cents)

### UI Components (Update Last)
- `/components/bulk-analysis/InlineDatabaseSelector.tsx` - Lines 326, 535
- `/components/websites/WebsiteDetailModal.tsx` - Lines 254, 378
- `/components/internal/WebsiteEditForm.tsx` - Input/output conversion

## Testing Checklist
- [ ] Database migration converts correctly (150.00 → 15000)
- [ ] APIs return cents as integers
- [ ] UI displays dollars with proper formatting
- [ ] Filters work with dollar input
- [ ] Airtable sync converts dollars to cents
- [ ] Pricing calculations are accurate
- [ ] Service fee applies correctly

## Rollback Plan
```sql
-- If issues arise
ALTER TABLE websites 
ALTER COLUMN guest_post_cost TYPE DECIMAL(10,2) 
USING (guest_post_cost::DECIMAL / 100);
```

## Timeline

### Week 1: Foundation
- Day 1-2: Fix 49 hardcoded service fees (import from config)
- Day 3: Data reconciliation (98 price mismatches)
- Day 4-5: Start cents conversion (database + schema)

### Week 2: Core Migration
- Day 1-3: Update 117 files for cents standardization
- Day 4-5: Extend PricingService with dynamic fees
- Database migration for service_fee_cents in pricingRules

### Week 3: Advanced Features
- Implement database triggers for derived pricing
- Add getServiceFee() method with client overrides
- Testing and monitoring
- Rollback procedures

## Benefits After Migration

### Immediate
- ✅ No more hardcoded $79 fees
- ✅ Cents standardization eliminates conversion bugs
- ✅ Client-specific service fees possible

### Future Capabilities
- Dynamic pricing per client/order type
- A/B testing different service fees
- Automated price synchronization via triggers
- Margin optimization