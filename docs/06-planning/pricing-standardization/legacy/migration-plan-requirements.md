# Pricing Migration Plan Requirements

## 📍 Quick Navigation
- **[Phase 0: Publisher Cleanup](#phase-0-publisher-data-cleanup--completed-2025-08-31)** ✅ DONE
- **[Phase 1: Data Reconciliation](#phase-1-data-reconciliation-week-1--next-priority)** ← CURRENT
- **[Phase 2: Cents Standardization](#phase-2-cents-standardization-week-2--critical-path)** 🆕 NEW
- **[Phase 3: Trigger System](#phase-3-database-trigger-system-week-3--simplified)**
- **[Phase 4: Service Fee Config](#phase-4-service-fee-configuration-week-4)**
- **[Implementation Guides](#related-documentation)**

## The Challenge (UPDATED 2025-08-31)

**Original Problem**: Mixed dollar/cents units causing bugs and confusion
- `guest_post_cost`: DECIMAL dollars ("150.00")
- `base_price`: INTEGER cents (15000)
- Service fee: Hardcoded in 50+ places

**New Architecture**: 
1. **Standardize on cents** - Convert guest_post_cost to INTEGER (117 files)
2. **Derived field with triggers** - Auto-calculate from publisher offerings
3. **Centralized config** - Single source for service fees

**Key Benefits**: 
- Eliminates unit conversion bugs
- Automatic price synchronization
- Future-proof calculation methods

## Type of Plan Needed

### 1. Data Reconciliation Plan ✅ COMPLETED
**Purpose**: Fix all data issues BEFORE implementing derived field logic

Completed Requirements:
- ✅ Created missing offerings for 226/244 websites (92.6% success rate)
- ✅ Fixed price mismatches using smart CSV priority logic
- ✅ Established clear decision matrix (CSV individual > CSV main > database)
- ✅ Validated publisher-offering relationships for 226 websites
- ✅ Built comprehensive admin panel with rollback capabilities

### 2. Abstraction Layer Plan
**Purpose**: Centralize pricing logic before migration

Requirements:
- Single pricing service that all code calls
- Handle format conversion (dollars ↔ cents) in ONE place
- Replace scattered conversion logic throughout 118+ files
- Ensure consistent rounding/precision rules

### 3. Incremental Migration Plan
**Purpose**: Switch from guest_post_cost to offerings gradually without breaking production

Requirements:
- Feature flag system to control which pricing source is used
- Ability to test with specific accounts/orders first
- Component-by-component migration strategy
- Parallel validation (compare both prices, alert on mismatch)

### 4. Testing Strategy Plan
**Purpose**: Ensure no pricing errors in production

Requirements:
- Unit tests for pricing conversions
- Integration tests for order flow
- Price comparison reports (old vs new)
- Test scenarios for edge cases:
  - Websites with no offerings
  - Mismatched prices
  - Null values
  - Extreme values (very high/low prices)

### 5. Rollout Plan
**Purpose**: Safe production deployment

Requirements:
- Phased rollout by component:
  - Phase 1: Read-only displays (website listings)
  - Phase 2: Pricing estimates
  - Phase 3: Order creation
  - Phase 4: Invoicing and payments
- Monitoring and alerting for price discrepancies
- Rollback procedure for each phase
- Customer communication if prices change

### 6. Code Migration Plan
**Purpose**: Update all 118+ files systematically

Requirements:
- Dependency graph (which files depend on which)
- Migration order (least risky → most critical)
- Code review checklist for each file
- Automated refactoring tools/scripts where possible

### 7. Database Migration Plan
**Purpose**: Eventually deprecate guest_post_cost field

Requirements:
- Timeline for deprecation (not immediate)
- Archive strategy for historical data
- Update all database views/functions
- Migration script with safety checks

## Critical Decisions Needed

### Format Standardization ✅ DECIDED
- **Decision**: Standardize on INTEGER cents as source of truth
- **Implementation**: 
  - `publisher_offerings.base_price`: INTEGER cents (e.g., 5000 = $50.00)
  - `websites.guest_post_cost`: REMAINS DECIMAL dollars for backward compatibility
  - Trigger converts: `guest_post_cost = base_price / 100.0`
  - NO CODE CHANGES NEEDED - trigger handles conversion automatically
- **Impact**: Eliminates cent/dollar confusion while maintaining compatibility

### Service Fee Architecture  
- **Question**: How to make the $79 fee configurable without hardcoding?
- **Options**:
  - Pricing rules table
  - Configuration in offerings
  - Separate fee structure table

### Source of Truth During Conflicts ✅ RESOLVED  
- **Decision**: `publisher_offerings.base_price` is always source of truth
- **Implementation**: `guest_post_cost` becomes calculated field using "Best Offer Algorithm"
- **Conflict Resolution**: No conflicts - derived field automatically updates from publisher data

### Calculation Method ⭐ FUTURE-PROOF DESIGN
- **Phase 1**: Simple minimum price - `guest_post_cost = MIN(publisher_offerings.base_price) / 100`
- **Future Options**: Flexible algorithm selection per website

**Algorithm Types:**
  - **`min_price`**: Use cheapest publisher (Phase 1 default)
  - **`preferred_publisher`**: Use specified publisher_id (reliability-based selection)  
  - **`quality_weighted`**: Price + success rate + response time weighting
  - **`manual_override`**: Admin-set price that ignores calculation
  - **`client_specific`**: Different algorithm per client/order type

**Enhanced Trigger Function (Future-Ready):**
```sql
CREATE OR REPLACE FUNCTION calculate_guest_post_cost_advanced()
RETURNS TRIGGER AS $$
DECLARE
  calculated_price DECIMAL(10,2);
  best_publisher_id UUID;
  calc_method VARCHAR(50);
BEGIN
  -- Get calculation method for this website (defaults to 'min_price')
  SELECT COALESCE(calculation_method, 'min_price') INTO calc_method 
  FROM websites WHERE id = NEW.website_id;

  CASE calc_method
    WHEN 'min_price' THEN
      -- Current Phase 1 logic: cheapest publisher
      SELECT MIN(po.base_price) / 100.0, p.id
      INTO calculated_price, best_publisher_id
      FROM publisher_offerings po
      JOIN publishers p ON po.publisher_id = p.id
      JOIN publisher_websites pw ON p.id = pw.publisher_id
      WHERE pw.website_id = NEW.website_id;
      
    WHEN 'preferred_publisher' THEN
      -- Use specific publisher_id stored in best_offer_publisher_id
      SELECT po.base_price / 100.0, p.id
      INTO calculated_price, best_publisher_id
      FROM publisher_offerings po
      JOIN publishers p ON po.publisher_id = p.id  
      JOIN publisher_websites pw ON p.id = pw.publisher_id
      WHERE pw.website_id = NEW.website_id 
        AND p.id = (SELECT best_offer_publisher_id FROM websites WHERE id = NEW.website_id);
      
    WHEN 'quality_weighted' THEN
      -- Future: Weight price by success rate, response time, etc.
      -- For now, fallback to min_price
      SELECT MIN(po.base_price) / 100.0, p.id
      INTO calculated_price, best_publisher_id
      FROM publisher_offerings po
      JOIN publishers p ON po.publisher_id = p.id
      JOIN publisher_websites pw ON p.id = pw.publisher_id  
      WHERE pw.website_id = NEW.website_id;
      
    WHEN 'manual_override' THEN
      -- Keep existing guest_post_cost, don't recalculate
      RETURN NEW;
      
    ELSE
      -- Default to min_price for unknown methods
      SELECT MIN(po.base_price) / 100.0, p.id
      INTO calculated_price, best_publisher_id
      FROM publisher_offerings po
      JOIN publishers p ON po.publisher_id = p.id
      JOIN publisher_websites pw ON p.id = pw.publisher_id
      WHERE pw.website_id = NEW.website_id;
  END CASE;

  -- Update website with calculated price
  UPDATE websites SET
    guest_post_cost = calculated_price,
    best_offer_publisher_id = best_publisher_id,
    price_calculated_at = NOW()
  WHERE id = NEW.website_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Admin Interface for Method Selection:**
- Website management page: dropdown to select calculation method
- Override specific publisher for `preferred_publisher` mode
- Manual price entry for `manual_override` mode
- Audit trail showing calculation history and method changes

**Benefits**: 
  - **Zero disruption**: All existing code continues working
  - **Future flexibility**: Can change algorithms without application code changes
  - **Per-website control**: Different strategies per site
  - **Audit trail**: Track which method and publisher was selected
  - **Gradual rollout**: Test new methods on specific websites first

### Historical Data
- **Question**: What happens to existing orders using guest_post_cost?
- **Options**:
  - Keep for historical records only
  - Migrate to point to offerings
  - Create immutable price snapshots

## Risk Mitigation Requirements

### Data Risks
- Price changes affecting existing quotes
- Lost pricing history
- Currency conversion errors

### Code Risks  
- Missed conversions causing 100x pricing errors
- Display inconsistencies (showing cents as dollars)
- Calculation differences from rounding

### Business Risks
- Customer confusion from price changes
- Publisher payment mismatches
- Lost revenue from pricing errors

## Success Criteria ⭐ UPDATED

The plan must ensure:
1. **Zero pricing errors in production**
2. **No customer-visible price changes** (unless algorithm determines better offer)
3. **All websites have calculated guest_post_cost** derived from publisher offerings
4. **Single source of truth**: All pricing flows from `publisher_offerings.base_price` 
5. **Standardized currency handling**: All internal calculations in cents
6. **Performance maintained**: Fast lookups via derived field caching
7. **Business intelligence added**: "Best offer" algorithm provides optimal pricing
8. **Audit trail**: Track which publisher/factors drive each calculated price

## Recommended Approach ⭐ COMPLETE ROADMAP

### Related Documentation
- **[Complete Cents Conversion Plan](./COMPLETE-CENTS-CONVERSION-PLAN.md)** - Line-by-line changes for all 117 files
- **[Guest Post Cost Files Audit](./guest-post-cost-files-audit.md)** - Complete file inventory
- **[Cents Migration Plan](./cents-migration-plan.md)** - Detailed cents standardization strategy

---

### Phase 0: Publisher Data Cleanup ✅ COMPLETED (2025-08-31)
- ✅ Built admin panel at `/admin/pricing-fixes`
- ✅ Fixed 226/244 problem websites (92.6% success rate)
- ✅ Implemented smart price source logic (CSV individual > main > database)
- ✅ Validated all prices using conservative approach
- ✅ Critical fixes: etruesports.com ($80→$50), luhhu.com ($100→$75)
- ✅ Created ~200 shadow publishers with proper email/price relationships
- ✅ Ready for production deployment with rollback plan

### Phase 1: Data Reconciliation (Week 1) 🔄 NEXT PRIORITY
- Fix remaining 98 price mismatches between guest_post_cost and offerings
- Validate all 940 websites have correct publisher offerings
- Create backup of current guest_post_cost values
- Document which prices are authoritative (offerings vs stored)
- Run final audit before trigger implementation

### Phase 2: Cents Standardization (Week 2) 🆕 CRITICAL PATH
**NEW INSIGHT**: Convert guest_post_cost from DECIMAL dollars to INTEGER cents
- **Impact**: 117 files need updates
- **Strategy**: Direct conversion, no parallel columns on staging
- **Benefits**: Eliminates float errors, matches publisher_offerings.base_price format
- **Implementation Guide**: [COMPLETE-CENTS-CONVERSION-PLAN.md](./COMPLETE-CENTS-CONVERSION-PLAN.md)

#### Execution Steps:
1. Create utility functions for conversion
2. Run database migration: `ALTER TABLE websites ALTER COLUMN guest_post_cost TYPE INTEGER USING (ROUND(guest_post_cost * 100)::INTEGER)`
3. Update Drizzle schema from `decimal` to `integer`
4. Update 25 API endpoints (remove parseFloat)
5. Update 15 UI components (add /100 for display)
6. Update 12 services (remove conversion logic)
7. Test all pricing calculations

### Phase 3: Database Trigger System (Week 3) ✅ SIMPLIFIED
**Note**: With cents standardization, triggers become much simpler!

1. **Add calculation metadata to websites table:**
   ```sql
   ALTER TABLE websites ADD COLUMN best_offer_publisher_id UUID;
   ALTER TABLE websites ADD COLUMN price_calculated_at TIMESTAMP;
   ALTER TABLE websites ADD COLUMN calculation_method VARCHAR(50) DEFAULT 'min_price';
   ```

2. **Create trigger function for automatic calculation:**
   ```sql
   CREATE OR REPLACE FUNCTION calculate_guest_post_cost()
   RETURNS TRIGGER AS $$
   DECLARE
     calculated_price DECIMAL(10,2);
     best_publisher_id UUID;
   BEGIN
     -- NOW BOTH IN CENTS - No conversion needed!
     SELECT 
       MIN(po.base_price),  -- Already in cents
       p.id
     INTO calculated_price, best_publisher_id
     FROM publisher_offerings po
     JOIN publishers p ON po.publisher_id = p.id
     JOIN publisher_websites pw ON p.id = pw.publisher_id
     WHERE pw.website_id = NEW.id
       AND po.base_price IS NOT NULL
       AND po.base_price > 0;
   
     -- Update calculated fields
     UPDATE websites SET
       guest_post_cost = calculated_price,
       best_offer_publisher_id = best_publisher_id,
       price_calculated_at = NOW(),
       calculation_method = 'min_price'
     WHERE id = NEW.id;
   
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   
   -- Trigger on publisher offerings changes
   CREATE TRIGGER update_website_pricing
     AFTER INSERT OR UPDATE OR DELETE ON publisher_offerings
     FOR EACH ROW EXECUTE FUNCTION recalculate_affected_website_prices();
   ```

3. **Initial calculation for all existing websites:**
   ```sql
   -- Populate all websites with calculated prices
   UPDATE websites SET guest_post_cost = calculated_price, 
                      best_offer_publisher_id = best_publisher,
                      price_calculated_at = NOW(),
                      calculation_method = 'min_price'
   FROM (
     SELECT DISTINCT w.id as website_id,
            MIN(po.base_price) / 100.0 as calculated_price,
            (SELECT p.id FROM publishers p 
             JOIN publisher_offerings po2 ON p.id = po2.publisher_id
             JOIN publisher_websites pw ON p.id = pw.publisher_id  
             WHERE pw.website_id = w.id AND po2.base_price = MIN(po.base_price)
             LIMIT 1) as best_publisher
     FROM websites w
     JOIN publisher_websites pw ON w.id = pw.website_id
     JOIN publishers p ON pw.publisher_id = p.id
     JOIN publisher_offerings po ON p.id = po.publisher_id
     WHERE po.base_price IS NOT NULL AND po.base_price > 0
     GROUP BY w.id
   ) calc WHERE websites.id = calc.website_id;
   ```

- **Result**: All existing code continues working unchanged

### Phase 4: Service Fee Configuration (Week 4)
- **Problem**: $79 service fee hardcoded in 50+ files
- **Impact**: Found in services, APIs, components, migrations
- **Solution**: Centralize to single config
- **Implementation Guide**: [Cents Migration Plan - Service Fee Section](./cents-migration-plan.md#phase-1-service-fee-centralization-week-1)

#### Tasks:
- Create `pricing_config` table for dynamic fees
- Replace 50+ instances of hardcoded 7900
- Update all services to import from central config
- Enable different fees per client/package type
- Test fee calculations across order flow

### Phase 5: Monitoring & Safety (Week 4)
- Create backup: `CREATE TABLE websites_pricing_backup AS SELECT id, guest_post_cost FROM websites`
- Implement trigger enable/disable mechanism
- Set up monitoring for price calculation errors
- Document rollback procedure (see [Complete Cents Conversion Plan](./COMPLETE-CENTS-CONVERSION-PLAN.md#rollback-plan))
- Test rollback in staging environment

### Phase 6: Historical Data & Orders (Week 5)
- Snapshot prices for existing orders (preserve history)
- Update order line items to store price at order time
- Ensure invoices reflect original prices
- Create audit trail for price changes
- Archive pre-migration pricing data

### Phase 7: Future Enhancements (Week 6+)
- Build UI for selecting calculation method per website
- Implement `preferred_publisher` selection logic
- Add quality scoring algorithm (success rate + response time)
- Create client-specific pricing rules
- A/B testing for pricing strategies
- Analytics dashboard for pricing optimization

## Next Steps

1. Get stakeholder approval on approach
2. Decide on critical questions above
3. Create detailed technical design
4. Build data cleanup scripts
5. Start Phase 0 execution

## ⚠️ CRITICAL: What Does NOT Change

### Zero Code Changes Required
- **guest_post_cost remains DECIMAL in dollars** - no application code updates needed
- All 88+ files using guest_post_cost continue working unchanged
- Frontend displays continue showing dollars
- API responses maintain same format
- Database queries work exactly the same

### The Magic: Triggers Handle Everything
- Triggers automatically convert cents to dollars
- guest_post_cost becomes READ-ONLY to applications
- Updates happen automatically when publisher prices change
- No performance impact - field is still indexed and queryable

### Why This Works
- Existing code: `SELECT guest_post_cost FROM websites WHERE guest_post_cost <= 100`
- Still works perfectly - trigger maintains the dollar value
- No JOINs needed in application queries
- Bulk-analysis filters work unchanged

## Estimation ⭐ UPDATED (2025-08-31)

### Timeline
- **Total effort**: 6-7 weeks 
- **Phase 0**: ✅ COMPLETED
- **Phase 1 (Reconciliation)**: 3-4 days
- **Phase 2 (Cents Conversion)**: 1-2 weeks 🆕 ADDED
- **Phase 3 (Triggers)**: 1 week (simplified due to cents)
- **Phase 4 (Service Fee)**: 1 week
- **Phase 5-7 (Safety/Future)**: 2-3 weeks

### Resources & Risk
- **Developer resources**: 1 full-time
- **Files to modify**: 117 (for cents conversion)
- **Risk level**: MEDIUM (many files, but straightforward changes)
- **Rollback capability**: Simple (database backup + git revert)

### Benefits Timeline
- **Week 1**: Price reconciliation complete
- **Week 2**: Cents standardization eliminates conversion bugs
- **Week 3**: Automatic price synchronization via triggers
- **Week 4**: Centralized service fee configuration
- **Week 6+**: Intelligent pricing strategies enabled