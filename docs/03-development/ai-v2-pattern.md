# V2 LLM Orchestration Pattern

> **Why**: Better quality through natural conversation flow  
> **Use when**: Building new agent features or refactoring V1  
> **Outcome**: Superior results with simpler code

## Core Concept

Let the LLM drive the process through conversation, not complex code orchestration.

## Implementation Pattern

### 1. Single Agent, Empty Instructions
```typescript
export const writerAgentV2 = new Agent({
  name: 'ArticleWriterV2',
  instructions: '', // CRITICAL: Empty - guidance from prompts
  model: 'o3-2025-04-16',
  tools: [fileSearch], // Minimal tools
});
```

### 2. Database-Driven Prompts
Store prompts in workflow step fields, not code:
```typescript
const PLANNING_PROMPT = workflowStep.inputs.planningPrompt;
const TITLE_INTRO_PROMPT = workflowStep.inputs.titleIntroPrompt;
const LOOPING_PROMPT = workflowStep.inputs.loopingPrompt;
```

### 3. Natural Progression
```typescript
// Phase 1: Planning
let conversationHistory = [
  { role: 'user', content: `${PLANNING_PROMPT}\n\n${outline}` }
];

// Phase 2: Title/Intro  
conversationHistory.push({ 
  { role: 'user', content: TITLE_INTRO_PROMPT }
});

// Phase 3: Loop sections
while (!complete) {
  conversationHistory.push(
    { role: 'user', content: LOOPING_PROMPT }
  );
}
```

## Critical Rules

### ❌ Never Break Message-Reasoning Pairs
```typescript
// WRONG - Breaks SDK integrity
messages.push({ role: 'assistant', content: response });

// RIGHT - Preserve SDK history
await result.finalOutput;
conversationHistory = (result as any).history;
```

### Handle Both Content Types
```typescript
.filter((item: any) => 
  item.type === 'text' || item.type === 'output_text'
)
```

## ArticleEndCritic Pattern

Intelligent completion detection without disrupting flow:

```typescript
// Create AFTER writer's planning phase
const planningResponse = extractPlanningResponse(result);
const critic = createArticleEndCritic(planningResponse);

// Check periodically
if (sectionCount >= CHECK_START) {
  const verdict = await checkCompletion(critic, writerOutputs);
  if (verdict === 'YES') complete = true;
}
```

## V2 vs V1 Comparison

| Aspect | V1 (Orchestrator) | V2 (LLM-Driven) |
|--------|-------------------|-----------------|
| Code complexity | High | Low |
| Output quality | Good | Excellent |
| Debugging | Complex | Simple |
| Prompts | In code | In database |
| Tools | Many custom | Minimal |

## Session Schema

```sql
CREATE TABLE v2_agent_sessions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  status VARCHAR(50),
  outline TEXT,          -- Long content
  final_article TEXT,    -- AI output
  error_message TEXT,    -- Can be long
  session_metadata JSONB
);
```

## Common Pitfalls

1. **Adding instructions** - Breaks natural flow
2. **END_OF_ARTICLE markers** - Causes premature ending  
3. **Manual messages** - Breaks reasoning pairs
4. **Wrong content type** - SDK varies format
5. **Initial outline for critic** - Use writer's plan

## Testing V2

```bash
# Check message integrity
/api/admin/diagnose-article-v2

# Verify prompts load from DB
console.log('Prompts:', { PLANNING_PROMPT })

# Monitor completion detection
console.log('Critic verdict:', verdict)
```

## Migration Path

1. Keep V1 working
2. Add V2 toggle in UI
3. Store prompts in database
4. Test side-by-side
5. Switch default when ready

## Reference Implementation

- Service: `/lib/services/agenticArticleV2Service.ts`
- Agent: `/lib/agents/articleWriterV2.ts`
- API: `/app/api/workflows/[id]/auto-generate-v2/`

The V2 pattern proves simpler is better for LLM orchestration.