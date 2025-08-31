# Pricing Standardization Research Summary

**Research Date**: August 31, 2025  
**Current State**: Production system using mixed pricing sources  
**Goal**: Migrate from `guest_post_cost` field to `publisher_offerings` as single source of truth

## Current Pricing System Overview

The system currently has two parallel pricing mechanisms:

1. **Legacy**: `websites.guest_post_cost` field (NUMERIC 10,2 - stored as dollars)
2. **New**: `publisher_offerings.base_price` field (INTEGER - stored as cents)

Both are actively used in production with a hardcoded $79 service fee applied throughout.

**Full audit details**: [pricing-audit.md](./pricing-audit.md)

## Codebase Impact Analysis

### Scope of Dependencies

- **118+ unique files** contain pricing-related logic
- **33 files** directly reference `guest_post_cost` (snake_case database field)
- **69 files** reference `guestPostCost` (camelCase in TypeScript/APIs)
- **15+ locations** have hardcoded 7900 (cents) service fee

### Critical Service Dependencies

The following core services directly depend on `guest_post_cost`:
- `pricingService.ts` - Core pricing calculations
- `enhancedOrderPricingService.ts` - Order pricing with publisher offering fallback
- `/api/orders/estimate-pricing/route.ts` - Customer pricing estimates
- `airtableSyncService.ts` - External data synchronization

**Complete file listing**: [all-guest-post-cost-files.md](./all-guest-post-cost-files.md)  
**Detailed dependency analysis**: [guest-post-cost-dependencies.md](./guest-post-cost-dependencies.md)

## Database Structure Research

### Table Relationships

The system uses a connected series of tables:

1. **websites** (960 total records)
   - Contains `guest_post_cost` field
   - 940 websites have pricing data
   - Central table that everything references

2. **publisher_websites** (junction table)
   - Links websites to publishers
   - 852 total connections
   - 833 unique websites connected

3. **publishers** (742 records)
   - Publisher account information
   - One publisher can manage multiple websites

4. **publisher_offerings** (747 records)
   - Service offerings with `base_price` in cents
   - Each offering tied to exactly ONE website (1:1 relationship)

5. **publisher_offering_relationships**
   - Links specific offerings to specific websites
   - Confirms 1:1 offering-to-website relationship

**Database flow diagram**: [COMPLETE-database-flow-explanation.md](./COMPLETE-database-flow-explanation.md)  
**Relationship analysis**: [CORRECTED-offering-website-relationship.md](./CORRECTED-offering-website-relationship.md)

## Current Data State Analysis

### Overall Statistics
- **940 websites** have `guest_post_cost` values
- **747 publisher offerings** exist in the system
- **78.1% match rate** between website prices and offering prices

### Problem Categories

#### 1. Missing Offerings (107 websites - 11.4%)
Websites with `guest_post_cost` but no publisher offering at all. These websites cannot currently be used in orders.

Examples:
- bedfordindependent.co.uk ($245.00)
- furnpeak.com ($250.00)
- justalittlebite.com ($120.00)

#### 2. Price Mismatches (96 websites - 10.5%)
Websites have publisher offerings but prices don't match.

Severity breakdown:
- 22 critical mismatches (>$50 difference)
- 55 medium mismatches ($10-50 difference)
- 19 minor mismatches (<$10 difference)

Most extreme examples:
- logomakerr.ai: Website $250 vs Offering $75 (-$175 difference)
- edtechrce.org: Website $45 vs Offering $120 (+$75 difference)

#### 3. Multiple Offerings (3 websites)
Websites with multiple offerings where none match the `guest_post_cost`.

**Full problem list**: [all-206-problem-websites.md](./all-206-problem-websites.md)  
**Detailed audit results**: [publisher-offerings-audit-results.md](./publisher-offerings-audit-results.md)

## Key Findings

### Data Format Inconsistency
- `guest_post_cost`: NUMERIC(10,2) storing dollars (e.g., 100.00)
- `base_price`: INTEGER storing cents (e.g., 10000)
- Conversion formula: `base_price = guest_post_cost * 100`

### Service Fee Structure
- Hardcoded $79 (7900 cents) throughout the system
- Stored in `order_line_items.service_fee` with default value
- No configuration system for dynamic fees
- Applied uniformly regardless of order size or customer

### Missing Infrastructure
- No pricing configuration table
- No package/tier system in database (despite UI references)
- No commission tracking between platform and publishers
- Multiple unused pricing fields (approved_price, publisher_price, platform_fee all NULL)

### Offering-Website Relationship Clarification
- Each offering is tied to exactly ONE website (not multiple as initially thought)
- Connection made through `publisher_offering_relationships` table
- Problems are data quality issues, not structural design flaws

## Data Volume Context

### Most Common Price Points
1. $100.00 - 140 websites (119 have matching offerings)
2. $150.00 - 98 websites (74 have matching offerings)
3. $50.00 - 73 websites (59 have matching offerings)
4. $200.00 - 67 websites (54 have matching offerings)
5. $250.00 - 47 websites (40 have matching offerings)

### Publisher Distribution
- 742 total publishers
- Most publishers manage 1-2 websites
- Some publishers manage 10+ websites

## External Dependencies

### Airtable Integration
- Primary source for website pricing data
- Syncs `Guest Post Cost V2` field
- Would need updating to populate publisher offerings instead

### Other Integrations
- Chatwoot CRM syncs `guest_post_cost`
- Email templates include pricing information
- Invoice generation uses current pricing fields

## Migration Considerations

### Data Quality Requirements
- 206 websites (21.9%) need fixes before migration
- 107 need offerings created
- 96 need price corrections
- 3 need duplicate cleanup

### System Constraints
- Production system with active orders
- Paying customers expecting consistent pricing
- Publishers expecting specific payment amounts
- No ability to pause system during migration

## Related Documentation

### Planning Documents
- [notes.md](./notes.md) - Original requirements and goals
- [pricing-audit.md](./pricing-audit.md) - Initial chaos analysis

### Analysis Scripts Created
All scripts located in `/scripts/`:
- `audit-pricing-relationships.ts` - Main offering vs guest_post_cost comparison
- `list-pricing-problems.ts` - Lists all 206 problem websites
- `check-offering-website-relationship.ts` - Verifies 1:1 offering relationships
- `simple-publisher-websites-check.ts` - Publisher-website connection analysis

### Data Exports
- `all-pricing-problems.json` - JSON export of all problem websites

---

*This summary represents the current state of research. The system is functional but requires standardization to eliminate confusion and enable advanced pricing features.*