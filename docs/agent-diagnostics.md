# Agent Diagnostics System

## Overview
The Agent Diagnostics system provides real-time monitoring and debugging capabilities for OpenAI agent text response issues. It captures all events during agent execution and provides a user-friendly interface for non-developers to understand what's happening.

## Key Features

### 1. Comprehensive Event Capture
- **Text-only responses**: Detects when agents output text instead of using tools
- **Tool calls**: Tracks successful tool invocations
- **Retry attempts**: Monitors retry nudge effectiveness
- **Errors**: Captures and displays execution errors

### 2. Real-time Monitoring
- Live event streaming as agents execute
- Auto-refresh capability for active sessions
- Session status tracking (running, completed, error)

### 3. Admin Interface
- Located at `/admin/agent-diagnostics`
- Shows recent sessions with summary statistics
- Click any session to view detailed event timeline
- Diagnostic summary with recommendations

## How to Use

### 1. Accessing the Interface
Navigate to `/admin/agent-diagnostics` from the admin dashboard.

### 2. Understanding Session List
Each session shows:
- Session ID (truncated for display)
- Agent type (semantic audit, article writing, etc.)
- Status badge (running, completed, error)
- Event counters (text responses, retries, tool calls, errors)

### 3. Viewing Event Details
Click on any session to see:
- Timeline of all events with timestamps
- Event icons indicating type (warning for text, refresh for retry, etc.)
- Content preview for text responses
- Tool names and parameters

### 4. Interpreting Results

#### Good Pattern
```
✅ Tool call → Tool output → Tool call → Tool output
```

#### Problem Pattern
```
⚠️ Text response → 🔄 Retry attempt → ✅ Tool call
```

#### Critical Issue
```
⚠️ Text response → 🔄 Retry → ⚠️ Text response → 🔄 Retry → ❌ Max retries exceeded
```

## Implementation Details

### Backend Components
- `DiagnosticStorageService`: Stores diagnostic data in memory
- `AgentDiagnostics`: Captures events during agent execution
- Enhanced detection functions for comprehensive monitoring

### API Endpoints
- `GET /api/admin/agent-diagnostics/sessions` - List recent sessions
- `GET /api/admin/agent-diagnostics/sessions/[sessionId]` - Get session events

### Integration Points
Currently integrated with:
- ✅ Semantic SEO Audit Service
- ⏳ Article Writing Service (pending)
- ⏳ Formatting QA Service (pending)
- ⏳ Final Polish Service (pending)

## Troubleshooting

### No Sessions Appearing
- Ensure agents are running with diagnostic integration
- Check browser console for API errors
- Verify diagnostic storage service is initialized

### Events Not Updating
- Check auto-refresh is enabled
- Verify SSE connections are active
- Look for network errors in browser console

### Missing Event Types
- Ensure all event detection patterns are implemented
- Check `assistantSentPlainTextEnhanced` function
- Verify retry attempt logging is active

## Next Steps

1. **Production Deployment**: Deploy and monitor real agent executions
2. **Pattern Analysis**: Identify common failure patterns
3. **Optimization**: Adjust retry nudges based on findings
4. **Persistence**: Move from in-memory to database storage
5. **Analytics**: Add aggregate statistics and trends