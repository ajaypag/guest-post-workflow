# Migration Log - Publisher & Domain Normalization System
**Date**: February 14, 2025  
**Purpose**: Track all database changes for production deployment

## 🔴 CRITICAL: Production Migration Steps

### COMPLETE MIGRATION SEQUENCE FOR PRODUCTION

**⚠️ IMPORTANT**: Run these migrations IN THIS EXACT ORDER on your production database:

### Step 1: Database Backup (MANDATORY)
```bash
# ALWAYS backup before any migration
pg_dump -h [host] -U [user] -d [database] -F c > backup_$(date +%Y%m%d_%H%M%S).dmp
```

### Step 2: Publisher Offerings System Migration
**File**: `migrations/0035_publisher_offerings_system_fixed_v2.sql`
**Status**: ✅ Tested locally
**Required**: YES - Core publisher system tables

This creates the foundation publisher tables. Must be run FIRST.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0035_publisher_offerings_system_fixed_v2.sql
```

**Creates**:
- 6 new tables (publisher_offerings, publisher_offering_relationships, etc.)
- 2 views for reporting
- Multiple indexes and triggers

### Step 3: Add Missing Publisher Columns
**File**: `migrations/0038_add_missing_publisher_columns_production.sql`
**Status**: ✅ Tested locally
**Required**: YES - Application won't work without these columns

This adds columns that the application code requires. Must be run AFTER Step 2.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0038_add_missing_publisher_columns_production.sql
```

**Adds to publisher_offering_relationships**:
- `relationship_type` (contact, owner, manager)
- `verification_status` (claimed, verified, etc.)
- `priority_rank` (for ordering)
- `is_preferred` (preferred publisher flag)

### Step 4: Add Missing Website Columns
**File**: `migrations/0039_add_missing_website_columns.sql`
**Status**: ✅ Tested locally
**Required**: YES - Application expects these columns

This adds columns that the application code requires.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0039_add_missing_website_columns.sql
```

**Adds to websites table**:
- `publisher_tier` (publisher level)
- Content configuration columns
- Contact and management fields
- Performance metrics columns

### Step 5: Publisher Offering Columns (UPDATED 2025-08-15)
**File**: `migrations/0040_add_missing_publisher_offering_columns.sql`
**Status**: ✅ Tested locally, TypeScript compilation verified
**Required**: YES - Application requires these for pricing functionality

This adds missing columns to publisher_offerings table.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0040_add_missing_publisher_offering_columns.sql
```

**Adds to publisher_offerings table**:
- `currency` (varchar 10) - Currency code for pricing
- `current_availability` (varchar 50) - Availability status
- `express_available` (boolean) - Express service flag
- `express_price` (integer) - Express pricing in cents
- `express_days` (integer) - Express delivery days

### Step 6: Publisher Performance Columns (NEW 2025-08-15)
**File**: `migrations/0041_add_missing_performance_columns.sql`
**Status**: ✅ Tested locally, TypeScript compilation verified
**Required**: YES - Application requires these for metrics tracking

This adds performance metrics columns to publisher_performance table.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0041_add_missing_performance_columns.sql
```

**Adds to publisher_performance table**:
- `content_approval_rate` (decimal 5,2) - Content approval percentage
- `revision_rate` (decimal 5,2) - Average revisions per order
- `total_revenue` (integer) - Total revenue in cents
- `avg_order_value` (integer) - Average order value in cents
- `last_calculated_at` (timestamp) - Last calculation timestamp

### Step 7: Fix Offering ID Nullable (NEW 2025-08-15)
**File**: `migrations/0042_fix_offering_id_nullable.sql`
**Status**: ✅ Created for TypeScript compatibility
**Required**: YES - Fixes schema design issue

Makes offering_id nullable in publisher_offering_relationships table.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0042_fix_offering_id_nullable.sql
```

**Changes to publisher_offering_relationships table**:
- `offering_id` - Changed from NOT NULL to nullable
- Allows relationships to exist before offerings are created

