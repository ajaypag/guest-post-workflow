# Building AI Agents

> **Why**: Create robust, production-ready AI agents for automation  
> **Use when**: Adding new agentic features to the workflow  
> **Outcome**: Working agent with proper error handling and streaming

## Agent Service Pattern

### 1. Basic Structure

```typescript
// lib/services/agenticYourFeatureService.ts
export class AgenticYourFeatureService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async startSession(workflowId: string, inputs: any): Promise<string> {
    // Create session in database
    // Return sessionId
  }
  
  async performTask(sessionId: string): Promise<void> {
    // Main agent logic with SSE streaming
  }
}
```

### 2. Agent Configuration

```typescript
const agent = new Agent({
  name: 'YourAgentName',
  instructions: `
    You are an expert at [specific task].
    This is an AUTOMATED WORKFLOW - continue until completion without asking for permission.
    [Specific output requirements]
  `,
  model: 'o3-2025-04-16', // Best for complex reasoning
  tools: [fileSearch, customTool]
});
```

### 3. Database Schema

Always use TEXT for AI content:
```sql
CREATE TABLE your_agent_sessions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  inputs TEXT,           -- NOT VARCHAR
  outputs TEXT,          -- NOT VARCHAR  
  error_message TEXT,    -- NOT VARCHAR
  session_metadata JSONB
);
```

## Tool Implementation

### Zod Schema Pattern
```typescript
import { z } from 'zod';
import { tool } from 'ai-agents';

const toolSchema = z.object({
  section_title: z.string().describe('Section title'),
  content: z.string().describe('Section content'),
  is_last: z.boolean().describe('Is this the final section?')
});

const writeSectionTool = tool({
  name: "write_section",
  description: "Write a content section",
  parameters: toolSchema,
  execute: async (args) => {
    // 1. Validate inputs
    // 2. Save to database
    // 3. Send SSE update
    // 4. Return continuation signal
    return `Section "${args.section_title}" saved. ${args.is_last ? 'COMPLETE' : 'Continue'}`;
  }
});
```

## Real-Time Streaming

### SSE Connection Management
```typescript
// lib/streaming/connections.ts
const activeStreams = new Map<string, any>();

export function addSSEConnection(sessionId: string, res: any) {
  activeStreams.set(sessionId, res);
}

export function sseUpdate(sessionId: string, data: any) {
  const stream = activeStreams.get(sessionId);
  if (stream) {
    stream.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
```

### API Endpoints
```typescript
// POST - Start generation
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { inputs } = await req.json();
  const sessionId = await agentService.startSession(params.id, inputs);
  return Response.json({ sessionId });
}

// GET - Stream results
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  
  const res = new Response(null, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
  
  addSSEConnection(sessionId, res);
  agentService.performTask(sessionId); // Don't await
  
  return res;
}
```

## Common Patterns

### Conversation Loop
```typescript
let conversationActive = true;
const messages = [{ role: 'user', content: initialPrompt }];

while (conversationActive) {
  const result = await runner.run(agent, messages, { stream: true });
  
  for await (const event of result.toStream()) {
    // Handle tool calls
    // Update messages array
    // Check completion
  }
  
  // Safety limits
  if (messages.length > 100) {
    conversationActive = false;
  }
}
```

### Error Handling
```typescript
try {
  await performTask(sessionId);
} catch (error) {
  await updateSession(sessionId, { 
    status: 'failed',
    errorMessage: error.message 
  });
  sseUpdate(sessionId, { type: 'error', message: error.message });
}
```

## Testing Checklist

- [ ] Agent completes full workflow
- [ ] Handles errors gracefully  
- [ ] SSE streaming works
- [ ] Database saves correctly
- [ ] Safety limits prevent loops

## Next Steps

- See [Retry Pattern](RETRY_PATTERN.md) for handling text responses
- Check [V2 Pattern](V2_PATTERN.md) for simpler LLM orchestration
- Read [Database Rules](../db/SCHEMA_RULES.md) before creating tables

## Reference Implementations

- Article Generation: `/lib/services/agenticArticleService.ts`
- Semantic Audit: `/lib/services/agenticSemanticAuditService.ts`
- V2 Article: `/lib/services/agenticArticleV2Service.ts`