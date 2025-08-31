# guest_post_cost Field Dependencies - COMPREHENSIVE ANALYSIS

**Status**: 🔴 CRITICAL - Deeply embedded in production system  
**Files Affected**: 88+ files (33 snake_case + 69 camelCase + pricing logic)  
**Risk Level**: EXTREME if removed without proper migration  
**Estimated Migration Effort**: 2-3 weeks minimum

## Database Schema
- **websites table**: `guest_post_cost NUMERIC(10,2)` - Main field storing website pricing
- **website_contacts table**: `guest_post_cost DECIMAL(10,2)` - Contact-specific pricing (deprecated)
- **shadow_websites table**: `guest_post_cost INTEGER` - Shadow migration table

## API Endpoints

### 1. `/api/websites/search/route.ts`
- Returns `guestPostCost` in search results
- Parses from NUMERIC to float for API response

### 2. `/api/orders/[id]/groups/[groupId]/site-selections/route.ts`
- Used in order site selection process
- Referenced for pricing calculations

### 3. `/api/admin/marketing-diagnostics/websites/route.ts`
- Admin diagnostic endpoint
- Reports on website pricing data

### 4. `/api/contacts/export/route.ts` & `/api/contacts/search/route.ts`
- Contact export/search includes guest_post_cost
- Part of deprecated contact system

## Services

### 1. `airtableSyncService.ts`
- Syncs guest_post_cost from Airtable
- Filters websites by min/max cost (`w.guest_post_cost >= $X`)
- Maps to website records during import
- Used in contact sync operations

### 2. `chatwootService.ts` & `chatwootSyncService.ts`
- Syncs guest_post_cost to Chatwoot CRM
- Includes in website metadata
- Part of contact object structure

### 3. `shadowPublisherMigrationService.ts`
- Migrates guest_post_cost to publisher offerings
- Converts to cents: `parseInt(parseFloat(shadowRow.guest_post_cost) * 100)`
- Creates offerings based on guest_post_cost values
- Fallback for missing publisher pricing

## Database Migrations

### Key Migrations:
- `0013_add_airtable_sync_tables.sql` - Added guest_post_cost to websites
- `0021_remove_website_contacts.sql` - Backs up contact guest_post_cost
- `0035_publisher_offerings_system_fixed.sql` - References for migration
- `0064_fix_publisher_migration_issues.sql` - Publisher migration handling

## Frontend Pages

### 1. `/guest-posting-sites/[niche]/page.tsx`
- Displays guest post pricing in public listing
- Shows as "guestPostCost" in website cards
- Part of SEO/marketing pages

## Scripts & Tools

### 1. Migration Scripts:
- `migrate-websites-to-publishers.ts` - Uses contact or website guest_post_cost
- `setup-shadow-publisher-test.ts` - Test data with guest_post_cost
- `create-shadow-publisher-tables.ts` - Shadow table creation
- `check-coinlib-shadow-data.js` - Displays guest_post_cost in reports

### 2. Test Factories:
- `__tests__/factories/publisherTestDataFactory.ts` - Test data generation
- `__tests__/e2e/publisher-shadow-migration-flow.test.ts` - Migration tests

## Utility Libraries

### 1. `lib/db/websiteSchema.ts`
- Drizzle ORM schema definition
- Defines as: `decimal('guest_post_cost', { precision: 10, scale: 2 })`

### 2. `lib/utils/publisherMigrationValidation.ts`
- Validates guest_post_cost during migration
- Ensures data integrity

## Documentation References
- Multiple planning docs reference the field
- Migration strategies discuss moving away from it
- Technical debt identified around this field

## Critical Dependencies Summary

### High Impact (Core Business Logic):
1. **Order Creation** - Site selection and pricing
2. **Airtable Sync** - Primary data import source
3. **Publisher Migration** - Fallback pricing source
4. **Public Website Listings** - Marketing pages

### Medium Impact (Integrations):
1. **Chatwoot CRM** - External sync
2. **Contact Management** - Deprecated but still present
3. **Admin Diagnostics** - Reporting tools

### Low Impact (Can be deprecated):
1. **Test Scripts** - Development only
2. **Shadow Tables** - Migration intermediate
3. **Contact-specific pricing** - Already being phased out

## CRITICAL PRICING SERVICES (MUST UPDATE)

### Core Services with Hardcoded Dependencies:
1. **`pricingService.ts`** - Direct `website.guestPostCost` dependency + $79 hardcoded
2. **`enhancedOrderPricingService.ts`** - Legacy fallback to `guestPostCost` + $79 calculations
3. **`/api/orders/estimate-pricing/route.ts`** - Query filters and calculations on `guestPostCost`
4. **`PricingEstimator.tsx`** - SERVICE_FEE_CENTS (7900) hardcoded
5. **`/lib/config/pricing.ts`** - Central pricing config with `standard: 7900`

### Hardcoded $79 Service Fee Locations:
- **15+ files** with hardcoded 7900 (cents) value
- **orderLineItemSchema.ts**: Default service_fee = 7900
- **Multiple migrations**: Hardcoded service_fee values
- **No configuration system** for dynamic fees

## Migration Considerations

**Critical Path:**
1. Create pricing configuration table for dynamic fees
2. Migrate all hardcoded $79 references to config
3. Update Airtable sync to populate publisher offerings
4. Build backward compatibility layer during transition
5. Migrate existing orders to new pricing structure
6. Update all UI components to use new pricing source
7. Extensive testing of order flow and calculations

**Data Volume:**
- ~700+ websites with guest_post_cost values
- 52+ existing order line items with $79 service fee
- Most common prices: $100, $150, $50, $200, $250
- Must handle NULL values and format inconsistencies

**Risk Matrix:**
- 🔴 **EXTREME**: Removing guest_post_cost without migration
- 🟠 **HIGH**: Changing hardcoded service fees
- 🟠 **HIGH**: Airtable sync failures
- 🟡 **MEDIUM**: Price format inconsistencies