### Step 8: Add Missing Relationship Fields (NEW 2025-08-15)
**File**: `migrations/0043_add_missing_relationship_fields.sql`
**Status**: ✅ Created for TypeScript compatibility
**Required**: YES - Completes publisher_offering_relationships schema

Adds missing contact and payment fields to publisher_offering_relationships.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0043_add_missing_relationship_fields.sql
```

**Adds to publisher_offering_relationships table**:
- `verification_method` (varchar 50) - How relationship was verified
- `contact_email` (varchar 255) - Primary contact email
- `contact_phone` (varchar 50) - Contact phone number
- `contact_name` (varchar 255) - Contact person name
- `internal_notes` (text) - Internal notes about relationship
- `publisher_notes` (text) - Notes from publisher
- `commission_rate` (varchar 50) - Commission rate for this relationship
- `payment_terms` (varchar 255) - Payment terms agreed upon

### Step 9: Domain Normalization Migration
**File**: `migrations/0037_normalize_existing_domains.sql`
**Status**: ✅ Tested locally
**Required**: YES - Prevents duplicate domains

This normalizes all existing domains to prevent duplicates.

```bash
psql -h [host] -U [user] -d [database] -f migrations/0037_normalize_existing_domains.sql
```

**Changes**:
- Adds `normalized_domain` columns
- Creates normalization function
- Applies to all 948+ existing domains

### Step 8: Data Migration (Optional)
If you have existing publisher data in old format:
```sql
SELECT migrate_website_pricing_to_offerings();
```

## 📊 Testing Checklist

### Local Testing Results:
- [x] Database restored from production backup (948 websites, 13 users)
- [x] Publisher offerings migration applied (6 new tables created)
- [x] Domain normalization migration applied (948 domains normalized, 0 duplicates)
- [x] Authentication working (JWT with userType: 'internal' for admin users)
- [x] Login system functional (admin user can login)
- [x] Fixed DATABASE_URL connection issues (using port 5433)
- [x] Updated password hash for local testing
- [x] Test internal dashboard at root path (/) - Working for internal users
- [x] Publisher portal authentication - Registration and login working
- [x] Publisher main dashboard (/publisher) - Working with stats
- [ ] Publisher offerings page (/publisher/offerings) - 500 error (in progress)
- [ ] Publisher websites page (/publisher/websites) - 500 error 
- [ ] Internal admin websites (/internal/websites) - 500 error
- [ ] External user dashboard access - Middleware auth issue
- [x] Full build verification - TypeScript compilation passing

### Schema Fixes Applied:
- [x] Created `/lib/db/publisherSchemaActual.ts` matching real DB structure
- [x] Fixed publisher dashboard queries to use correct column names
- [x] Added robust error handling to prevent page crashes
- [x] Updated schema imports in main application
- [x] Added missing columns to `publisher_offering_relationships` table
- [x] Added `publisherPricingRules` to schema exports
- [x] Fixed `publisherOfferingsService.ts` to use correct joins
- [x] Added `OFFERING_TYPES` constant to schema
- [x] Fixed relationship between offerings and relationships tables

## 🔍 Verification Queries

### Check Publisher Tables Created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'publisher%'
ORDER BY table_name;
```
Expected: 7 tables (including existing `publishers` and `publisher_websites`)

### Check Domain Normalization:
```sql
-- Check for duplicates after normalization
SELECT normalized_domain, COUNT(*) as count
FROM websites
WHERE normalized_domain IS NOT NULL
GROUP BY normalized_domain
HAVING COUNT(*) > 1;
```
Expected: 0 rows (no duplicates)

### Check Views Created:
```sql
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE 'v_%publisher%';
```
Expected: 2 views

## 🚨 Rollback Procedures

