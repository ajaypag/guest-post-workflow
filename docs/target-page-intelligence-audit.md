# Target Page Intelligence - Audit Report & Implementation

## Last Updated: 2025-08-28 (14:35)

### Recent Updates
- **Fixed JSON Display Issue**: Recovery now properly cleans markdown backticks from OpenAI responses
- **Added Audit Logging**: Complete history of all generation attempts with session IDs
- **Transformed Cancel to Recovery**: Cancel endpoint now checks and recovers completed sessions

## Original Issues Identified

### Problem 1: Misleading UX Flow
- "Generate Intelligence" button on client pages suggests immediate generation
- Actually just navigates to intelligence page without generating
- If existing session is 'in_progress', shows as active (confusing)

### Problem 2: No Cost/Time Warnings
- This is an expensive AI operation (15-30 minutes)
- No warning about costs or time before starting
- No confirmation dialog to prevent accidental triggers

### Problem 3: Stuck Sessions
- Sessions would get stuck in "in_progress" state indefinitely
- No way for users to cancel or recover stuck sessions
- No timeout detection or auto-recovery
- Example: Session b96f714a-3162-45e0-b3b1-ec5d089e7509 stuck since 2:40 AM

### Problem 4: Poor Error Handling
- OpenAI API failures not properly captured
- No detailed error information for debugging
- Users left without clear next steps

## Current Technical Flow

1. **Client Page** (`/clients/[id]?tab=pages`)
   - Shows "Generate Intelligence" link for each target page
   - Link navigates to: `/clients/[id]/target-page-intelligence/[targetPageId]`

2. **Intelligence Page** (`/clients/[id]/target-page-intelligence/[targetPageId]`)
   - On mount: Calls `/api/target-pages/[id]/intelligence/latest` to check for existing session
   - If session exists and status is 'in_progress': Shows "Research in Progress" 
   - If no session or completed: Shows "Start Deep Research" button (manual)
   - Only clicking "Start Deep Research" actually triggers the API call

3. **Start Research API** (`/api/target-pages/[id]/intelligence/start-research`)
   - Checks for existing active sessions
   - If active: Returns existing session
   - If not: Creates new session and starts AI research

## ✅ Implemented Solutions

### 1. Timeout Detection (Frontend)
**File**: `components/ui/TargetPageIntelligenceGenerator.tsx`

- Shows warning after 30 minutes (amber alert)
- Shows "stuck" error after 1 hour (red alert)  
- Displays elapsed time since session started
- Visual indicators change based on session age

```typescript
const minutesElapsed = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
const isStuck = minutesElapsed > 60; // Consider stuck after 1 hour

{minutesElapsed > 30 && (
  <div className={isStuck ? 'bg-red-50' : 'bg-amber-50'}>
    <p>{isStuck ? 'Session appears to be stuck' : 'Research is taking longer than expected'}</p>
    <p>Started {minutesElapsed} minutes ago. Normal research takes 15-30 minutes.</p>
  </div>
)}
```

### 2. Cancel Research Button
**Files**: 
- `components/ui/TargetPageIntelligenceGenerator.tsx` - Added cancelResearch function
- `app/api/target-pages/[id]/intelligence/cancel/route.ts` - New endpoint

Features:
- Shows "Cancel Stuck Research" for sessions >1 hour old
- Shows "Cancel Research" for internal users anytime
- Stops polling and marks session as failed
- Stores cancellation metadata for audit trail

### 3. Backend Auto-Recovery  
**File**: `app/api/target-pages/[id]/intelligence/start-research/route.ts`

**IMPORTANT**: Does NOT auto-start new expensive API calls - only marks stuck sessions as failed

```typescript
if (hoursElapsed > 1) {
  console.log(`Auto-recovering stuck session ${existingSession.id} (${hoursElapsed.toFixed(1)} hours old)`);
  
  // Mark as failed - does NOT start new API call
  await db.update(targetPageIntelligence)
    .set({
      researchStatus: 'error',
      briefStatus: 'error',
      metadata: {
        additionalInfo: JSON.stringify({
          autoRecovered: true,
          recoveredAt: new Date().toISOString(),
          originalSessionId: existingSession.researchSessionId,
          stuckDuration: `${hoursElapsed.toFixed(1)} hours`
        })
      }
    })
    .where(eq(targetPageIntelligence.id, existingSession.id));
  
  // Continue with new session creation IF user explicitly clicked start
}
```

