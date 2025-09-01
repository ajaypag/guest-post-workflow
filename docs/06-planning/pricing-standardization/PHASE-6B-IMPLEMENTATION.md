# Phase 6B Implementation: Shadow Mode for Derived Pricing

**Date**: September 1, 2025  
**Status**: 🔄 **READY TO START**  
**Purpose**: Run derived pricing in parallel to validate accuracy before migration  
**Prerequisites**: ✅ Phase 6A complete (98.6% readiness achieved)

## Executive Summary

Phase 6B implements "shadow mode" where the derived guest_post_cost is calculated and stored alongside the current editable field. This allows us to:
1. Validate calculation accuracy in production
2. Monitor performance impact
3. Identify edge cases before full migration
4. Enable gradual rollout with feature flags

## Database Schema Changes

### 1. Add New Columns to Websites Table

```sql
-- Add derived pricing fields
ALTER TABLE websites 
ADD COLUMN derived_guest_post_cost INTEGER,
ADD COLUMN price_calculation_method VARCHAR(50) DEFAULT 'manual',
ADD COLUMN price_calculated_at TIMESTAMP,
ADD COLUMN price_override_offering_id UUID REFERENCES publisher_offerings(id),
ADD COLUMN price_override_reason TEXT;

-- Add index for performance
CREATE INDEX idx_websites_derived_cost ON websites(derived_guest_post_cost);
CREATE INDEX idx_websites_calculation_method ON websites(price_calculation_method);
```

### 2. Price Calculation Function

```sql
-- Function to calculate derived price for a website
CREATE OR REPLACE FUNCTION calculate_derived_guest_post_cost(website_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    derived_price INTEGER;
    override_offering_id UUID;
BEGIN
    -- Check if manual override exists
    SELECT price_override_offering_id INTO override_offering_id
    FROM websites 
    WHERE id = website_id_param;
    
    IF override_offering_id IS NOT NULL THEN
        -- Use manually selected offering
        SELECT po.base_price INTO derived_price
        FROM publisher_offerings po
        WHERE po.id = override_offering_id
          AND po.is_active = true
          AND po.offering_type = 'guest_post';
    ELSE
        -- Use minimum price from all guest_post offerings
        SELECT MIN(po.base_price) INTO derived_price
        FROM publisher_offering_relationships por
        JOIN publisher_offerings po ON por.offering_id = po.id
        WHERE por.website_id = website_id_param
          AND po.is_active = true
          AND po.offering_type = 'guest_post'
          AND po.base_price IS NOT NULL;
    END IF;
    
    RETURN derived_price;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Steps

### Step 1: Database Migration
**File**: `migrations/0083_add_derived_pricing_fields.sql`

```sql
-- Add derived pricing infrastructure
ALTER TABLE websites 
ADD COLUMN derived_guest_post_cost INTEGER,
ADD COLUMN price_calculation_method VARCHAR(50) DEFAULT 'manual',
ADD COLUMN price_calculated_at TIMESTAMP,
ADD COLUMN price_override_offering_id UUID REFERENCES publisher_offerings(id),
ADD COLUMN price_override_reason TEXT;

-- Indexes for performance
CREATE INDEX idx_websites_derived_cost ON websites(derived_guest_post_cost);
CREATE INDEX idx_websites_calculation_method ON websites(price_calculation_method);

