# Database Schema Rules

> **Why**: Prevent silent failures from VARCHAR size limits  
> **Use when**: Creating tables for AI-generated content  
> **Outcome**: No more "database error" debugging sessions

## The Hidden Killer: VARCHAR Limits

AI agents generate long, descriptive content that exceeds typical VARCHAR sizes.

### ❌ What Goes Wrong
```sql
-- Agent generates: "engagement-focused-with-semantic-clarity-balanced-approach"
polish_approach VARCHAR(100) -- FAILS SILENTLY!
```

Error: Vague "Failed query" with no size hint.

### ✅ Safe Column Sizes

| Content Type | Safe Choice | Why |
|--------------|-------------|-----|
| AI descriptions | `VARCHAR(255)` or `TEXT` | Agents write long descriptions |
| Titles | `VARCHAR(500)` | Special chars count double |
| Long content | `TEXT` | No size limits |
| Status/types | `VARCHAR(50)` | Fixed values are short |

## Creating Agent Tables

### ❌ Wrong Pattern
```sql
CREATE TABLE agent_outputs (
  approach VARCHAR(100),      -- TOO SMALL!
  description VARCHAR(100),   -- TOO SMALL!
  title VARCHAR(255)         -- RISKY!
);
```

### ✅ Correct Pattern
```sql
CREATE TABLE agent_outputs (
  approach VARCHAR(255),      -- Safe for descriptions
  description TEXT,          -- Unlimited length
  title VARCHAR(500),        -- Extra safe
  status VARCHAR(50),        -- OK for fixed values
  content TEXT,              -- Always TEXT for AI content
  error_message TEXT         -- Errors can be long
);
```

## Quick Diagnosis

Visit `/admin/column-check` to see:
- All VARCHAR columns and sizes
- "❌ TOO SMALL" warnings
- One-click fix buttons

## Migration Pattern

```sql
-- Fix existing columns
ALTER TABLE your_table 
  ALTER COLUMN description TYPE TEXT,
  ALTER COLUMN approach TYPE VARCHAR(255),
  ALTER COLUMN title TYPE VARCHAR(500);
```

## Golden Rules

1. **AI writes long**: Default to `TEXT`
2. **Descriptions**: Minimum `VARCHAR(255)`
3. **Titles**: Use `VARCHAR(500)`
4. **When in doubt**: Use `TEXT`
5. **Test with real AI output**: Not "test"

## Common Failures

| Column | Failed Value | Fix |
|--------|--------------|-----|
| `approach VARCHAR(100)` | "engagement-focused-with-semantic-clarity" | `VARCHAR(255)` |
| `title VARCHAR(255)` | Long title with emojis | `VARCHAR(500)` |
| `content VARCHAR(1000)` | Multi-paragraph text | `TEXT` |

## Testing New Tables

1. Create table with proposed schema
2. Generate real AI content
3. Try to insert
4. If fails, check `/admin/varchar-limits`
5. Fix and retry

## Reference

See working examples:
- `v2_agent_sessions` table
- `semantic_audit_sections` table
- `formatting_qa_checks` table

All use `TEXT` for AI-generated content.