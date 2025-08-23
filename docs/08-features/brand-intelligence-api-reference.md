# Brand Intelligence System API Reference

Complete API documentation for the Brand Intelligence System endpoints.

## Overview

The Brand Intelligence System provides 6 REST endpoints that manage the complete workflow:
1. **Research Phase**: AI analyzes client business (15-20 minutes)
2. **Input Phase**: Client provides additional context (one-time)
3. **Brief Phase**: AI synthesizes research + input into comprehensive brief

## Authentication

All endpoints require authentication via `AuthServiceServer.getSession()`.
Returns 401 Unauthorized if no valid session.

## Base URL Pattern

```
/api/clients/[clientId]/brand-intelligence/[endpoint]
```

## Endpoints

### 1. GET `/api/clients/[id]/brand-intelligence/latest`

Load existing brand intelligence session for a client.

**Purpose**: Used by UI component on mount to resume existing sessions.

**Parameters**:
- `id` (path): Client UUID

**Response**:
```typescript
{
  success: boolean;
  session: ClientBrandIntelligence | null;
  error?: string;
}
```

**Usage**: Component calls this on mount to check if there's an existing session to resume.

---

### 2. POST `/api/clients/[id]/brand-intelligence/start-research`

Triggers OpenAI Deep Research for a client's business.

**Purpose**: Creates new session or resumes existing research.

**Parameters**:
- `id` (path): Client UUID

**Request Body**: None

**Response**:
```typescript
{
  success: boolean;
  sessionId: string;
  status: 'new' | 'already_active' | 'resumed';
  existingSessionId?: string;
  error?: string;
}
```

**Behavior**:
- If active research exists: returns existing session
- If previous session exists: updates to start new research
- If no session exists: creates new session
- Sets status to 'queued' and generates research session ID

---

### 3. GET `/api/clients/[id]/brand-intelligence/status`

Polls status of research and brief generation operations.

**Purpose**: Real-time status updates for long-running operations.

**Parameters**:
- `id` (path): Client UUID
- `sessionId` (query, optional): Session ID for lookup

**Response**:
```typescript
{
  success: boolean;
  status: ResearchStatus | BriefStatus;
  progress: string;
  researchStatus: ResearchStatus;
  briefStatus: BriefStatus;
  researchOutput?: ResearchOutput; // when research completed
  clientInput?: string; // when input provided
  finalBrief?: string; // when brief completed
  error?: string;
}
```

**Status Values**:
- Research: `'idle' | 'queued' | 'in_progress' | 'completed' | 'error'`
- Brief: `'idle' | 'queued' | 'in_progress' | 'completed' | 'error'`

**Usage**: Component polls this every 5 seconds during active operations.

---

### 4. POST `/api/clients/[id]/brand-intelligence/submit-input`

Submits client input after research completion.

**Purpose**: One-time input to fill gaps identified during research.

**Parameters**:
- `id` (path): Client UUID

**Request Body**:
```typescript
{
  clientInput: string; // 1-10,000 characters
  sessionId?: string; // optional
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  nextStep: 'generate_brief';
  error?: string;
}
```

**Validation**:
- Required: non-empty string
- Length: 1-10,000 characters
- One-time only: prevents duplicate submissions
- Prerequisites: research must be completed

---

### 5. POST `/api/clients/[id]/brand-intelligence/generate-brief`

Triggers brief generation after client input.

**Purpose**: Synthesizes research + client input into comprehensive brief.

**Parameters**:
- `id` (path): Client UUID

**Request Body**:
```typescript
{
  sessionId?: string; // optional
}
```

**Response**:
```typescript
{
  success: boolean;
  briefSessionId: string;
  status: 'queued' | 'already_active';
  message: string;
  error?: string;
}
```

**Prerequisites**:
- Research status must be 'completed'
- Client input must be submitted

---

### 6. PATCH `/api/clients/[id]/brand-intelligence/brief`

Updates the final brand brief manually.

**Purpose**: Allows editing AI-generated brief without expensive re-runs.

**Parameters**:
- `id` (path): Client UUID

**Request Body**:
```typescript
{
  finalBrief: string; // 1-50,000 characters
  sessionId?: string; // optional
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  error?: string;
}
```

### 6b. GET `/api/clients/[id]/brand-intelligence/brief`

Retrieves current final brand brief.

**Parameters**:
- `id` (path): Client UUID
- `sessionId` (query, optional): Session ID

**Response**:
```typescript
{
  success: boolean;
  finalBrief: string | null;
  lastUpdated: string | null; // ISO timestamp
  briefStatus: BriefStatus;
  error?: string;
}
```

## Error Handling

### Common Error Responses

**401 Unauthorized**:
```json
{ "success": false, "error": "Unauthorized" }
```

**404 Not Found**:
```json
{ "success": false, "error": "Client not found" }
{ "success": false, "error": "Brand intelligence session not found" }
```

**400 Bad Request**:
```json
{ "success": false, "error": "Research must be completed before submitting client input" }
{ "success": false, "error": "Client input has already been submitted" }
{ "success": false, "error": "Final brief content is required" }
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to start brand intelligence research",
  "details": "Specific error message"
}
```

## Session Management

### Session Lookup Logic

Each endpoint supports flexible session lookup:

1. **By sessionId parameter**: Matches against research session ID, brief session ID, or record ID
2. **By clientId only**: Returns the single session for that client (UNIQUE constraint)

### Session States

**Research Phase**:
- `idle` → `queued` → `in_progress` → `completed` | `error`

**Brief Phase**:
- `idle` → `queued` → `in_progress` → `completed` | `error`

## Integration Notes

### Polling Pattern

UI components should follow this pattern:
1. Call `latest` endpoint on mount
2. If session exists and has active status, start polling
3. Poll `status` endpoint every 5 seconds
4. Stop polling when status reaches `completed` or `error`

### Error Recovery

- Research/brief operations can be restarted after errors
- Session state is preserved in database
- Client input is protected (one-time only)
- Manual brief editing is always available

### OpenAI Integration (Phase 5)

Currently, the API endpoints manage database state only. In Phase 5:
- `start-research` will integrate with OpenAI Deep Research API
- `generate-brief` will use OpenAI for synthesis
- Status endpoints will track real OpenAI operation progress

## Database Schema Reference

See `lib/db/clientBrandIntelligenceSchema.ts` for complete TypeScript types:

- `ClientBrandIntelligence` - Main record type
- `ResearchOutput` - Structured research results
- `UsageMetadata` - Cost and usage tracking
- `ResearchStatus` | `BriefStatus` - Status enums