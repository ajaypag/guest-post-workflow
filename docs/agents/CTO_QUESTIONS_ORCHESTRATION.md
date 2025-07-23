# Technical Questions: Multi-Agent Orchestration Implementation

## Context for CTO

We're building a multi-agent orchestration system for Steps 8-14 of our guest post workflow. This involves coordinating 6 specialized agents that modify an article in phases:

**Phase 1 (Parallel)**: Internal Links + Client Mentions  
**Phase 2 (Sequential)**: Client Link with 3-prompt conversation  
**Phase 3 (Parallel)**: Images + Link Requests + URL Suggestion

Each agent uses the OpenAI Agents SDK with structured outputs and custom tools.

## Our Current Implementation Plan

```typescript
import { Agent } from '@openai/agents';
import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { webSearchTool } from '@openai/agents-openai';
import { z } from 'zod';

// Example agent definition
export const internalLinksAgent = new Agent({
  name: 'InternalLinksAgent',
  model: 'o3-2025-04-16',
  instructions: `[detailed instructions]`,
  tools: [webSearchTool(), customInternalLinkTool],
  outputType: z.object({
    suggestions: z.array(/* ... */)
  })
});

// Orchestration service
export class LinkOrchestrationService {
  async performOrchestration(sessionId: string) {
    // Phase 1: Parallel
    const [internal, mentions] = await Promise.all([
      this.runInternalLinksAgent(article, domain),
      this.runClientMentionAgent(article, client)
    ]);
  }
}
```

## Specific Technical Questions

### 1. Parallel Agent Execution
**Question**: What's the best practice for running multiple agents in parallel with the SDK? Is this approach correct?

```typescript
// Our approach - is this right?
const [result1, result2] = await Promise.all([
  runner1.run(agent1, messages1, options),
  runner2.run(agent2, messages2, options)
]);

// Or should we reuse the same runner?
const runner = new Runner({ modelProvider });
const [result1, result2] = await Promise.all([
  runner.run(agent1, messages1, options),
  runner.run(agent2, messages2, options)
]);
```

### 2. Custom Tools Implementation
**Question**: How should we implement custom tools that modify text? The docs show simple examples, but our tools need to:
- Return structured modifications
- Track exact text positions
- Handle different modification types

```typescript
// Is this the right pattern?
const customInternalLinkTool = {
  name: 'insert_internal_link',
  description: 'Insert link with natural text flow',
  parameters: z.object({
    modificationType: z.enum(['exact_replacement', 'sentence_rewrite', 'add_sentence']),
    originalText: z.string(),
    newText: z.string(),
    anchorText: z.string(),
    targetUrl: z.string()
  }),
  execute: async (args) => {
    // What should execute return? Just a string?
    // How do we pass structured data back?
    return ?????;
  }
};
```

### 3. Structured Output with Tools
**Question**: When an agent has both tools AND outputType defined, how does that work?

```typescript
const agent = new Agent({
  name: 'MyAgent',
  tools: [customTool1, customTool2],
  outputType: z.object({ suggestions: z.array(...) })
});

// Does the agent call tools AND then format final output?
// Or should tools return the structured output directly?
```

### 4. Streaming with Multiple Agents
**Question**: We want SSE updates as agents work. With parallel execution, how do we handle streaming from multiple agents simultaneously?

```typescript
// Current approach
const result = await runner.run(agent, messages, {
  stream: true,
  maxTurns: 1
});

// How to aggregate streams from parallel agents?
for await (const event of result.toStream()) {
  // Send SSE update
  sseUpdate(sessionId, { agentName: 'internal', event });
}
```

### 5. Conversation History Preservation
**Question**: For Client Link agent with 3 follow-up prompts, is this the correct way to preserve conversation?

```typescript
let conversationHistory = [{ role: 'user', content: prompt1 }];

const result1 = await runner.run(clientLinkAgent, conversationHistory);
await result1.finalOutput;
conversationHistory = (result1 as any).history; // Is .history the right property?

conversationHistory.push({ role: 'user', content: prompt2 });
const result2 = await runner.run(clientLinkAgent, conversationHistory);
// ... continue for prompt 3
```

### 6. Error Handling for Multi-Agent Orchestration
**Question**: What's the best practice for error handling when running agents in parallel? Should we:
- Fail fast if any agent fails?
- Continue with partial results?
- Implement retry logic at the agent level or orchestration level?

```typescript
try {
  const results = await Promise.all([...agents]);
} catch (error) {
  // How to identify which agent failed?
  // Should we use Promise.allSettled instead?
}
```

### 7. Merging Modifications from Multiple Agents
**Question**: Multiple agents modify the same article. What's the best approach to merge their changes without conflicts?

Our current thinking:
```typescript
// Each agent returns modifications with position info
const modifications = [
  { type: 'exact_replacement', from: 'old text', to: 'new text', position: 150 },
  { type: 'add_sentence', after: 'sentence.', newText: 'New sentence.', position: 300 }
];

// Apply modifications in reverse position order to maintain indices?
// Or use a different approach?
```

### 8. Agent Model Selection
**Question**: We're using 'o3-2025-04-16' for all agents. Should we use different models for different tasks? For example:
- o3 for complex reasoning (Internal Links, Client Link)
- o4-mini for simpler tasks (URL Suggestion)
- What about the ArticleEndCritic pattern - always use o4-mini?

### 9. Tool Results and Agent Output
**Question**: If a tool's execute function returns data, how does that relate to the agent's outputType?

```typescript
const tool = {
  execute: async (args) => {
    // Option 1: Return simple string
    return 'Tool execution complete';
    
    // Option 2: Return structured data
    return { success: true, data: {...} };
    
    // Which is correct?
  }
};
```

### 10. Resource Management
**Question**: With 6 agents potentially running in parallel:
- Should we implement connection pooling?
- Are there rate limits we should handle?
- Memory considerations for large articles?

## System Architecture Summary

For context, here's what we're building:
1. **Workflow**: Guest post creation with 14 steps total
2. **This Task**: Orchestrate steps 8-14 in a single unified operation
3. **Agents**: 6 specialized agents working in 3 phases
4. **Goal**: Transform article with all links, images, and metadata in one go
5. **Output**: Modified article + image strategy + link requests + URL suggestion

## Additional Context

- We're using TypeScript/Next.js
- PostgreSQL for session storage
- SSE for real-time progress updates
- Articles can be 1500-3000 words
- Need to maintain article quality while adding modifications

Any guidance on best practices for this multi-agent orchestration pattern would be greatly appreciated!