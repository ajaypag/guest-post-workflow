# Shadow Publisher Migration - Production Deployment Guide

🚨 **CRITICAL**: This must be done before any publisher invitation emails are sent in production.

## What This Fixes

**The Problem**: Publishers who clicked invitation emails and claimed accounts landed on empty dashboards with 0 websites, 0 offerings, even though we had extracted their data from email responses.

**The Solution**: Auto-migration of shadow publisher data (websites, pricing, relationships) when accounts are claimed.

## Files Changed

- `migrations/0062_shadow_publisher_migration_tracking.sql` - Database schema changes
- `lib/services/shadowPublisherMigrationService.ts` - Migration service
- `app/api/publisher/claim/route.ts` - Claim endpoint with migration
- `lib/db/emailProcessingSchema.ts` - Updated shadow tables
- `lib/db/accountSchema.ts` - Added migration tracking to publishers

## Pre-Deployment Checklist

### 1. Environment Verification
```bash
# Verify you're deploying to the right environment
echo $DATABASE_URL
echo $NEXTAUTH_URL

# Check current shadow data in production
npm run tsx scripts/test-shadow-migration-simple.ts
```

### 2. Database Backup (CRITICAL)
```bash
# Full database backup before migration
pg_dump -h $PROD_DB_HOST -U $PROD_DB_USER -d $PROD_DB_NAME > shadow_migration_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created and has data
ls -lh shadow_migration_backup_*.sql
```

### 3. Test Locally
```bash
# Ensure build passes
npm run build

# Test migration service
npm run tsx scripts/test-shadow-migration-simple.ts

# Test claim flow end-to-end
# (Use a test shadow publisher)
```

## Deployment Steps

### Step 1: Apply Database Migration (CRITICAL FIRST STEP)

```bash
# Option A: Use npm command (recommended)
npm run db:push

# Option B: Manual SQL execution
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d $PROD_DB_NAME < migrations/0062_shadow_publisher_migration_tracking.sql
```

**Verify migration worked:**
```sql
-- Check if migration columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shadow_publisher_websites'
  AND column_name IN ('migration_status', 'migrated_at', 'migration_notes')
ORDER BY column_name;

-- Should return 3 rows:
-- migration_notes   | text                     | YES
-- migration_status  | character varying        | YES  
-- migrated_at       | timestamp without time zone | YES
```

### Step 2: Deploy Application Code

Deploy normally (Coolify, Docker, etc.) with the updated:
- Claim endpoint with migration
- Migration service
- Updated schemas

### Step 3: Post-Deployment Verification

```bash
# 1. Test that claim endpoint works
curl -X GET "https://your-domain.com/api/publisher/claim?token=test-token"

# 2. Check shadow data exists
npm run tsx scripts/test-shadow-migration-simple.ts

# 3. Monitor application logs for migration activity
tail -f /path/to/app/logs | grep -i migration
```

### Step 4: Test Full Flow (CRITICAL)

1. **Find a shadow publisher in production:**
   ```sql
   SELECT id, email, contact_name, invitation_token 
   FROM publishers 
   WHERE account_status = 'shadow' 
     AND invitation_token IS NOT NULL 
   LIMIT 1;
   ```

2. **Test claim flow:**
   - Go to claim URL: `https://your-domain.com/publisher/claim?token=ACTUAL_TOKEN`
   - Complete claim process
   - Verify publisher dashboard shows websites
   - Check database for migration status

3. **Verify migration worked:**
   ```sql
   -- Check migration status
   SELECT 
     p.email,
     p.shadow_data_migrated,
     p.shadow_migration_completed_at,
     COUNT(pw.id) as migrated_websites
   FROM publishers p
   LEFT JOIN publisher_websites pw ON pw.publisher_id = p.id
   WHERE p.email = 'test-publisher@example.com'
   GROUP BY p.id, p.email, p.shadow_data_migrated, p.shadow_migration_completed_at;
   ```

## Monitoring & Alerts

### Application Logs to Monitor

```bash
# Look for these log patterns:
grep -i "shadow data migration" /path/to/logs
grep -i "migration successful" /path/to/logs
grep -i "migration failed" /path/to/logs
```

### Database Queries to Monitor

```sql
-- Check overall migration status
SELECT 
  migration_status,
  COUNT(*) as count
FROM shadow_publisher_websites 
GROUP BY migration_status;

-- Find failed migrations
SELECT 
  spw.id,
  p.email,
  spw.migration_status,
  spw.migration_notes
FROM shadow_publisher_websites spw
JOIN publishers p ON spw.publisher_id = p.id
WHERE spw.migration_status = 'failed';

-- Check recent claims and migrations
SELECT 
  p.email,
  p.claimed_at,
  p.shadow_data_migrated,
  p.shadow_migration_completed_at
FROM publishers p
WHERE p.claimed_at > NOW() - INTERVAL '7 days'
ORDER BY p.claimed_at DESC;
```

## Rollback Plan (If Needed)

If migration causes issues:

### 1. Stop Publisher Invitations
- Pause sending invitation emails immediately
- Communicate with team about the issue

### 2. Revert Database (Nuclear Option)
```bash
# Only if absolutely necessary - restore from backup
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d $PROD_DB_NAME < shadow_migration_backup_TIMESTAMP.sql
```

### 3. Revert Application Code
- Deploy previous version without migration
- Publishers will see empty dashboards but won't lose data

### 4. Manual Recovery (Preferred)
```bash
# Fix specific failed migrations
npm run tsx -e "
import { shadowPublisherMigrationService } from './lib/services/shadowPublisherMigrationService.ts';
shadowPublisherMigrationService.retryFailedMigrations('PUBLISHER_ID');
"
```

## Success Indicators

✅ **Migration is working if:**
- Publishers claiming accounts see their websites on dashboard
- No "empty dashboard" complaints
- Migration status shows "migrated" in database
- Application logs show successful migrations

❌ **Migration failed if:**
- Publishers still see empty dashboards after claiming
- Database shows "failed" migration status
- Application logs show migration errors
- Shadow data remains unmigrated

## Emergency Contacts

- **Database Issues**: [Your DBA/DevOps contact]
- **Application Issues**: [Your dev team lead]
- **Publisher Support**: [Customer service team]

---

**IMPORTANT**: Test this entire process in staging/development before running in production!

**Created**: 2025-01-23
**Last Updated**: 2025-01-23