# Agent Text Response Retry Pattern

> **Why**: Agents sometimes output text instead of using required tools  
> **Use when**: Building agents that must use tools, not explanatory text  
> **Outcome**: Agents reliably use tools without message pollution

## The Problem

OpenAI agents may output progress updates instead of calling tools:
```
"I'll analyze the content now..."  # ❌ Bad - should use tool
"Let me write the next section..." # ❌ Bad - should use tool
```

This causes:
- "Cannot read properties of null" errors
- Workflows stuck waiting for tools
- Polluted conversation history

## The Solution

### 1. Create Agent Utils
```typescript
// lib/utils/agentUtils.ts
export function assistantSentPlainText(event: any): boolean {
  return (
    event.type === 'run_item_stream_event' &&
    event.name === 'message_output_created' &&
    !event.item.tool_calls?.length
  );
}

export const SEMANTIC_AUDIT_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the audit_section function. ' +
  'Do NOT output progress updates.';

export function createRetryNudge(expectedTool: string): string {
  return `🚨 FORMAT INVALID – respond ONLY by calling the ${expectedTool} function. ` +
         'Do NOT output progress updates.';
}
```

### 2. Apply to Your Service

```typescript
import { assistantSentPlainText, createRetryNudge } from '@/lib/utils/agentUtils';

// Add retry tracking
let retries = 0;
const MAX_RETRIES = 3;
const RETRY_NUDGE = createRetryNudge('your_tool_name');

while (conversationActive) {
  const result = await runner.run(agent, messages, { stream: true });
  
  for await (const event of result.toStream()) {
    // ✨ Immediate detection and retry
    if (assistantSentPlainText(event)) {
      messages.push({ role: 'system', content: RETRY_NUDGE });
      retries += 1;
      if (retries > MAX_RETRIES) {
        throw new Error('Agent not using tools after 3 attempts');
      }
      break; // Exit loop, outer while() will retry
    }
    
    // Handle tool calls normally
    if (event.name === 'tool_called') {
      retries = 0; // Reset on success
      // Process tool call...
    }
  }
}
```

## Key Benefits

1. **No History Pollution**: Bad messages never saved
2. **Immediate Retry**: `break` triggers new attempt
3. **System Authority**: System messages carry more weight
4. **Safety Limit**: Max 3 retries prevents loops

## Implementation Checklist

- [ ] Import `agentUtils`
- [ ] Add retry variables
- [ ] Add detection at top of stream loop
- [ ] Remove old text handlers
- [ ] Reset retries on tool success
- [ ] Test retry behavior

## Common Mistakes

### ❌ Wrong: Recording Text Messages
```typescript
if (!messageItem.tool_calls?.length) {
  messages.push({
    role: 'assistant',
    content: messageItem.content  // Pollutes history
  });
}
```

### ✅ Right: Immediate Retry
```typescript
if (assistantSentPlainText(event)) {
  messages.push({ role: 'system', content: RETRY_NUDGE });
  break; // Don't record, just retry
}
```

## Testing Strategy

1. **Normal flow**: Complete without retries
2. **Single retry**: Recovers from one text response
3. **Multiple retries**: Handles repeated failures
4. **Max retries**: Fails gracefully after 3 attempts

## Services Using This Pattern

- ✅ `agenticSemanticAuditService.ts`
- ✅ `agenticArticleService.ts`
- 🔄 `agenticFormattingQAService.ts`
- 🔄 `agenticFinalPolishService.ts`

## Next Steps

- Apply to all agent services
- Monitor retry metrics
- Adjust nudge messages per service