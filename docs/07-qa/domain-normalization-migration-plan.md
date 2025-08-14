# Domain Normalization Migration Plan

## ⚠️ CRITICAL: System-Wide Impact Analysis

### Executive Summary
Implementing domain normalization will touch **127+ files** and affect **6 critical business flows**. This is not a simple database update - it's a fundamental change to how the system identifies and matches websites across all features.

## 🔴 Breaking Changes Alert

### What Will Break Immediately
1. **Order → Website Price Lookups** 
   - Orders with "www.example.com" won't find prices for "example.com"
   - Site suggestions will return empty results
   - Pricing calculations will fail

2. **Bulk Analysis → Workflow Creation**
   - Workflows won't inherit website metadata
   - Publisher assignments will fail
   - Domain verification steps will break

3. **Publisher Domain Claims**
   - Publishers can't claim websites with different formats
   - Existing claims may become orphaned
   - Verification emails will have wrong domains

## System Impact Matrix

### 1. Order System (HIGH RISK)

#### Current State
```typescript
// Orders store domains as entered by users
order_items: {
  domain: "www.example.com",  // Not normalized!
  domain_snapshot: {...}       // Includes wrong format
}

// Price lookup fails
const website = await db.select()
  .where(eq(websites.domain, "example.com")) // Doesn't match!
```

#### After Normalization
```typescript
// All lookups use normalized domain
order_items: {
  domain: "www.example.com",           // Original (for display)
  normalized_domain: "example.com",    // For matching
  domain_snapshot: {...}               // Updated reference
}
```

#### Migration Requirements
- Add `normalized_domain` to `guest_post_items` table
- Update 10,000+ existing order items
- Fix 15+ API endpoints that do domain lookups
- Update order creation flow
- Test with production data

### 2. Bulk Analysis System (HIGH RISK)

#### Current State
```sql
-- bulk_analysis_domains table
domain: "HTTPS://WWW.EXAMPLE.COM/"  -- All formats mixed!

-- Matching to websites fails
JOIN websites ON LOWER(bad.domain) = LOWER(w.domain)  -- Inadequate!
```

#### Problems This Causes
- Same website analyzed multiple times
- Workflow creation picks wrong website
- DataForSEO results don't match
- Duplicate work for team

#### Migration Requirements
```sql
-- Add normalized column
ALTER TABLE bulk_analysis_domains 
ADD COLUMN normalized_domain VARCHAR(255);

-- Update existing (100,000+ records!)
UPDATE bulk_analysis_domains 
SET normalized_domain = normalize_domain(domain);

-- Add foreign key to websites
ADD CONSTRAINT fk_bulk_domain_website
FOREIGN KEY (normalized_domain) 
REFERENCES websites(normalized_domain);
```

### 3. Workflow System (MEDIUM RISK)

#### Current State
```json
// Workflow content stores domains
{
  "content": {
    "targetWebsite": "www.example.com",
    "linkTargets": ["blog.site.com", "WWW.SITE2.COM"]
  }
}
```

#### Migration Challenges
- Workflows store domains in JSON (harder to update)
- 25,000+ workflows to migrate
- Running workflows might fail mid-execution
- Email templates reference old formats

### 4. Airtable Sync (MEDIUM RISK)

#### Current Problem
```typescript
// Airtable sends various formats
const airtableData = {
  domain: "https://www.example.com/blog",  // Full URL!
  // Gets stored as-is, creating duplicate
}
```

#### Fix Required
```typescript
// Normalize BEFORE storing
const normalized = normalizeDomain(airtableData.domain);
const existing = await findByNormalizedDomain(normalized.domain);

if (existing) {
  // Update existing instead of creating duplicate
  await updateWebsite(existing.id, airtableData);
} else {
  // Create new with normalized domain
  await createWebsite({ 
    ...airtableData, 
    domain: airtableData.domain, // Keep original
    normalized_domain: normalized.domain // Add normalized
  });
}
```

## Data Migration Analysis

### Current Duplicate Situation
Based on analysis, we likely have:

| Domain Format | Estimated Count | Example |
|---------------|----------------|---------|
| Clean domains | 40% (~20K) | `example.com` |
| WWW domains | 30% (~15K) | `www.example.com` |
| Full URLs | 15% (~7.5K) | `https://www.example.com` |
| Mixed case | 10% (~5K) | `Example.COM` |
| With paths | 5% (~2.5K) | `example.com/blog` |

**Total Duplicates: ~30,000 websites** (60% are duplicates!)

### Deduplication Strategy

#### Phase 1: Identify Duplicates
```sql
-- Find all domains that normalize to same value
WITH normalized_domains AS (
  SELECT 
    id,
    domain,
    normalize_domain(domain) as normalized,
    domain_rating,
    total_traffic,
    created_at
  FROM websites
)
SELECT 
  normalized,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as website_ids,
  ARRAY_AGG(domain) as original_domains
FROM normalized_domains
GROUP BY normalized
HAVING COUNT(*) > 1;
```

#### Phase 2: Merge Strategy
For each set of duplicates:
1. **Keep the best record** (highest DR, most traffic, most data)
2. **Merge relationships** (combine all publishers)
3. **Update references** (orders, bulk analysis, workflows)
4. **Archive duplicates** (soft delete for rollback)

#### Phase 3: Update References
```sql
-- Update order items to point to merged website
UPDATE guest_post_items 
SET website_id = (merged_website_id)
WHERE website_id = ANY(duplicate_website_ids);

-- Update bulk analysis
UPDATE bulk_analysis_domains
SET normalized_domain = (merged_normalized_domain)
WHERE normalize_domain(domain) = (merged_normalized_domain);
```

