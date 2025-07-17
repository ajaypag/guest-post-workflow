# Current Implementation Backup - Pre-Streaming Migration

## Service Implementation (agenticOutlineServiceV2.ts)

### Key Methods Documentation

#### startOutlineGeneration()
- **Purpose**: Initiates o3-deep-research background task
- **Race Condition Check**: Queries for `isActive: true` sessions
- **Auto-cleanup**: Removes failed/stuck sessions older than 30 minutes
- **OpenAI Call**: Uses `background: true, store: true` with `web_search_preview` tool
- **Database**: Creates session with `backgroundResponseId`

#### checkOutlineStatus() 
- **Purpose**: Polls OpenAI for background task status
- **Method**: Uses `responses.retrieve(backgroundResponseId)`
- **Statuses**: queued → in_progress → completed/failed
- **Output Processing**: Extracts text from various response formats
- **Citations**: Parses URLs and source references from output

### Current API Configuration
```typescript
const response = await this.getClient().responses.create({
  model: 'o3-deep-research',
  input: enhancedPrompt,
  background: true,
  store: true, // Required for background mode
  tools: [
    { type: 'web_search_preview' } // Required for o3-deep-research model
  ]
});
```

## Frontend Implementation (AgenticOutlineGeneratorV2.tsx)

### State Management
```typescript
const [status, setStatus] = useState<Status>('idle');
const [sessionId, setSessionId] = useState<string | null>(null);
const [outline, setOutline] = useState<string>('');
const [citations, setCitations] = useState<any[]>([]);
const [pollingCount, setPollingCount] = useState(0);
```

### Polling Logic
```typescript
const startPolling = (sessionId: string) => {
  const pollInterval = setInterval(async () => {
    const response = await fetch(
      `/api/workflows/${workflowId}/outline-generation/status?sessionId=${sessionId}`
    );
    // Updates every 5 seconds
  }, 5000);
};
```

### User Experience Flow
1. User clicks "Start AI Deep Research"
2. Button shows loading state
3. Polling starts immediately (5-second intervals)
4. Status updates: idle → queued → in_progress → completed
5. Progress shows elapsed time and polling count
6. Final result appears all at once

## API Endpoints

### POST /start-v2
- **Input**: workflowId (from URL params)
- **Process**: Extracts outline prompt from topic generation step
- **Output**: `{ success: true, sessionId, status, message }`
- **Error Handling**: Returns 400/500 with error messages

### GET /status
- **Input**: sessionId (query parameter)
- **Process**: Calls `agenticOutlineServiceV2.checkOutlineStatus()`
- **Output**: `{ status, outline?, citations?, progress?, error? }`
- **Caching**: Returns cached results if already completed

### POST /cancel
- **Input**: sessionId in request body
- **Process**: Calls OpenAI `responses.cancel()`
- **Output**: `{ success: boolean }`

### GET /latest
- **Purpose**: Resume existing sessions after page refresh
- **Logic**: Returns active session or latest completed session
- **Used By**: Frontend on component mount

## Database Schema (Current)

### outline_sessions Table
```sql
CREATE TABLE outline_sessions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  step_id VARCHAR(100) NOT NULL DEFAULT 'deep-research',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  outline_prompt TEXT,
  clarification_questions JSONB,
  clarification_answers TEXT,
  agent_state JSONB,
  research_instructions TEXT,
  final_outline TEXT,
  citations JSONB,
  session_metadata JSONB,
  background_response_id VARCHAR(255),
  polling_attempts INTEGER DEFAULT 0,
  last_polled_at TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Current Indexes
```sql
-- No unique constraint on workflow_id + is_active (THIS IS THE RACE CONDITION ISSUE)
-- Standard indexes on id, workflow_id, created_at
```

## Known Working Scenarios

### Happy Path
1. User starts outline generation
2. Session created with `is_active: true`
3. OpenAI background task queued
4. Frontend polls every 5 seconds
5. Task completes in 10-15 minutes
6. Result extracted and saved
7. `is_active` set to `false`
8. User sees completed outline

### Auto-Recovery Scenarios
1. **Stuck Sessions**: Auto-cleaned after 30 minutes
2. **Failed Sessions**: Marked inactive on error
3. **Page Refresh**: Resumes polling existing session
4. **Multiple Versions**: Version number increments for retries

### Error Handling
1. **API Errors**: Saved to `error_message` field
2. **Timeout**: Sessions marked as failed after 30 minutes
3. **Invalid Prompt**: Returns 400 error before OpenAI call
4. **Network Issues**: Frontend continues polling with error logging

## Performance Characteristics

### Timing
- **Average Completion**: 10-15 minutes
- **Polling Frequency**: Every 5 seconds (180 polls for 15-minute task)
- **First Response**: Usually 10-20 seconds for status change
- **Page Load**: ~500ms to check for existing sessions

### Resource Usage
- **Database Queries**: 1 per poll (every 5 seconds)
- **OpenAI API Calls**: 1 per poll to `responses.retrieve()`
- **Memory**: Minimal (no streaming buffers)
- **Network**: Small JSON responses every 5 seconds

## Current Diagnostic Tools

### /admin/o3-deep-research-diagnostics
- **Active Sessions**: Shows current sessions with age and status
- **Failed Sessions**: Lists error sessions with cleanup option
- **System Health**: OpenAI connection, database connection
- **Configuration Test**: Validates setup without making calls

### Available Actions
- **Clean Up Failed**: Marks failed sessions as inactive
- **Check Status**: Manual retry of stuck sessions
- **Refresh Diagnostics**: Re-run health checks

## Integration Points

### Workflow Integration
- **Trigger**: Topic generation step must be completed first
- **Input Source**: `topicGenerationStep.outputs.outlinePrompt`
- **Output Destination**: Deep research step in workflow
- **Navigation**: Auto-advances to next step when saved manually

### Authentication
- **Session Management**: Uses AuthService.getSession()
- **User Context**: Filters workflows by userId
- **Permissions**: Admin users see all workflows

### Error Recovery
- **Auto-cleanup**: Built into startOutlineGeneration()
- **Manual Recovery**: Admin diagnostic tools
- **Data Integrity**: Preserved through all error scenarios

---

**This backup represents the KNOWN WORKING STATE before streaming migration**
**All functionality documented here MUST be preserved during migration**
**Use this as reference for rollback procedures**