-- Price calculation function
CREATE OR REPLACE FUNCTION calculate_derived_guest_post_cost(website_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    derived_price INTEGER;
    override_offering_id UUID;
BEGIN
    SELECT price_override_offering_id INTO override_offering_id
    FROM websites WHERE id = website_id_param;
    
    IF override_offering_id IS NOT NULL THEN
        SELECT po.base_price INTO derived_price
        FROM publisher_offerings po
        WHERE po.id = override_offering_id
          AND po.is_active = true
          AND po.offering_type = 'guest_post';
    ELSE
        SELECT MIN(po.base_price) INTO derived_price
        FROM publisher_offering_relationships por
        JOIN publisher_offerings po ON por.offering_id = po.id
        WHERE por.website_id = website_id_param
          AND po.is_active = true
          AND po.offering_type = 'guest_post'
          AND po.base_price IS NOT NULL;
    END IF;
    
    RETURN derived_price;
END;
$$ LANGUAGE plpgsql;

-- Populate initial derived prices
UPDATE websites 
SET 
    derived_guest_post_cost = calculate_derived_guest_post_cost(id),
    price_calculated_at = NOW(),
    price_calculation_method = 'auto_min'
WHERE guest_post_cost IS NOT NULL;
```

### Step 2: Service Layer Updates
**File**: `/lib/services/derivedPricingService.ts`

```typescript
export class DerivedPricingService {
  // Calculate derived price for a website
  static async calculateDerivedPrice(websiteId: string): Promise<number | null> {
    // Implementation matches SQL function logic
  }
  
  // Update derived price in database
  static async updateDerivedPrice(websiteId: string): Promise<void> {
    // Call SQL function and update timestamps
  }
  
  // Bulk update all derived prices
  static async updateAllDerivedPrices(): Promise<void> {
    // For scheduled jobs and maintenance
  }
  
  // Compare current vs derived pricing
  static async getPricingComparison(websiteId: string): Promise<PricingComparison> {
    // Used for validation and monitoring
  }
}
```

### Step 3: Monitoring Dashboard
**File**: `/app/admin/derived-pricing/page.tsx`

Features:
- Real-time comparison of current vs derived prices
- Performance metrics (calculation time, success rate)
- Discrepancy alerts and resolution tools
- Bulk update controls for maintenance

### Step 4: Feature Flag System
**File**: `/lib/config/featureFlags.ts`

```typescript
export const PRICING_FEATURE_FLAGS = {
  DERIVED_PRICING_ENABLED: process.env.DERIVED_PRICING_ENABLED === 'true',
  SHADOW_MODE_LOGGING: process.env.SHADOW_MODE_LOGGING === 'true',
  GRADUAL_ROLLOUT_PERCENTAGE: parseInt(process.env.GRADUAL_ROLLOUT_PERCENTAGE || '0'),
};
```

### Step 5: Automated Triggers
**Optional**: Database triggers to auto-update derived prices

```sql
-- Trigger to update derived price when offerings change
CREATE OR REPLACE FUNCTION update_derived_pricing_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update derived prices for affected websites
    UPDATE websites 
    SET 
        derived_guest_post_cost = calculate_derived_guest_post_cost(id),
        price_calculated_at = NOW()
    WHERE id IN (
        SELECT por.website_id 
        FROM publisher_offering_relationships por 
        WHERE por.offering_id = NEW.id 
           OR por.offering_id = OLD.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER publisher_offerings_pricing_update
    AFTER INSERT OR UPDATE OR DELETE ON publisher_offerings
    FOR EACH ROW EXECUTE FUNCTION update_derived_pricing_trigger();
```

## Testing Strategy

### 1. Accuracy Testing
- Compare derived vs current prices for all 941 websites
- Validate calculation logic matches business rules
- Test edge cases (no offerings, inactive offerings)

### 2. Performance Testing
- Measure query performance impact
- Test bulk calculation times
- Monitor database load during updates

### 3. Integration Testing
- Verify triggers work correctly
- Test service layer integration
- Validate admin dashboard functionality

## Rollout Plan

### Week 1: Infrastructure
- ✅ Database migration
- ✅ Service layer implementation
- ✅ Basic monitoring dashboard

### Week 2: Validation
- Run daily comparison reports
- Identify and fix any calculation discrepancies
- Performance optimization if needed

### Week 3: Gradual Enable
- Enable for internal users only
- Monitor for issues and edge cases
- Refine calculation logic if needed

### Week 4: Full Shadow Mode
- Enable derived pricing calculation for all websites
- 24/7 monitoring and alerting
- Prepare for Phase 6C migration

## Success Criteria

### Technical Metrics
- ✅ 100% calculation accuracy (matches expected business rules)
- ✅ <10ms performance impact on price queries
- ✅ Zero data consistency issues
- ✅ Clean rollback capability

### Business Metrics
- ✅ Customer pricing remains stable or improves
- ✅ Admin tools work seamlessly
- ✅ No service interruptions

## Risk Mitigation

### High Risk Items
1. **Performance Impact**: Continuous monitoring, query optimization
2. **Calculation Errors**: Extensive testing, comparison reports
3. **Data Inconsistency**: Atomic operations, transaction safety

### Rollback Strategy
- Feature flag to disable derived pricing instantly
- Database rollback script available
- Original guest_post_cost field remains unchanged
- Recovery time: <5 minutes

## Files to Create/Modify

### New Files
1. `migrations/0083_add_derived_pricing_fields.sql`
2. `lib/services/derivedPricingService.ts`
3. `app/admin/derived-pricing/page.tsx`
4. `lib/config/featureFlags.ts`
5. `scripts/populate-derived-prices.ts`
6. `scripts/validate-pricing-accuracy.ts`

### Modified Files
1. `lib/services/pricingService.ts` - Add derived price fallback
2. `app/api/admin/pricing-comparison/route.ts` - Include derived pricing data
3. Database schema files

## Next Phase
Phase 6C: Full migration to derived field (guest_post_cost becomes computed)

---

**Ready to proceed**: All prerequisites met, 98.6% data readiness achieved