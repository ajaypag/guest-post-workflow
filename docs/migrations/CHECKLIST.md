# Database Migration Checklist

> **Why**: Ensure new features work without debugging sessions  
> **Use when**: Adding tables for agentic features  
> **Outcome**: Smooth deployment with proper admin tools

## Pre-Migration Checklist

- [ ] Design schema with TEXT for AI content
- [ ] Plan admin UI pages
- [ ] Create diagnostic endpoints
- [ ] Test with real AI output

## Migration Steps

### 1. Create Schema File
```typescript
// lib/db/schema/yourFeature.ts
export const yourFeatureSessions = pgTable('your_feature_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  
  // AI content - always TEXT
  inputs: text('inputs'),
  outputs: text('outputs'), 
  errorMessage: text('error_message'),
  
  // Metadata
  sessionMetadata: jsonb('session_metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

### 2. Generate Migration
```bash
npm run db:generate
# Creates SQL in drizzle/migrations/
```

### 3. Create Admin UI

#### Migration Management
```typescript
// app/admin/database-migration/page.tsx
<MigrationSection
  title="Your Feature"
  checkEndpoint="/api/admin/check-your-feature"
  createEndpoint="/api/admin/migrate-your-feature"
  removeEndpoint="/api/admin/remove-your-feature"
/>
```

#### Feature Diagnostics  
```typescript
// app/admin/fix-your-feature/page.tsx
- Check tables exist
- Verify column sizes
- Test data insertion
- Auto-fix buttons
```

### 4. Create API Endpoints

```typescript
// app/api/admin/migrate-your-feature/route.ts
export async function GET() {
  // Check if tables exist
}

export async function POST() {
  // Create tables
}

export async function DELETE() {
  // Drop tables (dev only)
}
```

### 5. Test Migration Flow

1. Visit `/admin/database-migration`
2. Click "Check" - should show missing
3. Click "Create" - tables created
4. Click "Check" - should show exists
5. Test feature end-to-end

## Post-Migration Checklist

- [ ] Tables created in production
- [ ] Admin UI accessible
- [ ] Diagnostics working
- [ ] Feature saves data correctly
- [ ] No VARCHAR size errors

## Common Issues

### Tables Not Creating
- Check migration file exists
- Verify SQL syntax
- Look for connection errors

### Admin UI Not Working
- Endpoints returning 404?
- Check route.ts exports
- Verify API paths match

### Data Not Saving
- Check column names match code
- Verify NOT NULL constraints
- Test with shorter data

## Required Admin Pages

Every feature needs:
1. Section in `/admin/database-migration`
2. Dedicated `/admin/fix-[feature]` page
3. Inclusion in `/admin/diagnostics`
4. Column check in `/admin/varchar-limits`

## SQL Patterns

### Safe Defaults
```sql
-- Status columns
status VARCHAR(50) NOT NULL DEFAULT 'pending'

-- Timestamps
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- AI content
content TEXT -- Never VARCHAR for AI
```

### Indexes
```sql
-- Foreign keys
CREATE INDEX idx_workflow_id ON your_table(workflow_id);

-- Status queries
CREATE INDEX idx_status ON your_table(status);
```

## Rollback Plan

```sql
-- Keep rollback ready
DROP TABLE IF EXISTS your_feature_sessions CASCADE;
DROP TABLE IF EXISTS your_feature_items CASCADE;
```

## Success Criteria

- [ ] Feature works end-to-end
- [ ] No "database error" messages
- [ ] Admin can diagnose issues
- [ ] Migration is repeatable

## Next Steps

- Document in DEVELOPER_GUIDE.md
- Monitor for VARCHAR issues
- Add to diagnostic suite