### 4. Improved Session Health Check
**File**: `components/ui/TargetPageIntelligenceGenerator.tsx`

- Maximum polling attempts: 360 (30 minutes)
- Consecutive error detection: stops after 5 failures
- Connection loss handling with user-friendly messages

```typescript
const MAX_POLL_ATTEMPTS = 360; // 30 minutes (360 * 5 seconds)

// Stop polling after max attempts
if (pollingCount >= MAX_POLL_ATTEMPTS) {
  clearInterval(pollInterval);
  setResearchStatus('error');
  setError('Research timed out after 30 minutes. The session may be stuck. Please retry.');
  return;
}

// Handle consecutive errors
if (consecutiveErrors >= 5) {
  clearInterval(pollInterval);
  setResearchStatus('error');
  setError('Lost connection to the research session. Please check your connection and retry.');
}
```

### 5. Better Error Handling
**File**: `lib/services/targetPageIntelligenceService.ts`

Captures detailed OpenAI API error information:

```typescript
const errorDetails = {
  message: error?.message || 'Unknown error',
  type: error?.constructor?.name || 'UnknownError',
  code: error?.code,
  status: error?.status,
  timestamp: new Date().toISOString()
};

// Store in metadata for debugging
await db.update(targetPageIntelligence)
  .set({
    researchStatus: 'error',
    metadata: {
      additionalInfo: JSON.stringify({
        error: errorDetails,
        failedSessionId: sessionId
      })
    }
  })
```

## Key Design Decisions

### No Automatic API Restarts
- **Principle**: Never automatically trigger expensive OpenAI API calls
- **Implementation**: Auto-recovery only marks sessions as failed, doesn't restart
- **User Action Required**: Users must explicitly click "Retry Research" or "Start Deep Research"

### Grace Period Before Warnings
- **30 minutes**: Show "taking longer than expected" warning
- **60 minutes**: Show "session stuck" error with cancel option
- **Rationale**: Normal research takes 15-30 minutes, so warnings appear after reasonable time

### Metadata Storage
- All error details stored in `metadata.additionalInfo` as JSON string (due to TypeScript constraints)
- Preserves audit trail of failures and recoveries
- Helps debug OpenAI API issues

## Testing & Verification

### Manual Fix Applied
Fixed stuck session b96f714a-3162-45e0-b3b1-ec5d089e7509:
```typescript
// Script used: fix-stuck-session.ts
await db.update(targetPageIntelligence)
  .set({
    researchStatus: 'error',
    briefStatus: 'error',
    metadata: {
      failureReason: 'OpenAI API error - session stuck',
      failedAt: new Date().toISOString()
    }
  })
  .where(eq(targetPageIntelligence.id, sessionId))
```

### TypeScript Compilation
All changes pass TypeScript checks - verified with `npx tsc --noEmit`

## Future Improvements (Not Implemented)

1. **Add confirmation dialog** before navigating to intelligence page
2. **Show cost/time estimates** before allowing generation
3. **Webhook integration** with OpenAI for real-time updates
4. **Session resume capability** for partially completed sessions
5. **Batch processing** for multiple target pages

## Troubleshooting Guide

### Session Stuck in "Research in Progress"
1. Check if session is >1 hour old - cancel button should appear
2. Use cancel button to mark as failed
3. Or navigate away and back to trigger auto-recovery on next start attempt

### "Lost connection" Error  
1. Check network connection
2. Refresh page to reload session
3. If persists, use cancel button and retry

### OpenAI API Errors
1. Check `metadata.additionalInfo` in database for error details
2. Common issues: rate limits, API outages, invalid URLs
3. Retry after addressing root cause

## Implementation: Audit Logging System

