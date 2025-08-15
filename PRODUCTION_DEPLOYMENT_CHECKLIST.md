# Production Deployment Checklist
**Date**: August 15, 2025 (UPDATED)
**Purpose**: Ensure safe deployment of publisher system with ALL required migrations
**CRITICAL**: Migrations 0043 and 0044 are REQUIRED to prevent 500 errors!

## 📋 Pre-Deployment Checklist

### 1. Code Preparation
- [ ] Pull latest code from repository
- [ ] Verify all TypeScript compiles: `npm run build`
- [ ] Check environment variables are set correctly
- [ ] Ensure `DATABASE_URL` points to production database

### 2. Database Backup
```bash
# Create timestamped backup
pg_dump -h [host] -U [user] -d [database] -F c > backup_$(date +%Y%m%d_%H%M%S).dmp

# Verify backup was created and has size > 0
ls -lah backup_*.dmp
```

## 🚀 Deployment Steps

### 3. Run Database Migrations (IN ORDER!)

#### Migration 1: Publisher Offerings System
```bash
# Creates core publisher tables
psql -h [host] -U [user] -d [database] -f migrations/0035_publisher_offerings_system_fixed_v2.sql

# Verify tables were created
psql -h [host] -U [user] -d [database] -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'publisher%'"
# Expected: 8 tables (including existing publishers and publisher_websites)
```

#### Migration 2: Add Missing Columns
```bash
# Adds required columns for application
psql -h [host] -U [user] -d [database] -f migrations/0038_add_missing_publisher_columns_production.sql

# Verify columns were added
psql -h [host] -U [user] -d [database] -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'publisher_offering_relationships' AND column_name IN ('relationship_type', 'verification_status', 'priority_rank', 'is_preferred')"
# Expected: 4 rows
```

#### Migration 3: Add Missing Website Columns
```bash
psql -h [host] -U [user] -d [database] -f migrations/0039_add_missing_website_columns.sql
```

#### Migration 4: Add Publisher Offering Columns
```bash
psql -h [host] -U [user] -d [database] -f migrations/0040_add_missing_publisher_offering_columns.sql
```

#### Migration 5: Add Performance Columns
```bash
psql -h [host] -U [user] -d [database] -f migrations/0041_add_missing_performance_columns.sql
```

#### Migration 6: Fix Offering ID Nullable
```bash
psql -h [host] -U [user] -d [database] -f migrations/0042_fix_offering_id_nullable.sql
```

#### Migration 7: Add Missing Relationship Fields (CRITICAL!)
```bash
# WITHOUT THIS MIGRATION, PUBLISHER PORTAL WILL HAVE 500 ERRORS!
psql -h [host] -U [user] -d [database] -f migrations/0043_add_missing_relationship_fields.sql

# Verify critical columns exist
psql -h [host] -U [user] -d [database] -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'publisher_offering_relationships' AND column_name = 'verification_method'"
# Expected: 1 row
```

#### Migration 8: Make Airtable ID Nullable (BREAKING CHANGE!)
```bash
# ENABLES PUBLISHERS TO ADD WEBSITES WITHOUT AIRTABLE
psql -h [host] -U [user] -d [database] -f migrations/0044_make_airtable_id_nullable.sql

# Verify airtable_id is nullable
psql -h [host] -U [user] -d [database] -c "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'airtable_id'"
# Expected: YES
```

#### Migration 9: Domain Normalization
```bash
# Normalizes all existing domains
psql -h [host] -U [user] -d [database] -f migrations/0037_normalize_existing_domains.sql

# Check for duplicate domains
psql -h [host] -U [user] -d [database] -c "SELECT normalized_domain, COUNT(*) FROM websites WHERE normalized_domain IS NOT NULL GROUP BY normalized_domain HAVING COUNT(*) > 1"
# Expected: 0 rows (no duplicates)
```

### 4. Deploy Application Code

#### For Coolify Deployment:
1. Push code to your repository
2. Trigger Coolify deployment
3. Monitor build logs for errors
4. Verify container starts successfully

