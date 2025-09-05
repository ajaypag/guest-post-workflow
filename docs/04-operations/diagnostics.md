# Production Diagnostics Guide

> **Why**: Debug vague database errors in minutes, not hours  
> **Use when**: Agent features fail with unclear errors  
> **Outcome**: Specific root cause and fix instructions

## Diagnostic Workflow (10 min total)

### Phase 1: Structure Analysis (2 min)
```bash
# Visit comprehensive diagnostics
/admin/diagnostics

# Look for:
- Missing columns
- Schema mismatches  
- JSON vs table storage conflicts
```

### Phase 2: Column Sizes (2 min)
```bash
# Check VARCHAR limits
/admin/varchar-limits

# Auto-fix small columns
Click "Fix Column Sizes"
```

### Phase 3: Error Details (2 min)
```bash
# Test with real data
/admin/test-database-inserts

# Get PostgreSQL error codes
# Not just "database error"
```

### Phase 4: Migration Status (2 min)
```bash
# Verify tables exist
/admin/database-migration

# Run missing migrations
Click "Create Tables"
```

## Common Issues & Quick Fixes

### "Column does not exist"
**Cause**: Code expects separate table, data is in JSON  
**Fix**: Update queries to read from `workflows.content`
```typescript
// Wrong
const steps = await db.query.workflow_steps.findMany();

// Right  
const workflow = await db.query.workflows.findFirst();
const steps = workflow.content?.steps || [];
```

### "Failed query: insert"
**Cause**: VARCHAR too small for AI content  
**Fix**: Visit `/admin/varchar-limits` → Auto-fix
```sql
ALTER TABLE your_table ALTER COLUMN description TYPE TEXT;
```

### "Invalid input syntax for integer"
**Cause**: Decimal sent to integer column  
**Fix**: Round numbers before insert
```typescript
confidenceScore: Math.round(score) // 8.5 → 9
```

### "Null constraint violation"  
**Cause**: NULL sent to NOT NULL column  
**Fix**: Use empty string default
```typescript
errorMessage: error?.message || '' // Never null
```

## Admin Pages Reference

| Page | Purpose | When to Use |
|------|---------|-------------|
| `/admin/diagnostics` | Full system analysis | First stop for any issue |
| `/admin/varchar-limits` | Column size checker | "Failed insert" errors |
| `/admin/database-migration` | Table management | Missing table errors |
| `/admin/fix-[feature]` | Feature-specific tools | Feature not working |

## Creating Diagnostic Pages

Every agentic feature needs:

1. **Migration page section**
```typescript
// In /admin/database-migration
<FeatureMigration 
  name="Your Feature"
  checkEndpoint="/api/admin/check-your-feature"
  migrateEndpoint="/api/admin/migrate-your-feature"
/>
```

2. **Feature diagnostic page**
```typescript
// /admin/fix-your-feature
- Table existence check
- Column size verification  
- Test data insertion
- Auto-fix buttons
```

3. **API endpoints**
```typescript
// Required endpoints
GET  /api/admin/check-your-feature
POST /api/admin/migrate-your-feature  
POST /api/admin/fix-your-feature-columns
```

## PostgreSQL Error Codes

| Code | Meaning | Common Fix |
|------|---------|------------|
| 23502 | NOT NULL violation | Use empty string |
| 22001 | String too long | Increase VARCHAR/use TEXT |
| 42703 | Column not found | Check actual schema |
| 22P02 | Invalid text for type | Type conversion needed |

## Emergency Queries

```sql
-- See actual table structure
\d table_name

-- Check column sizes
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'your_table';

-- Recent errors
SELECT * FROM pg_stat_activity 
WHERE state = 'idle in transaction';
```

## Prevention Checklist

- [ ] Always use TEXT for AI content
- [ ] Create admin UI for new features
- [ ] Test with real AI output
- [ ] Capture PostgreSQL errors
- [ ] Document column purposes

## Next Steps

- Implement diagnostics BEFORE issues arise
- Monitor `/admin/diagnostics` weekly
- Update this guide with new patterns