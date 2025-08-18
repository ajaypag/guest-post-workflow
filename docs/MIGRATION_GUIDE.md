# Migration Guide - February 2025 Updates

## Overview
This guide covers the critical migrations needed to bring the system to production-ready state with the new publisher portal, internal portal, and domain normalization features.

## 🚨 Critical Migrations Required

### 1. Publisher System Migration
**File**: `migrations/0035_publisher_offerings_system_fixed.sql`  
**Priority**: HIGH  
**Impact**: Enables publisher portal functionality

#### What it does:
- Creates publisher tables and relationships
- Enables multi-publisher per website support
- Sets up offering and pricing management

#### How to run:
```bash
psql -d your_database -f migrations/0035_publisher_offerings_system_fixed.sql
```

### 2. Domain Normalization Migration
**File**: `migrations/0037_normalize_existing_domains.sql`  
**Priority**: CRITICAL  
**Impact**: Prevents duplicate websites, fixes domain matching

#### What it does:
- Adds normalized_domain columns
- Creates normalization functions
- Identifies existing duplicates
- Sets up auto-normalization for new entries

#### How to run:
```bash
# Option 1: Via Admin Panel (RECOMMENDED)
1. Navigate to /admin/domain-migration
2. Click "Run Migration"
3. Review duplicates
4. Handle as needed

# Option 2: Direct SQL
psql -d your_database -f migrations/0037_normalize_existing_domains.sql
```

## Step-by-Step Migration Process

### Phase 1: Pre-Migration Checks
```bash
# 1. Backup your database
pg_dump -h localhost -U user -d database > backup_$(date +%Y%m%d).sql

# 2. Check current state
psql -d database -c "SELECT COUNT(*) FROM websites;"
psql -d database -c "SELECT COUNT(*) FROM publishers;"
```

### Phase 2: Run Publisher Migration
```bash
# Run the migration
psql -d database -f migrations/0035_publisher_offerings_system_fixed.sql

# Verify success
psql -d database -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'publisher%';"
# Should return 7+ tables
```

### Phase 3: Run Domain Normalization
```bash
# Use the admin panel
open http://localhost:3000/admin/domain-migration

# Or run SQL directly
psql -d database -f migrations/0037_normalize_existing_domains.sql
```

### Phase 4: Handle Duplicates
If duplicates are found:

1. **Review in Admin Panel**
   - Go to `/admin/domain-migration`
   - Click "Duplicates" tab
   - Review each group

2. **Decide on Action**
   - **Merge**: Combines duplicates, keeps best data
   - **Keep Separate**: If subdomains are intentionally different
   - **Manual Review**: For complex cases

3. **Execute Merge** (if needed)
   ```sql
   -- View duplicates
   SELECT * FROM duplicate_websites;
   
   -- Merge specific domain
   SELECT merge_duplicate_websites('example.com');
   ```

### Phase 5: Verify Migration
```bash
# Check normalization is working
psql -d database -c "SELECT normalize_domain('https://www.example.com');"
# Should return: example.com

# Check for remaining duplicates
psql -d database -c "SELECT COUNT(*) FROM duplicate_websites;"
# Should return: 0 (after handling)

# Verify triggers are active
psql -d database -c "\dt+ normalize_website_domain_trigger"
```

## Post-Migration Tasks

### 1. Update Application Code
```typescript
// Import the normalizer in domain-handling code
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

// Use for all domain inputs
const normalized = normalizeDomain(userInput);
const website = await findWebsiteByNormalizedDomain(normalized.domain);
```

### 2. Test Critical Flows
- [ ] Website creation with various domain formats
- [ ] Publisher claiming websites
- [ ] Internal portal website management
- [ ] Bulk import with mixed formats
- [ ] Search functionality

### 3. Monitor for Issues
```sql
-- Check for new duplicates daily
SELECT normalized_domain, COUNT(*) 
FROM websites 
GROUP BY normalized_domain 
HAVING COUNT(*) > 1;

-- Monitor failed normalizations
SELECT domain, normalized_domain 
FROM websites 
WHERE normalized_domain IS NULL;
```

## Rollback Procedures

### If Publisher Migration Fails
```sql
-- Remove publisher tables (DESTRUCTIVE)
DROP TABLE IF EXISTS publisher_offerings CASCADE;
DROP TABLE IF EXISTS publisher_offering_relationships CASCADE;
DROP TABLE IF EXISTS publisher_pricing_rules CASCADE;
DROP TABLE IF EXISTS publisher_performance_metrics CASCADE;
DROP TABLE IF EXISTS publisher_payouts CASCADE;
DROP TABLE IF EXISTS publisher_email_claims CASCADE;
DROP TABLE IF EXISTS publishers CASCADE;
```

### If Domain Normalization Fails
```bash
# Use admin panel
1. Go to /admin/domain-migration
2. Click "Rollback" tab
3. Confirm rollback

# Or use API
curl -X POST http://localhost:3000/api/admin/domain-migration/rollback
```

## Troubleshooting

### Common Issues

#### 1. Migration fails with "column already exists"
```sql
-- Check if migration was partially applied
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'websites' AND column_name = 'normalized_domain';

-- If exists, skip that part of migration
```

#### 2. Duplicate constraint violations
```sql
-- Find the duplicates
SELECT normalized_domain, ARRAY_AGG(domain) 
FROM websites 
GROUP BY normalized_domain 
HAVING COUNT(*) > 1;

-- Handle before adding constraint
```

#### 3. Performance issues after migration
```sql
-- Rebuild indexes
REINDEX TABLE websites;
ANALYZE websites;

-- Check index usage
EXPLAIN SELECT * FROM websites WHERE normalized_domain = 'example.com';
```

## Success Criteria

✅ **Publisher System**
- [ ] Publishers table exists
- [ ] Publishers can register and login
- [ ] Internal portal accessible at `/internal`
- [ ] Website management working

✅ **Domain Normalization**
- [ ] No duplicate normalized domains
- [ ] All websites have normalized_domain populated
- [ ] New domains auto-normalize on insert
- [ ] Domain lookups use normalized field

## Support

If you encounter issues:
1. Check execution logs in admin panel
2. Review PostgreSQL logs
3. Run diagnostic queries above
4. Check `/admin/domain-migration` status page

## Next Steps

After successful migration:
1. **Enable publisher registration** (currently invite-only)
2. **Import publisher data** from existing sources
3. **Configure email notifications** for publishers
4. **Set up monitoring** for domain duplicates
5. **Train team** on internal portal usage

---

**Remember**: Always backup before migrations and test in staging first!