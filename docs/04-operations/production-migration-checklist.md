# Production Migration Checklist

## Overview
The `order-flow-rollback` branch is **77 commits ahead** of the `bug-fixing` branch. This checklist identifies all database migrations that need to be applied to bring production up to date with the latest shadow publisher system and other enhancements.

## Critical Database Migrations Required

### Phase 1: Foundation Migrations (Must Run First)
These migrations create the foundational infrastructure needed for all other features:

#### 1. `0054_fix_multiple_offerings_per_website.sql` ⭐ **CRITICAL**
**Purpose**: Allow publishers to have multiple offerings for the same website
**Impact**: Fixes constraint that prevents multiple offerings per publisher-website pair
**Changes**: 
- Removes `publisher_offering_relationships_publisher_id_website_id_key` constraint
- Adds `publisher_offering_relationships_unique_offering` constraint
- Allows multiple offerings but prevents duplicates of same offering

#### 2. `0055_shadow_publisher_support.sql` ⭐ **CRITICAL**
**Purpose**: Enable "shadow" publishers from email responses before account creation
**Impact**: Major schema changes to publishers table
**Changes**:
- Adds `account_status`, `source`, `source_metadata`, `claimed_at` columns
- Adds invitation system: `invitation_token`, `invitation_sent_at`, `invitation_expires_at`
- Adds confidence scoring: `confidence_score`
- Adds claim verification: `claim_verification_code`, `claim_attempts`, `last_claim_attempt`
- Makes authentication fields nullable for shadow publishers
- Creates conditional unique index for email (only active accounts)
- Adds performance indexes and constraints
- Creates audit trigger for status changes

#### 3. `0056_email_processing_infrastructure.sql` ⭐ **CRITICAL**
**Purpose**: ManyReach webhook integration for email processing
**Impact**: Creates entire email processing system
**Changes**:
- Creates `email_processing_logs` table (webhook data, parsing results, status tracking)
- Creates `email_review_queue` table (manual processing queue)
- Creates `email_follow_ups` table (automated follow-up tracking)
- Creates `publisher_automation_logs` table (automation audit trail)
- Adds indexes and performance optimizations

### Phase 2: Shadow Publisher System Completion

#### 4. `0058_webhook_security_logs.sql` ⭐ **CRITICAL**
**Purpose**: Security logging for webhook processing
**Changes**:
- Creates `webhook_security_logs` table
- Tracks security events, failed authentications, suspicious activity
- Essential for production webhook security

#### 5. `0059_shadow_publisher_system.sql` ⭐ **CRITICAL**
**Purpose**: Complete shadow publisher infrastructure
**Changes**:
- Creates `shadow_publisher_websites` table
- Adds permission columns to `publisher_websites`
- Adds express delivery options to `publisher_offerings`
- Adds missing columns for complete shadow publisher functionality

#### 6. `0061_add_sender_email_column.sql`
**Purpose**: Track sender email in processing logs
**Changes**: Adds `sender_email` column to `email_processing_logs`

#### 7. `0062_shadow_publisher_system_completion.sql` ⭐ **CRITICAL**
**Purpose**: Final schema completion for shadow publisher system
**Impact**: Required for shadow publisher claim flow to work
**Changes**:
- Adds migration tracking columns to `publishers`
- Updates `shadow_publisher_websites` structure
- Creates `publisher_claim_history` table for audit trails
- Adds data integrity constraints
- Creates monitoring views

#### 8. `0063_email_qualification_tracking.sql` ⭐ **CRITICAL**
**Purpose**: V2 email parser qualification system
**Changes**:
- Adds qualification fields to `email_processing_logs`
- Adds source email tracking to `publisher_offerings`
- Essential for V2 email parser functionality

### Phase 3: Order System & Workflow Enhancements

#### 9. `0060_add_target_url_matching.sql`
**Purpose**: AI-powered target URL matching system
**Changes**: Adds `suggested_target_url`, `target_match_data`, `target_matched_at` columns

#### 10. `0061_fix_inclusion_status_defaults.sql`
**Purpose**: Fix inclusion status defaults for better UX
**Changes**: Ensures proper default values for order line items