#### Manual Deployment:
```bash
# Build the application
npm run build

# Start the production server
npm start
```

## ✅ Post-Deployment Verification

### 5. Test Critical Paths

#### Internal Admin Tests:
- [ ] Login as admin user
- [ ] Access dashboard at `/`
- [ ] Navigate to `/internal/websites`
- [ ] Create a test order at `/orders/new`
- [ ] View order groups at `/internal/order-groups`

#### Publisher Portal Tests:
- [ ] Register new publisher at `/publisher/register`
- [ ] Login as publisher at `/publisher/login`
- [ ] View publisher dashboard at `/publisher`
- [ ] Check offerings page at `/publisher/offerings`
- [ ] View websites at `/publisher/websites`

#### External User Tests:
- [ ] Login as external user
- [ ] Access account dashboard
- [ ] View orders list

### 6. Monitor for Issues

```bash
# Check application logs
docker logs [container_name] --tail 100 -f

# Check database connections
psql -h [host] -U [user] -d [database] -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'your_database'"

# Monitor error logs
grep -i error /path/to/logs/*.log
```

## 🔄 Rollback Plan (If Needed)

### Quick Rollback:
1. Stop the application
2. Restore database from backup:
```bash
pg_restore -h [host] -U [user] -d [database] -c backup_[timestamp].dmp
```
3. Deploy previous version of code
4. Restart application

### Partial Rollback (Remove migrations only):
```sql
-- Remove domain normalization
DROP TRIGGER IF EXISTS normalize_website_domain_trigger ON websites;
DROP TRIGGER IF EXISTS normalize_bulk_domain_trigger ON bulk_analysis_domains;
DROP FUNCTION IF EXISTS normalize_domain(TEXT);
DROP FUNCTION IF EXISTS trigger_normalize_domain();

-- Remove added columns (CAREFUL - data loss!)
ALTER TABLE publisher_offering_relationships 
DROP COLUMN IF EXISTS relationship_type,
DROP COLUMN IF EXISTS verification_status,
DROP COLUMN IF EXISTS priority_rank,
DROP COLUMN IF EXISTS is_preferred;

-- Remove publisher tables (CAREFUL - complete data loss!)
DROP TABLE IF EXISTS publisher_payouts CASCADE;
DROP TABLE IF EXISTS publisher_performance CASCADE;
DROP TABLE IF EXISTS publisher_pricing_rules CASCADE;
DROP TABLE IF EXISTS publisher_offering_relationships CASCADE;
DROP TABLE IF EXISTS publisher_offerings CASCADE;
DROP TABLE IF EXISTS publisher_email_claims CASCADE;
DROP VIEW IF EXISTS v_active_publisher_offerings;
DROP VIEW IF EXISTS v_publisher_performance_complete;
```

## 📝 Important Notes

1. **Migration Order Matters**: Always run migrations in the specified order
2. **Test First**: If possible, test on a staging environment first
3. **Monitor Closely**: Watch logs for the first 30 minutes after deployment
4. **Keep Backup**: Don't delete the backup for at least 7 days
5. **Document Issues**: Record any issues encountered for future reference

## 🆘 Troubleshooting

### Common Issues:

**Issue**: "column publisher_offering_relationships.verification_method does not exist"
**Solution**: Run migration 0043 immediately!
```bash
psql $DATABASE_URL -f migrations/0043_add_missing_relationship_fields.sql
```

**Issue**: Publisher portal pages return 500
**Solution**: Migration 0043 is missing - this is CRITICAL for operation

**Issue**: Duplicate domain errors
**Solution**: Run domain normalization migration (0037)

**Issue**: Authentication failures
**Solution**: Verify NEXTAUTH_SECRET and NEXTAUTH_URL are set correctly

## 📞 Emergency Contacts

- Database Admin: [Contact Info]
- DevOps Lead: [Contact Info]
- Project Manager: [Contact Info]

---
**Last Updated**: August 15, 2025
**Tested On**: Local PostgreSQL with production data backup
**Critical Migrations**: 0043 and 0044 MUST be applied or publisher portal will fail!