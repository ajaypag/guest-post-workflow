# Emergency Rollback Procedures for Streaming Migration

## Immediate Rollback (< 5 minutes)

### Step 1: Disable Streaming Feature Flag
```bash
# Set environment variable to disable streaming
export NEXT_PUBLIC_USE_STREAMING=false

# Or update .env.local
echo "NEXT_PUBLIC_USE_STREAMING=false" >> .env.local

# Restart application
npm run build && npm start
```

### Step 2: Verify Polling Restoration
1. Navigate to `/admin/o3-deep-research-diagnostics`
2. Check that system shows "polling mode"
3. Test outline generation with small workflow
4. Confirm results appear correctly

### Step 3: Database Cleanup (if needed)
```sql
-- If unique constraint causes issues, temporarily disable
DROP INDEX IF EXISTS uniq_outline_active_per_workflow;

-- Reset any stuck active sessions
UPDATE outline_sessions 
SET is_active = false 
WHERE is_active = true 
AND (status = 'error' OR updated_at < NOW() - INTERVAL '30 minutes');
```

## Git Rollback (< 10 minutes)

### Option A: Revert to Known Good Commit
```bash
# Find the last known good commit (before streaming migration)
git log --oneline -10

# Hard reset to that commit (DESTRUCTIVE - only if emergency)
git reset --hard <COMMIT_HASH>

# Force push (only in emergency)
git push --force-with-lease origin main
```

### Option B: Revert Specific Changes
```bash
# Revert streaming migration commits
git revert <STREAMING_COMMIT_RANGE>

# Push reverts
git push origin main
```

## Database Schema Rollback

### Remove Streaming Fields
```sql
-- Remove streaming-specific columns (if added)
ALTER TABLE outline_sessions DROP COLUMN IF EXISTS last_sequence_number;
ALTER TABLE outline_sessions DROP COLUMN IF EXISTS connection_status;
ALTER TABLE outline_sessions DROP COLUMN IF EXISTS stream_started_at;
ALTER TABLE outline_sessions DROP COLUMN IF EXISTS partial_content;

-- Remove unique constraint
DROP INDEX IF EXISTS uniq_outline_active_per_workflow;
```

### Data Integrity Check
```sql
-- Verify no orphaned sessions
SELECT COUNT(*) FROM outline_sessions WHERE is_active = true;

-- Check for any corrupted data
SELECT id, status, is_active, error_message 
FROM outline_sessions 
WHERE status IN ('error', 'failed') 
AND is_active = true;
```

## File-Level Rollback

### Preserve Original Files
Current implementation files that MUST be preserved:
- `/lib/services/agenticOutlineServiceV2.ts` (DO NOT DELETE)
- `/components/ui/AgenticOutlineGeneratorV2.tsx` (DO NOT DELETE)
- `/app/api/workflows/[id]/outline-generation/start-v2/route.ts` (DO NOT DELETE)
- `/app/api/workflows/[id]/outline-generation/status/route.ts` (DO NOT DELETE)

### Remove New Files (if needed)
Files safe to remove during rollback:
- `/lib/services/agenticOutlineServiceV3.ts`
- `/app/api/workflows/[id]/outline-generation/stream/route.ts`
- `/app/admin/streaming-diagnostics/`
- `/app/admin/streaming-migration/`

## Monitoring During Rollback

### Health Checks
1. **Outline Generation Test**
   - Create test workflow
   - Start outline generation
   - Verify polling works
   - Confirm result saves correctly

2. **Database Integrity**
   - Check for active sessions
   - Verify no constraint violations
   - Confirm data consistency

3. **User Experience**
   - Test with actual user account
   - Verify no double-charging
   - Check error handling

### Metrics to Monitor
- Outline generation success rate
- Time to completion
- Error rates
- User complaints
- Database query performance

## Communication Plan

### Internal Team
1. **Immediate notification**: "Streaming rollback initiated"
2. **Status updates**: Every 15 minutes during rollback
3. **Completion notice**: "Rollback complete, system stable"

### User Communication
1. **During rollback**: "Temporary service maintenance"
2. **Post-rollback**: "Service restored, please retry failed operations"

## Post-Rollback Analysis

### Required Actions
1. **Incident Report**: Document what went wrong
2. **Data Analysis**: Check for any lost/corrupted data
3. **User Impact Assessment**: Identify affected users
4. **Cost Analysis**: Calculate any unexpected charges

### Recovery Plan
1. **Fix underlying issues**: Address root cause
2. **Enhanced testing**: More comprehensive test suite
3. **Gradual re-migration**: Slower, more careful approach
4. **Improved monitoring**: Better early warning systems

## Emergency Contacts

### Technical Issues
- **Primary**: Development Team Lead
- **Database**: Database Administrator
- **Infrastructure**: DevOps Team

### Business Issues
- **User Support**: Customer Success Team
- **Financial**: Billing Team (for charge reversals)
- **Executive**: CTO notification for major rollbacks

## Rollback Decision Matrix

| Severity | Indicators | Response | Timeline |
|----------|------------|----------|----------|
| **Critical** | Data loss, widespread failures | Immediate rollback | < 5 min |
| **High** | >10% error rate, user complaints | Scheduled rollback | < 30 min |
| **Medium** | Performance degradation | Investigate first | < 2 hours |
| **Low** | Minor UI issues | Continue monitoring | Next release |

---

**Last Updated**: 2025-01-17
**Approved By**: Development Team
**Review Date**: Before each migration phase