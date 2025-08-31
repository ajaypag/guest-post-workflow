# Publisher Offerings vs guest_post_cost Audit Results

**Audit Date**: 2025-08-31  
**Database**: guest-post-order-flow-db (port 5434)

## Summary

The audit reveals that **78.1% of websites with guest_post_cost have matching publisher offerings**, but there are significant gaps and mismatches that need to be addressed.

## Key Findings

### 📊 Overall Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total websites with guest_post_cost** | 940 | 100% |
| **Unique price points in websites** | 121 | - |
| **Total publisher offerings** | 747 | - |
| **Unique price points in offerings** | 111 | - |

### 🔍 Relationship Analysis

| Status | Count | Percentage | Impact |
|--------|-------|------------|--------|
| **Matching Offerings** | 734 | 78.1% | ✅ Working correctly |
| **Mismatched Offerings** | 99 | 10.5% | ⚠️ Wrong pricing will be shown |
| **No Offerings** | 107 | 11.4% | ❌ Can't create orders |

### 💰 Price Coverage by Popularity

| Website Price | Website Count | Matching Offerings | Coverage % |
|--------------|---------------|-------------------|------------|
| $100.00 | 140 | 119 | 85% |
| $150.00 | 98 | 74 | 76% |
| $50.00 | 73 | 59 | 81% |
| $200.00 | 67 | 54 | 81% |
| $250.00 | 47 | 40 | 85% |
| $120.00 | 46 | 35 | 76% |
| $80.00 | 31 | 23 | 74% |
| $125.00 | 28 | 24 | 86% |
| $60.00 | 27 | 16 | 59% |
| $40.00 | 25 | 14 | 56% |

## Critical Issues

### 1. Price Mismatches (99 websites - 10.5%)

Examples of serious mismatches:
- **realafrica.co.uk**: Website says $30, offering says $75 (150% higher!)
- **edtechrce.org**: Website says $45, offering says $120 (167% higher!)
- **disquantified.org**: Website says $40, offering says $90 (125% higher!)

**Impact**: Customers will be charged wrong amounts. Publisher expectations misaligned.

### 2. Missing Offerings (107 websites - 11.4%)

Websites with no publisher offerings at all:
- Cannot be included in orders
- No publisher to fulfill the work
- Pricing exists but unusable

**Examples**: truismfitness.com ($25), supermonitoring.com ($30), negup.com ($30)

### 3. Multiple Offerings Per Website (10+ websites)

Some websites have 2+ offerings from the same publisher:
- gossipsdiary.com: 2 offerings
- sampleboard.com: 2 offerings
- www.lilachbullock.com: 2 offerings

**Impact**: Confusion about which price to use

## Data Format Comparison

| Field | websites.guest_post_cost | publisher_offerings.base_price |
|-------|-------------------------|--------------------------------|
| **Type** | NUMERIC(10,2) | INTEGER |
| **Format** | Dollars (100.00) | Cents (10000) |
| **Example** | 100.00 | 10000 |
| **Conversion** | × 100 to get cents | ÷ 100 to get dollars |

## Migration Requirements

### Immediate Actions Needed

1. **Fix Mismatched Prices (99 websites)**
   - Update publisher offerings to match guest_post_cost
   - OR update guest_post_cost to match offerings
   - Decision needed: Which is source of truth?

2. **Create Missing Offerings (107 websites)**
   - Generate publisher offerings for websites without them
   - Use guest_post_cost as base_price (converted to cents)

3. **Resolve Duplicate Offerings (10+ websites)**
   - Keep only one offering per website
   - Archive or delete duplicates

### Long-term Migration Path

1. **Phase 1**: Ensure 100% coverage
   - Every website with guest_post_cost gets a matching offering
   - Fix all mismatches

2. **Phase 2**: Switch dependency
   - Update all code to use publisher_offerings.base_price
   - Stop using websites.guest_post_cost for new orders

3. **Phase 3**: Deprecate guest_post_cost
   - Mark field as deprecated
   - Eventually remove from database

## SQL Queries for Fixes

### Find all mismatches:
```sql
SELECT w.domain, w.guest_post_cost, po.base_price/100.0 as offering_price
FROM websites w
JOIN publisher_websites pw ON pw.website_id = w.id
JOIN publisher_offerings po ON po.publisher_id = pw.publisher_id
WHERE w.guest_post_cost IS NOT NULL
  AND po.base_price != (w.guest_post_cost * 100)::INTEGER;
```

### Find websites without offerings:
```sql
SELECT w.domain, w.guest_post_cost
FROM websites w
LEFT JOIN publisher_websites pw ON pw.website_id = w.id
WHERE w.guest_post_cost IS NOT NULL
  AND pw.id IS NULL;
```

### Create missing offerings:
```sql
-- Would need to be done programmatically with proper publisher assignment
INSERT INTO publisher_offerings (publisher_id, offering_name, base_price, ...)
SELECT ...
```

## Conclusion

**78.1% match rate is good but not production-ready**. The 21.9% of mismatches and missing offerings represent potential order failures and incorrect pricing. This needs to be fixed before migrating away from guest_post_cost.