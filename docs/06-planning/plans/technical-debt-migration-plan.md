# Technical Debt Migration Plan: Database Field Cleanup

## Overview
During ManyReach V3 extraction system analysis, we discovered fields placed in incorrect database tables due to legacy development. This migration plan addresses systematic cleanup without breaking current application functionality.

## Identified Technical Debt

### Fields in Wrong Tables (To Be Migrated)
```
❌ CURRENT (INCORRECT):
publishers.contentGuidelines → Should be in publisherOfferings.contentGuidelines
publishers.prohibitedTopics → Should be in publisherOfferings.prohibitedTopics
publishers.turnaroundTime → Should be in publisherOfferings.turnaroundDays
websites.restrictions.forbiddenNiches → Should be in publisherOfferings.prohibitedTopics

✅ CORRECT PLACEMENT:
publisherOfferings.contentGuidelines (TEXT) - Service-specific content quality standards
publisherOfferings.prohibitedTopics (TEXT) - Service-specific content restrictions  
publisherOfferings.turnaroundDays (INTEGER) - Service-specific delivery timeframes
publisherOfferings.expressAvailable (REMOVED) - Legacy field, no longer needed
publisherOfferings.expressPrice (REMOVED) - Legacy field, no longer needed
publisherOfferings.expressDays (REMOVED) - Legacy field, no longer needed
```

### Business Logic Justification
- **Content Guidelines**: Different services have different quality requirements (guest post vs link insertion)
- **Prohibited Topics**: Service-specific restrictions (e.g., finance guest posts vs general link insertions)  
- **Turnaround Time**: Varies by service type and complexity, not publisher-wide

## Migration Strategy (Zero-Downtime Approach)

### Phase 1: Schema Expansion (Safe Addition)
**Objective**: Add new fields to correct tables without removing old ones
**Risk Level**: LOW - Pure addition, no breaking changes

```sql
-- Add correct fields to publisherOfferings table
ALTER TABLE publisher_offerings 
ADD COLUMN content_guidelines TEXT,
ADD COLUMN prohibited_topics TEXT,
ADD COLUMN turnaround_days INTEGER;

-- Add indexes for performance
CREATE INDEX idx_publisher_offerings_turnaround ON publisher_offerings(turnaround_days);
```

**Verification**: 
- No application code changes required
- Old fields remain functional
- New fields available for V3 extraction

### Phase 2: Data Migration (Gradual Transfer)
**Objective**: Copy data from wrong tables to correct tables
**Risk Level**: MEDIUM - Data consistency critical

```sql
-- Migration script (run in transaction)
BEGIN;

-- Copy data for each publisher's primary offering
INSERT INTO publisher_offerings (
    publisher_id,
    offering_type,
    content_guidelines,
    prohibited_topics, 
    turnaround_days,
    base_price,
    currency
)
SELECT 
    p.id as publisher_id,
    'guest_post' as offering_type,
    p.content_guidelines,
    p.prohibited_topics,
    p.turnaround_time as turnaround_days,
    0 as base_price, -- Default, will be updated by V3 extraction
    'USD' as currency
FROM publishers p
WHERE p.content_guidelines IS NOT NULL 
   OR p.prohibited_topics IS NOT NULL 
   OR p.turnaround_time IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM publisher_offerings po 
    WHERE po.publisher_id = p.id 
    AND po.offering_type = 'guest_post'
);

-- Verify data integrity
SELECT 
    (SELECT COUNT(*) FROM publishers WHERE content_guidelines IS NOT NULL) as source_count,
    (SELECT COUNT(*) FROM publisher_offerings WHERE content_guidelines IS NOT NULL) as target_count;

COMMIT;
```

**Data Validation**:
- Compare record counts before/after
- Spot check sample records
- Verify no data truncation occurred

### Phase 3: Application Code Updates (Gradual Transition)
**Objective**: Update application to use correct tables
**Risk Level**: HIGH - Requires thorough testing

#### A. Update Database Queries
```typescript
// OLD (publishers table)
const publisherInfo = await db.select({
  contentGuidelines: publishers.contentGuidelines,
  prohibitedTopics: publishers.prohibitedTopics,
  turnaroundTime: publishers.turnaroundTime
}).from(publishers).where(eq(publishers.id, publisherId));

// NEW (publisherOfferings table)  
const serviceInfo = await db.select({
  contentGuidelines: publisherOfferings.contentGuidelines,
  prohibitedTopics: publisherOfferings.prohibitedTopics, 
  turnaroundDays: publisherOfferings.turnaroundDays
}).from(publisherOfferings)
.where(eq(publisherOfferings.publisherId, publisherId));
```