#### 11. Line Item Changes Schema (Multiple Files)
**Purpose**: Enhanced order line item change tracking
**Files**: 
- `0057_fix_line_item_changes_schema_v3.sql` (Use this one - most recent)
- Skip the other 0057* files (they're iterations)

#### 12. Workflow Tracking Migrations
**Purpose**: Enhanced workflow and order completion tracking
**Files**:
- `0062_add_workflow_completion_tracking.sql`
- `0063_add_workflow_assignment_tracking.sql` 
- `0064_add_publisher_coordination_fields.sql`
- `0065_add_order_completion_tracking.sql`
- `0066_populate_workflow_assignments.sql`
- `0067_add_order_delivery_fields.sql`

### Phase 4: Website & Source Constraints

#### 13. `0062_fix_website_source_constraint.sql`
**Purpose**: Fix source field constraints in websites table

## Migration Execution Strategy

### Option A: Use Admin Panel (Recommended)
Access the migration admin panel at `/admin/migrations` which provides:
- Safe execution with rollback capability
- Progress monitoring
- Error handling
- Status verification

### Option B: Manual Execution
Run migrations in the exact order listed above:

```bash
# Connect to production database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

# Run migrations in order
\i migrations/0054_fix_multiple_offerings_per_website.sql
\i migrations/0055_shadow_publisher_support.sql
\i migrations/0056_email_processing_infrastructure.sql
# ... continue with remaining migrations
```

### Option C: Use Migration Scripts
The codebase includes migration scripts:
- `scripts/run-migration.sh` - Safe migration execution
- `scripts/run-migration.ts` - TypeScript migration runner

## Pre-Migration Checklist

### 1. Database Backup ⭐ **CRITICAL**
```bash
# Create full database backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > production_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Environment Verification
- [ ] Confirm database connection details
- [ ] Verify sufficient disk space for new tables
- [ ] Check database user permissions
- [ ] Ensure no active migrations are running

### 3. Application Readiness
- [ ] Deploy code changes that use new schema
- [ ] Update environment variables if needed
- [ ] Test shadow publisher system in staging

## Post-Migration Verification

### 1. Critical Table Verification
```sql
-- Verify shadow publisher tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('shadow_publisher_websites', 'email_processing_logs', 'publisher_claim_history');

-- Check publishers table has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'publishers' AND column_name IN ('account_status', 'shadow_data_migrated');

-- Verify email processing infrastructure
SELECT count(*) FROM email_processing_logs;
```

### 2. Feature Testing
- [ ] Test shadow publisher creation via email processing
- [ ] Test publisher claim flow
- [ ] Test multiple offerings per website
- [ ] Test email qualification system
- [ ] Verify webhook processing works

### 3. Performance Verification
```sql
-- Check new indexes are created
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('publishers', 'shadow_publisher_websites', 'email_processing_logs');
```

## Risk Assessment

### High Risk Migrations
- **0055_shadow_publisher_support.sql**: Major publishers table changes
- **0056_email_processing_infrastructure.sql**: Creates many new tables
- **0062_shadow_publisher_system_completion.sql**: Schema completion changes

### Medium Risk Migrations  
- **0054_fix_multiple_offerings_per_website.sql**: Constraint changes
- **0063_email_qualification_tracking.sql**: Reference column additions

### Low Risk Migrations
- Most 006x series migrations (add columns, create indexes)

## Rollback Strategy

### If Migration Fails:
1. **Stop immediately** - Don't continue with remaining migrations
2. **Restore from backup** if structural changes were made
3. **Investigate error** - Check migration logs and database state
4. **Fix issue** and retry individual migration

### If Application Issues After Migration:
1. **Check logs** for database connection errors
2. **Verify schema** matches application expectations  
3. **Test critical flows** (order creation, publisher portal)
4. **Rollback specific migrations** if needed using provided rollback scripts

## Timeline Estimate
- **Preparation**: 30 minutes (backup, verification)
- **Migration Execution**: 45-90 minutes (depending on data size)
- **Verification**: 30 minutes
- **Total**: 2-3 hours

## Emergency Contacts
- Database Admin: [Contact Info]
- Application Team Lead: [Contact Info]  
- DevOps Team: [Contact Info]

---

**⚠️ IMPORTANT**: This migration checklist is based on analysis of 77 commits between `bug-fixing` and `order-flow-rollback` branches. The shadow publisher system is the major new feature that requires these migrations. Test thoroughly in staging before applying to production.