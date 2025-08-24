# Shadow Publisher Migration Strategy

## Recommended Approach: Soft Delete with Migration Tracking

### Database Schema Additions

```sql
-- Add migration tracking to shadow tables
ALTER TABLE shadow_publisher_websites ADD COLUMN IF NOT EXISTS 
    migration_status VARCHAR(20) DEFAULT 'pending',  -- pending, migrated, failed
    migrated_at TIMESTAMP WITH TIME ZONE,
    migration_notes TEXT;

-- Add source tracking to main tables
ALTER TABLE publisher_websites ADD COLUMN IF NOT EXISTS
    source VARCHAR(50) DEFAULT 'direct',  -- direct, shadow_migration, manual
    shadow_source_id VARCHAR(36);  -- Reference to original shadow record
```

### Migration Process

```typescript
async function migrateShawdowPublisher(publisherId: string) {
  const transaction = await db.transaction(async (tx) => {
    // 1. Get all shadow data
    const shadowWebsites = await tx
      .select()
      .from(shadowPublisherWebsites)
      .where(eq(shadowPublisherWebsites.publisherId, publisherId));
    
    // 2. Migrate to main tables
    for (const shadow of shadowWebsites) {
      // Create in publisher_websites
      await tx.insert(publisherWebsites).values({
        id: crypto.randomUUID(),
        publisherId: publisherId,
        websiteId: shadow.websiteId,
        source: 'shadow_migration',
        shadow_source_id: shadow.id,
        // ... other fields
      });
      
      // 3. Mark shadow record as migrated
      await tx.update(shadowPublisherWebsites)
        .set({
          migration_status: 'migrated',
          migrated_at: new Date(),
          migration_notes: 'Auto-migrated on claim'
        })
        .where(eq(shadowPublisherWebsites.id, shadow.id));
    }
    
    // 4. Activate offerings
    await tx.update(publisherOfferings)
      .set({ isActive: true })
      .where(eq(publisherOfferings.publisherId, publisherId));
  });
}
```

### Benefits of This Approach

1. **Audit Trail**: Complete history of data origin
2. **Debugging**: Can trace issues back to source
3. **Analytics**: Can analyze shadow → active conversion rates
4. **Rollback**: Can revert if migration has issues
5. **Clean Queries**: Active queries ignore migrated records
6. **Compliance**: Data retention for regulatory requirements

### Cleanup Strategy

```sql
-- Periodic cleanup (run monthly)
-- Archive migrated shadow records older than 90 days
INSERT INTO shadow_publisher_websites_archive
SELECT * FROM shadow_publisher_websites 
WHERE migration_status = 'migrated' 
  AND migrated_at < NOW() - INTERVAL '90 days';

-- Then delete from active table
DELETE FROM shadow_publisher_websites 
WHERE migration_status = 'migrated' 
  AND migrated_at < NOW() - INTERVAL '90 days';
```

### Query Patterns

```typescript
// Only get active shadow publishers (not migrated)
const activeShadowPublishers = await db
  .select()
  .from(shadowPublisherWebsites)
  .where(eq(shadowPublisherWebsites.migration_status, 'pending'));

// Track migration success rate
const migrationStats = await db
  .select({
    status: shadowPublisherWebsites.migration_status,
    count: count()
  })
  .from(shadowPublisherWebsites)
  .groupBy(shadowPublisherWebsites.migration_status);
```

### Implementation Checklist

- [ ] Add migration columns to shadow tables
- [ ] Add source tracking to main tables
- [ ] Create migration service
- [ ] Add migration to claim endpoint
- [ ] Create cleanup job
- [ ] Add monitoring/metrics
- [ ] Test rollback procedure
- [ ] Document for team

### Migration States

```
pending → migrating → migrated ✓
                  ↓
                failed (with retry)
```

### Error Handling

```typescript
try {
  await migrateShawdowPublisher(publisherId);
} catch (error) {
  // Mark as failed but don't break claim process
  await db.update(shadowPublisherWebsites)
    .set({
      migration_status: 'failed',
      migration_notes: error.message
    })
    .where(eq(shadowPublisherWebsites.publisherId, publisherId));
  
  // Log for manual review
  console.error('Shadow migration failed:', { publisherId, error });
  
  // Continue with claim (empty dashboard better than failed claim)
}
```

## Alternative: Unified Table Approach

Instead of separate shadow/active tables, use a single table with status:

```sql
publisher_websites (
  status: 'shadow' | 'active' | 'archived'
)
```

Pros:
- Simpler schema
- Easier queries
- Natural progression

Cons:
- Mixed concerns in one table
- Harder to optimize
- More complex permissions