#### B. Update UI Components
```typescript
// Update forms and displays to reference offering-specific guidelines
// instead of publisher-wide guidelines
```

#### C. Update API Endpoints
- `/api/publishers/[id]` - Remove deprecated fields
- `/api/publisher-offerings/[id]` - Add migrated fields
- Maintain backward compatibility during transition

### Phase 4: Schema Cleanup (Final Removal)
**Objective**: Remove old fields after successful migration
**Risk Level**: HIGH - Irreversible, requires confidence in migration success

```sql
-- DANGER: Only run after thorough testing and application updates
-- Create backup first
CREATE TABLE publishers_backup_pre_cleanup AS SELECT * FROM publishers;

-- Remove deprecated fields
ALTER TABLE publishers 
DROP COLUMN content_guidelines,
DROP COLUMN prohibited_topics,
DROP COLUMN turnaround_time;
```

**Pre-Cleanup Checklist**:
- [ ] All application code updated and tested
- [ ] Data successfully migrated and verified
- [ ] Backup created and tested
- [ ] Rollback plan prepared
- [ ] Stakeholder approval obtained

## Implementation Timeline

### Week 1: Phase 1 (Schema Expansion)
- [ ] Create migration script for new fields
- [ ] Test migration on development database
- [ ] Deploy schema changes to staging
- [ ] Verify no breaking changes to existing functionality

### Week 2: Phase 2 (Data Migration) 
- [ ] Develop and test data migration script
- [ ] Create data validation procedures
- [ ] Execute migration on staging environment
- [ ] Verify data integrity and completeness

### Week 3-4: Phase 3 (Application Updates)
- [ ] Update database access patterns
- [ ] Modify UI components for new field locations
- [ ] Update API endpoints with new schema
- [ ] Comprehensive testing of all publisher/offering workflows

### Week 5: Phase 4 (Schema Cleanup)
- [ ] Final testing and validation
- [ ] Create production backup
- [ ] Execute field removal
- [ ] Monitor for any issues post-cleanup

## Rollback Strategy

### Emergency Rollback (if issues discovered)
```sql
-- Quick restore from backup
DROP TABLE publishers;
ALTER TABLE publishers_backup_pre_cleanup RENAME TO publishers;

-- Restore application to use old schema
git revert [migration-commit-hash]
```

### Gradual Rollback (if systematic issues found)
1. Revert application code to use old fields
2. Copy data back from offerings to publishers
3. Remove new fields from offerings table
4. Resume normal operations

## Validation and Quality Assurance

### Pre-Migration Validation
- [ ] Inventory all current uses of deprecated fields
- [ ] Document expected data patterns and volumes
- [ ] Create automated tests for migration process

### Post-Migration Validation  
- [ ] Data completeness checks (no records lost)
- [ ] Data accuracy verification (content preserved)
- [ ] Application functionality testing
- [ ] Performance impact assessment

### Success Criteria
- Zero data loss during migration
- All existing functionality preserved
- New V3 extraction system can use correct schema
- Performance equal or better than before migration

## Impact on V3 Extraction System

### Benefits After Migration
```typescript
// V3 can now create service-specific offerings properly
{
  "offerings": [
    {
      "offeringType": "guest_post",
      "basePrice": 25000,
      "turnaroundDays": 7,
      "contentGuidelines": "1000+ words, original content...",
      "prohibitedTopics": ["CBD", "Casino", "Adult"]
    },
    {
      "offeringType": "link_insertion", 
      "basePrice": 5000,
      "turnaroundDays": 2,
      "contentGuidelines": "Contextual placement only...",
      "prohibitedTopics": ["Competitor links"]
    }
  ]
}
```

### V3 Extraction Advantages
- Service-specific guidelines properly captured
- Multiple offerings per publisher supported
- Pricing rules can reference correct offering fields
- Database relationships properly maintained

## Communication Plan

### Internal Team Notification
- Timeline and phases communicated 2 weeks before start
- Daily progress updates during migration weeks
- Immediate notification of any issues or delays

### Application Users (if applicable)
- Advance notice of any temporary limitations
- Clear communication about improved functionality post-migration
- Support resources for any questions

---

**This migration plan ensures zero-downtime field relocation while enabling the V3 extraction system to use proper database architecture.**