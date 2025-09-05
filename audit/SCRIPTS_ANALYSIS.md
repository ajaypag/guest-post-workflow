# Scripts Directory Analysis
**Date**: September 5, 2025
**Total Scripts**: 186 files

## Summary
- **No production dependencies found** - Scripts are not imported by any production code
- **7 scripts are used in package.json** - These are operational and should be kept
- **Most scripts appear to be one-time migrations or debugging utilities**

## Scripts Used in package.json (MUST KEEP)
```json
"db:migrate-apply": "tsx scripts/migrate.ts"
"db:debug": "tsx scripts/debug-and-migrate.ts"
"test:keywords": "tsx scripts/test-keyword-generation.ts"
"audit:images": "tsx scripts/audit-broken-images.ts"
"audit:images:fix": "tsx scripts/audit-broken-images.ts --fix"
"validate:images": "tsx scripts/validate-all-images.ts"
"images:disable": "tsx scripts/comment-out-all-images.ts"
```

## Script Categories by Prefix

| Prefix | Count | Purpose | Recommendation |
|--------|-------|---------|----------------|
| test-* | 47 | Test/debug scripts | Review individually |
| check-* | 30 | Database/data checks | Likely one-time, can delete after review |
| run-* | 11 | Migration runners | Check if already executed |
| fix-* | 9 | Data fixes | Check if already applied |
| audit-* | 7 | Data auditing | Keep operational ones |
| verify-* | 5 | Verification scripts | Likely one-time |
| analyze-* | 5 | Analysis scripts | Likely one-time |
| setup-* | 4 | Setup scripts | Check if needed for new installs |

## Migration Scripts (27 files)
These appear to be database migrations that may have already been run:
- `migrate.ts` - Main migration script (KEEP - used in package.json)
- `apply-niche-migration.ts`
- `check-migration-status.ts`
- `migrate-normalized-urls.ts`
- `migrate-websites-to-publishers.ts`
- `phase2-migrate-to-cents.ts`
- `run-*-migration.ts` (multiple files)
- `test-*-migration.ts` (test versions)

## Recommendations

### 1. KEEP (Operational - 7 files)
Files referenced in package.json:
- `migrate.ts`
- `debug-and-migrate.ts`
- `test-keyword-generation.ts`
- `audit-broken-images.ts`
- `validate-all-images.ts`
- `comment-out-all-images.ts`

### 2. REVIEW BEFORE DELETING
Migration scripts that might still be needed:
- Check if migrations have been applied to production
- Some might be needed for new deployments

### 3. LIKELY SAFE TO DELETE (after verification)
One-time scripts (prefix: check-, test-, verify-, analyze-):
- 47 test-* scripts
- 30 check-* scripts  
- 5 verify-* scripts
- 5 analyze-* scripts

Total: ~87 scripts that appear to be one-time debugging/testing utilities

## Next Steps
1. **Verify migration status** - Check which migrations have been applied
2. **Keep operational scripts** - The 7 scripts used in package.json
3. **Archive old migrations** - Move completed migrations to an archive folder
4. **Delete test/debug scripts** - Remove one-time test and check scripts

## Important Notes
- No scripts are imported from production code, so deletion won't break the app
- Many scripts appear to be ad-hoc debugging tools that accumulated over time
- Consider implementing a cleanup policy for temporary scripts