### Rollback Publisher System:
```sql
-- CAREFUL: This removes all publisher data!
DROP TABLE IF EXISTS publisher_payouts CASCADE;
DROP TABLE IF EXISTS publisher_performance CASCADE;
DROP TABLE IF EXISTS publisher_pricing_rules CASCADE;
DROP TABLE IF EXISTS publisher_offering_relationships CASCADE;
DROP TABLE IF EXISTS publisher_offerings CASCADE;
DROP TABLE IF EXISTS publisher_email_claims CASCADE;
DROP VIEW IF EXISTS v_active_publisher_offerings;
DROP VIEW IF EXISTS v_publisher_performance_complete;
DROP FUNCTION IF EXISTS migrate_website_pricing_to_offerings();
```

### Rollback Domain Normalization:
```sql
-- Use the admin panel for safe rollback
-- OR run this SQL:
DROP TRIGGER IF EXISTS normalize_website_domain_trigger ON websites;
DROP TRIGGER IF EXISTS normalize_bulk_domain_trigger ON bulk_analysis_domains;
DROP FUNCTION IF EXISTS normalize_domain(TEXT);
DROP FUNCTION IF EXISTS trigger_normalize_domain();
-- Optionally remove columns (data loss warning):
-- ALTER TABLE websites DROP COLUMN normalized_domain;
-- ALTER TABLE bulk_analysis_domains DROP COLUMN normalized_domain;
```

## 📝 Notes & Warnings

1. **Migration Order Matters**: Always run publisher system BEFORE domain normalization
2. **Test First**: Use the admin panels at `/admin/domain-migration` for safer migrations
3. **Check for Conflicts**: Some tables might already exist from partial migrations
4. **Performance Impact**: Domain normalization will update ALL rows - may take time on large databases
5. **Backup Critical**: Always have a recent backup before production migrations

## 🔄 Current Local Testing Status

**Database**: `guest_post_test` on port 5433
**Dev Server**: Running on port 3003
**Tables After Migrations**: 63 (57 original + 6 new publisher tables)
**Test Users Available**: 13 users in database
**Working Login**: [CREDENTIALS REMOVED FOR SECURITY]

### ✅ Completed Setup Steps:
1. Created Docker PostgreSQL container on port 5433
2. Restored production database backup
3. Applied publisher offerings migration (6 new tables)
4. Applied domain normalization migration (948 domains)
5. Fixed .env DATABASE_URL to use correct port
6. Updated password hash for test user
7. Verified login and dashboard access working

### 🔴 IMPORTANT for Production:
1. DO NOT update password hashes in production
2. Run migrations in the exact order shown above
3. Ensure DATABASE_URL is correct before starting app
4. Test with a non-admin user as well

## 🔧 TypeScript Compilation Fixes (August 15, 2025)

### Fixed Issues:
1. **Missing Schema Fields**:
   - Added `expressPrice`, `expressAvailable`, `expressDays` to publisher offerings
   - Added performance metrics columns to publisher_performance table
   - Created migrations 0040 and 0041 for these columns

2. **Field Name Corrections**:
   - Changed `isVerified` → `emailVerified` (publishers don't have isVerified)
   - Removed `tier` field references (doesn't exist in publishers table)
   - Changed `traffic` → `totalTraffic` for websites/domains
   - Changed `price` → `guestPostCost` for websites
   - Removed `websiteName` references (field doesn't exist)

3. **Schema Alignment**:
   - Updated `lib/db/publisherSchemaActual.ts` to match database
   - Fixed all TypeScript interfaces to match actual schema
   - Aligned test files with correct field names

### Build Status:
- ✅ TypeScript compilation: **PASSING**
- ✅ All type errors: **RESOLVED**
- ⚠️ Static page generation: Runtime issues (not TypeScript related)

### Files Modified:
- `/lib/db/publisherSchemaActual.ts` - Added missing columns
- `/app/internal/publishers/*` - Fixed field references
- `/app/api/publishers/offerings/route.ts` - Removed non-existent fields
- `/components/orders/DomainCell.tsx` - Fixed traffic field
- `/__tests__/**/*.ts` - Updated test data interfaces

---
**Last Updated**: August 15, 2025, TypeScript compilation verified