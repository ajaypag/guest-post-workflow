# Production Intelligence JSON Fix Instructions

## Overview
This guide explains how to fix malformed JSON in target page intelligence records on your production database.

## The Problem
Some target page intelligence records have double-encoded JSON in their `researchOutput.analysis` field, causing:
- Gaps not showing (0 gaps when there should be many)
- Analysis text appearing as JSON string instead of formatted content
- Brief generation issues

## Solution Steps

### 1. First, Test with Dry Run (RECOMMENDED)

SSH into your production server and navigate to your app directory, then run:

```bash
DATABASE_URL="your-production-database-url" \
npx tsx scripts/fix-production-intelligence-json.ts --dry-run --verbose
```

This will:
- Show you which records need fixing
- NOT make any changes
- Display what would be fixed

### 2. Review the Output

Look for output like:
```
📊 Found X completed intelligence records to check
⚠️ Found double-encoded JSON in analysis field
🔍 Would fix using [method]
📊 Would extract: X gaps, Y sources
```

### 3. Apply the Fix

Once you're satisfied with the dry run results:

```bash
DATABASE_URL="your-production-database-url" \
npx tsx scripts/fix-production-intelligence-json.ts --verbose
```

This will:
- Actually update the database records
- Show you what was fixed
- Provide a summary at the end

### 4. Verify the Fix

After running, check a few things:

1. Visit the target pages in your UI
2. Verify that gaps are now showing
3. Check that the analysis text displays properly
4. Ensure brief generation still works

## What the Script Does

The script fixes three types of JSON issues:

1. **Double-encoded JSON**: Where the entire JSON object is stored as a string
2. **Malformed escape sequences**: Like `\` followed by space
3. **Improperly escaped quotes and newlines**

For each record, it:
- Tries multiple fix methods in order
- Preserves all data (gaps, sources, metadata)
- Only updates records that need fixing
- Logs everything it does

## Safety Features

- **Dry run mode**: Test without making changes
- **Verbose logging**: See exactly what's happening
- **Error handling**: Won't corrupt data if a fix fails
- **Statistics**: Know exactly how many records were fixed

## Alternative: Manual SQL Fix

If you prefer to fix specific records manually via SQL:

```sql
-- First, check the problematic record
SELECT 
  id,
  target_page_id,
  (research_output->>'analysis')::text as analysis_field,
  jsonb_array_length(research_output->'gaps') as gap_count
FROM target_page_intelligence
WHERE brief_status = 'completed'
  AND jsonb_array_length(research_output->'gaps') = 0;

-- To fix a specific record (replace with actual ID)
UPDATE target_page_intelligence
SET research_output = jsonb_build_object(
  'analysis', (research_output->>'analysis')::jsonb->>'analysis',
  'gaps', (research_output->>'analysis')::jsonb->'gaps',
  'sources', (research_output->>'analysis')::jsonb->'sources',
  'metadata', research_output->'metadata'
)
WHERE id = 'your-record-id'
  AND research_output->>'analysis' LIKE '{%';
```

## Rollback (if needed)

If something goes wrong, you can restore from your database backup. Make sure you have a recent backup before running any production fixes.

## Support

If you encounter issues:
1. Check the error messages in verbose mode
2. Try fixing a single record first
3. Ensure your DATABASE_URL has write permissions
4. Check that the tsx package is installed

## Prevention

To prevent this in the future, the code has been updated to:
- Handle double-encoded JSON automatically when reading
- Fix escape sequences on the fly
- Properly structure data when saving

The updated code is in:
- `lib/services/targetPageIntelligenceService.ts`
- `scripts/fix-target-intelligence.ts`