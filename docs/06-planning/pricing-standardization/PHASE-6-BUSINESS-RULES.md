# Phase 6 Business Rules: Guest Post Cost as Derived Field

**Date**: September 1, 2025  
**Status**: Defined and Ready for Implementation

## Core Business Rules

### 1. Calculation Method
**Two Options**:
- **Automatic (Default)**: System selects the MINIMUM price from all eligible offerings
- **Manual Override**: Admin can manually select a specific offering for special cases

### 2. Offering Type Filter
**CRITICAL**: Only offerings with `offering_type = 'guest_post'` are considered

Other offering types are excluded:
- `link_insertion` - NOT included
- `homepage_link` - NOT included  
- `banner_ad` - NOT included
- `press_release` - NOT included
- `sponsored_post` - NOT included
- `niche_edit` - NOT included

### 3. Null Handling
**Rule**: If no guest_post offerings exist for a website, then `guest_post_cost` should be NULL
- No fallback to other offering types
- No default values
- Website simply cannot be sold for guest posts without a guest_post offering

### 4. Active Offerings Only
**Filters Applied**:
- `is_active = true` - Inactive offerings are ignored
- `base_price IS NOT NULL` - Null prices are ignored

### 5. Manual Override Mechanism

**Database Fields**:
```sql
price_override_offering_id UUID -- The manually selected offering
price_override_reason TEXT      -- Why the override was applied
price_calculation_method VARCHAR(50) -- 'auto_min' or 'manual_override'
```

**Override Flow**:
1. Admin selects specific offering from dropdown
2. System validates it's a guest_post offering
3. Override is recorded with reason
4. Price updates to that specific offering's price
5. Future automatic calculations skip this website

### 6. Price Selection Logic

```sql
-- Pseudocode for price selection
IF website.price_override_offering_id IS NOT NULL THEN
  -- Use manually selected offering
  price = SELECT base_price FROM publisher_offerings 
          WHERE id = price_override_offering_id
          AND offering_type = 'guest_post'
          AND is_active = true
ELSE
  -- Use minimum price from all guest_post offerings
  price = SELECT MIN(base_price) FROM publisher_offerings
          WHERE website_id matches
          AND offering_type = 'guest_post'
          AND is_active = true
          AND base_price IS NOT NULL
END IF

-- If no valid offering found
IF price IS NULL THEN
  guest_post_cost = NULL
END IF
```

### 7. Audit Trail

**Track for each price change**:
- `price_calculated_at` - When the price was determined
- `price_calculation_source` - Which offering was selected
- `price_calculation_method` - How it was selected (auto vs manual)
- History log of all changes

### 8. Multiple Publishers Scenario

When multiple publishers offer the same website:
- **Automatic Mode**: Customer gets the lowest price (best deal)
- **Manual Override**: Admin can select higher-priced offering if needed (e.g., preferred publisher relationship)

### 9. Price Update Triggers

**Automatic recalculation occurs when**:
- New guest_post offering added
- Existing guest_post offering price changes
- Guest_post offering activated/deactivated
- Publisher-website relationship changes

**Manual overrides are NOT affected by**:
- Automatic price changes
- New offerings being added
- Other offerings becoming cheaper

### 10. Migration Rules

**For existing data**:
- Websites with matching prices (927) → Automatic mode
- Websites with mismatches (13) → Review and set appropriate mode
- Websites with no offerings (1) → NULL until offering created

## Implementation Priority

1. **Phase 6A**: Build comparison tool to preview changes ✅ COMPLETE
2. **Phase 6B**: Add database fields and calculation logic
3. **Phase 6C**: Implement triggers and automation
4. **Phase 6D**: Add manual override UI for admins

## Edge Cases

1. **Offering becomes inactive**: Recalculate from remaining active offerings
2. **All offerings removed**: Set guest_post_cost to NULL
3. **Manual override offering deleted**: Revert to automatic calculation
4. **Price tie between offerings**: Select first by ID (deterministic)

## Future Considerations

As the system evolves, these rules may expand to include:
- Tier-based pricing (Bronze/Silver/Gold)
- Volume discounts
- Customer-specific pricing
- Time-based promotions

But the core principle remains: **Lowest guest_post price or manual override**.