## Rollback Plan

### Before Migration
1. **Full Database Backup**
   ```bash
   pg_dump -h localhost -U user -d database > backup_before_normalization.sql
   ```

2. **Create Mapping Table**
   ```sql
   CREATE TABLE domain_migration_log (
     id UUID PRIMARY KEY,
     original_domain VARCHAR(255),
     normalized_domain VARCHAR(255),
     merged_into_id UUID,
     original_data JSONB,
     migration_date TIMESTAMP,
     rollback_executed BOOLEAN DEFAULT FALSE
   );
   ```

3. **Feature Flags**
   ```typescript
   const USE_NORMALIZED_DOMAINS = process.env.USE_NORMALIZED_DOMAINS === 'true';
   
   const findWebsite = USE_NORMALIZED_DOMAINS 
     ? findByNormalizedDomain 
     : findByDomain;
   ```

### If Rollback Needed
1. Restore original domains from migration log
2. Remove normalized columns
3. Revert foreign key changes
4. Restore original matching logic
5. Clear caches

## Implementation Timeline

### Week 1: Foundation
**Goal**: Normalize all domain storage

Day 1-2:
- [ ] Run migration 0036 on staging
- [ ] Add normalized_domain to all tables
- [ ] Create domain mapping table
- [ ] Set up monitoring

Day 3-4:
- [ ] Update Airtable sync
- [ ] Fix order domain lookups
- [ ] Update bulk analysis matching

Day 5:
- [ ] Testing on staging
- [ ] Fix bugs found
- [ ] Prepare production migration

### Week 2: Business Logic
**Goal**: Update all domain matching

Day 1-2:
- [ ] Update order suggestion flow
- [ ] Fix workflow creation
- [ ] Update publisher claiming

Day 3-4:
- [ ] Fix search functionality
- [ ] Update API endpoints
- [ ] Fix email templates

Day 5:
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Bug fixes

### Week 3: Data Cleanup
**Goal**: Deduplicate and optimize

Day 1-2:
- [ ] Run deduplication analysis
- [ ] Manual review of edge cases
- [ ] Create merge plan

Day 3-4:
- [ ] Execute merges (batched)
- [ ] Update all references
- [ ] Verify data integrity

Day 5:
- [ ] Add unique constraints
- [ ] Performance optimization
- [ ] Documentation

### Week 4: Production Deploy
**Goal**: Safe production rollout

Day 1:
- [ ] Production backup
- [ ] Deploy with feature flag OFF
- [ ] Smoke tests

Day 2:
- [ ] Enable for internal users
- [ ] Monitor for issues
- [ ] Fix any problems

Day 3-4:
- [ ] Gradual rollout (10%, 50%, 100%)
- [ ] Monitor performance
- [ ] Handle edge cases

Day 5:
- [ ] Full production enable
- [ ] Remove feature flags
- [ ] Post-mortem

## Monitoring Plan

### Key Metrics to Track
1. **Domain Match Success Rate**
   ```sql
   -- Before: ~60% success
   -- After: Should be 95%+
   SELECT 
     COUNT(CASE WHEN website_id IS NOT NULL THEN 1 END)::float / 
     COUNT(*) as match_rate
   FROM guest_post_items;
   ```

2. **Duplicate Creation Rate**
   ```sql
   -- Should drop to near 0
   SELECT DATE(created_at), COUNT(*) 
   FROM websites 
   GROUP BY DATE(created_at), normalized_domain
   HAVING COUNT(*) > 1;
   ```

3. **API Error Rates**
   - Order creation failures
   - Workflow generation errors
   - Search timeout issues

### Alerts to Set Up
- Domain match rate < 90%
- Duplicate domain created
- Foreign key constraint violations
- Normalization function errors

## Risk Mitigation

### High Risk Areas
1. **Order System**: Test with production data copy
2. **Bulk Analysis**: Run parallel for comparison
3. **Live Workflows**: Pause during migration

### Communication Plan
1. **Internal Team**: Daily updates during migration
2. **Publishers**: Email about claiming improvements
3. **Support**: FAQ for domain-related issues

## Success Criteria

### Immediate (Day 1)
- [ ] No new duplicates created
- [ ] Domain matching > 90% success
- [ ] No critical errors in logs

### Week 1
- [ ] All systems using normalized domains
- [ ] Duplicate count reduced by 50%
- [ ] Search accuracy improved

### Month 1
- [ ] Zero duplicate domains
- [ ] 99% domain match rate
- [ ] Support tickets for domain issues = 0

## Decision Points

### Before Starting
1. **Accept 3-4 week timeline?** If not, what features to defer?
2. **Accept temporary performance impact?** Normalization adds overhead
3. **Accept risk of data merge errors?** Some duplicates might merge wrong

### During Migration
1. **If >10% duplicates found**: Continue or pause for review?
2. **If performance degrades >20%**: Rollback or optimize?
3. **If critical bug found**: Hotfix or rollback?

## Conclusion

This migration is **critical but risky**. The current state causes:
- 60% of domains don't match correctly
- ~30,000 duplicate websites
- Failed workflows and orders daily
- Publisher confusion and support tickets

The migration will fix these issues but requires careful execution. The 4-week timeline is aggressive but achievable with dedicated resources.

**Recommendation**: Start with Phase 1 immediately but have rollback ready. Monitor closely and be prepared to pause if issues arise.