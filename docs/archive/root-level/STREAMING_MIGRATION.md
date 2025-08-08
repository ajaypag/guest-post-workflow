# Streaming Migration Documentation

## Current State Analysis (Pre-Migration)

### Existing Implementation Overview

#### Current Polling Architecture
- **Service**: `/lib/services/agenticOutlineServiceV2.ts`
- **Frontend**: `/components/ui/AgenticOutlineGeneratorV2.tsx`
- **API Endpoints**:
  - `POST /api/workflows/[id]/outline-generation/start-v2` - Start generation
  - `GET /api/workflows/[id]/outline-generation/status` - Poll for status
  - `POST /api/workflows/[id]/outline-generation/cancel` - Cancel generation
  - `GET /api/workflows/[id]/outline-generation/latest` - Get latest session

#### Current Database Schema
```sql
Table: outline_sessions
- id: UUID (Primary Key)
- workflow_id: UUID (Foreign Key)
- version: INTEGER (Default 1)
- step_id: VARCHAR(100) (Default 'deep-research')
- status: VARCHAR(50) (Default 'pending')
- outline_prompt: TEXT
- clarification_questions: JSONB
- clarification_answers: TEXT
- agent_state: JSONB
- research_instructions: TEXT
- final_outline: TEXT
- citations: JSONB
- session_metadata: JSONB
- background_response_id: VARCHAR(255)
- polling_attempts: INTEGER (Default 0)
- last_polled_at: TIMESTAMP
- is_active: BOOLEAN (Default false)
- error_message: TEXT
- started_at: TIMESTAMP NOT NULL
- completed_at: TIMESTAMP
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL
```

#### Current Workflow
1. User clicks "Start AI Deep Research"
2. Frontend calls `/start-v2` endpoint
3. Backend creates outline session with `is_active: true`
4. Backend calls OpenAI with `background: true` (no streaming)
5. Frontend starts polling every 5 seconds
6. Backend polls OpenAI's `responses.retrieve()` for status
7. When complete, backend saves result and sets `is_active: false`
8. Frontend displays final result

#### Known Issues with Current Implementation
1. **Race Conditions**: Multiple clicks can create duplicate sessions
2. **Poor UX**: No real-time feedback during 15+ minute processing
3. **Polling Overhead**: Unnecessary API calls every 5 seconds
4. **No Progress Indication**: Users don't know what's happening
5. **Connection Issues**: No handling of browser refresh/navigation
6. **Cost Inefficiency**: Polling creates extra API calls

### Current File Structure
```
/lib/services/
  ├── agenticOutlineServiceV2.ts (Current implementation)
  
/components/ui/
  ├── AgenticOutlineGeneratorV2.tsx (Current frontend)
  
/app/api/workflows/[id]/outline-generation/
  ├── start-v2/route.ts
  ├── status/route.ts
  ├── cancel/route.ts
  └── latest/route.ts

/app/admin/
  ├── o3-deep-research-diagnostics/ (Current diagnostics)
  └── outline-generation-diagnostics/
```

## Migration Strategy

### Phase 1: Analysis & Backup ✅
- Document current implementation
- Create rollback procedures
- Establish testing criteria

### Phase 2: Database Schema Migration
- Add streaming support fields
- Add unique constraint for race condition prevention
- Create migration health checks

### Phase 3: Parallel Implementation
- Create V3 service with streaming
- Keep V2 service intact for rollback
- Feature flag system for switching

### Phase 4: Frontend Enhancement
- Add streaming support alongside polling
- Implement connection resilience
- Add progress indicators

### Phase 5: Testing & Validation
- Comprehensive test suite
- Load testing
- User acceptance testing

### Phase 6: Gradual Rollout
- Feature flag controlled rollout
- Real-time monitoring
- Immediate rollback capability

## Rollback Strategy

### Emergency Rollback Procedure
1. **Immediate**: Set feature flag `USE_STREAMING=false`
2. **Database**: Revert unique constraint if needed
3. **Code**: Switch back to V2 service
4. **Monitor**: Confirm polling functionality restored

### Rollback Triggers
- Error rate > 5% compared to current
- User reports of missing content
- Database constraint issues
- Performance degradation

### Backup Locations
- Current code preserved in V2 files
- Database schema migrations are reversible
- Feature flags allow instant switching

## Success Metrics

### Performance Improvements
- Time to first content: < 30 seconds (vs current: 5+ seconds for first poll)
- User engagement: Real-time content streaming
- API efficiency: Eliminate polling overhead

### Reliability Improvements
- Zero double-charging via unique constraint
- Connection resilience with resume capability
- Better error handling and recovery

### User Experience Improvements
- Real-time progress indication
- Immediate feedback on generation start
- Graceful handling of connection issues

## Risk Assessment

### High Risk Items
1. **Database Migration**: Unique constraint on active sessions
2. **API Changes**: New streaming endpoint behavior
3. **Connection Management**: SSE connection handling

### Medium Risk Items
1. **Frontend Changes**: EventSource implementation
2. **Feature Flag Logic**: Switching between implementations
3. **Error Handling**: Streaming-specific error cases

### Low Risk Items
1. **Diagnostic Tools**: Additional monitoring capabilities
2. **Admin Interfaces**: Migration management tools
3. **Documentation**: Updated procedures

## Testing Plan

### Unit Tests
- Streaming service functionality
- Database constraint behavior
- Frontend EventSource handling

### Integration Tests
- End-to-end streaming workflow
- Connection drop/resume scenarios
- Feature flag switching

### Load Tests
- Multiple concurrent streams
- Long-running session stability
- Resource usage monitoring

---

**Migration Lead**: Claude Code Assistant
**Started**: 2025-01-17
**Current Phase**: 1 - Analysis & Backup
**Status**: In Progress