### Database Schema
**File**: `lib/db/intelligenceLogsSchema.ts`

Created comprehensive audit logging table to track all intelligence generation attempts:
```typescript
export const intelligenceGenerationLogs = pgTable('intelligence_generation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetPageId: uuid('target_page_id').notNull().references(() => targetPages.id),
  clientId: uuid('client_id'),
  sessionType: varchar('session_type', { length: 50 }).notNull(), // 'research' | 'brief'
  openaiSessionId: varchar('openai_session_id', { length: 255 }), // resp_xxx reference
  status: varchar('status', { length: 50 }).notNull(), // 'started' | 'completed' | 'failed' | 'recovered'
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  durationSeconds: integer('duration_seconds'),
  errorMessage: text('error_message'),
  outputSize: integer('output_size'), // Size of generated content
  metadata: jsonb('metadata'), // Additional data like gaps count, sources, etc.
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

### Session History Display
**File**: `components/ui/TargetPageIntelligenceGenerator.tsx`

Added collapsible session history section showing all generation attempts:
- Displays attempt counter and timestamp
- Shows session status (completed/failed/recovered)
- Includes clickable session IDs for debugging
- Duration tracking for each attempt

### Recovery Implementation  
**File**: `app/api/target-pages/[id]/intelligence/cancel/route.ts`

Transformed from simple cancel to intelligent check-and-recover:
```typescript
// Check if the research actually completed
const response = await openai.responses.retrieve(existingSession.researchSessionId);

if (response.status === 'completed') {
  // SUCCESS! The research actually completed - recover the results
  await service.processCompletedResearch(targetPageId, existingSession.researchSessionId, response);
  // Log recovery
  await db.insert(intelligenceGenerationLogs).values({
    targetPageId,
    sessionType: 'research',
    openaiSessionId: existingSession.researchSessionId,
    status: 'recovered',
    // ... additional metadata
  });
}
```

### Markdown JSON Block Cleaning
**File**: `lib/services/targetPageIntelligenceService.ts`

OpenAI's o4-mini-deep-research returns responses wrapped in markdown:
```typescript
// Clean markdown JSON blocks if present
if (finalText.includes('```json')) {
  console.log('🧹 Cleaning markdown JSON blocks from response...');
  finalText = finalText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}
```

Applied to both:
- `conductResearch` method (lines 197-200)
- `processCompletedResearch` method (lines 360-363)

## New Issues Discovered (2025-08-28)

### Problem 5: Missing "Send to Client" Endpoint
**Issue**: Target Page Intelligence has a "Send to Client" button that attempts to send questions to clients via email, but the endpoint doesn't exist.

**Details**:
- Frontend was incorrectly calling `/api/clients/[id]/brand-intelligence/send-questions`
- This is the Brand Intelligence endpoint, not Target Page Intelligence
- Results in 404 error when clicking "Send to Client"

**Temporary Fix Applied**:
- Updated frontend to call `/api/target-pages/[id]/intelligence/send-questions`
- Added TODO comment noting endpoint needs to be created
- Will still return 404 but with correct expected path

**Required Implementation**:
Need to create `/api/target-pages/[id]/intelligence/send-questions/route.ts` that:
1. Sends Target Page specific questions to clients
2. Generates unique answer submission link
3. Stores answer token in targetPageIntelligence metadata
4. Sends formatted email with questions and link

**Implementation Completed**: Created `/api/target-pages/[id]/intelligence/send-questions/route.ts`

**Status**: ✅ **WORKING** - Send-questions functionality implemented and tested successfully

**Test Results**:
- ✅ API endpoint returns 200 status
- ✅ Email sent successfully via Resend (ID: 7e2bed76-270f-41cf-b488-2748e4bc52e6)  
- ✅ Answer token generated and stored in database metadata
- ✅ Answer URL created: `/target-page-intelligence/answer/[token]`

**Remaining Gap**: The answer submission page doesn't exist yet
- URL generates correctly but returns 404
- Need to create `/target-page-intelligence/answer/[token]/page.tsx`
- Should follow Brand Intelligence pattern for client answer submission