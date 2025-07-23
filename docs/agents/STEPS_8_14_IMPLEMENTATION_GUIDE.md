# Steps 8-14 Implementation Guide (Updated with SDK Best Practices)

## Overview
Implementation guide for multi-agent orchestration using the latest OpenAI Agents SDK patterns (July 2025).

## 1. Core Architecture

### Singleton Runner Pattern
```typescript
// lib/services/linkOrchestrationService.ts
import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';

export class LinkOrchestrationService {
  private runner: Runner;
  
  constructor() {
    this.runner = new Runner({
      modelProvider: new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY
      })
    });
  }
}
```

### Parallel Agent Execution
```typescript
async performPhase1(article: string, targetDomain: string, clientName: string) {
  const [internalResult, mentionResult] = await Promise.all([
    this.runner.run(internalLinksAgent, [{ role: 'user', content: `Target Domain: ${targetDomain}\n\nArticle:\n${article}` }], { stream: true }),
    this.runner.run(clientMentionAgent, [{ role: 'user', content: `Client: ${clientName}\n\nArticle:\n${article}` }], { stream: true })
  ]);
  
  return { internalResult, mentionResult };
}
```

## 2. Custom Tool Implementation

### Text Modification Tools
```typescript
import { tool } from '@openai/agents';
import { z } from 'zod';

export const insertInternalLink = tool({
  name: 'insert_internal_link',
  description: 'Propose an internal link edit with position info',
  parameters: z.object({
    kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence']),
    start: z.number().describe('0-based index where modification starts'),
    end: z.number().optional().describe('0-based index where modification ends (omit for inserts)'),
    originalText: z.string().describe('The original text being modified'),
    newText: z.string().describe('The new text with link integrated'),
    anchorText: z.string().describe('The clickable link text'),
    targetUrl: z.string().describe('URL on the guest post site'),
    confidence: z.number().min(0).max(1),
    rationale: z.string()
  }),
  async execute(params) {
    // Return JSON-serializable data
    return {
      ok: true,
      modification: {
        kind: params.kind,
        start: params.start,
        end: params.end,
        originalText: params.originalText,
        newText: params.newText,
        anchorText: params.anchorText,
        targetUrl: params.targetUrl,
        confidence: params.confidence,
        rationale: params.rationale
      }
    };
  }
});

export const insertClientMention = tool({
  name: 'insert_client_mention',
  description: 'Add strategic brand mention for AI overviews',
  parameters: z.object({
    kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence']),
    start: z.number(),
    end: z.number().optional(),
    originalText: z.string(),
    newText: z.string().describe('Text with brand mention (no links)'),
    mentionType: z.enum(['brand_name', 'product_mention', 'expertise_reference']),
    confidence: z.number().min(0).max(1),
    rationale: z.string()
  }),
  async execute(params) {
    return {
      ok: true,
      modification: params
    };
  }
});
```

## 3. Agent Definitions with Tools and OutputType

```typescript
import { Agent } from '@openai/agents';
import { webSearchTool } from '@openai/agents-openai';

// Internal Links Agent - Heavy reasoning (o3)
export const internalLinksAgent = new Agent({
  name: 'InternalLinksAgent',
  model: 'o3-2025-04-16',
  instructions: `[Full instructions from orchestration plan]`,
  tools: [webSearchTool(), insertInternalLink],
  outputType: z.object({
    internalLinks: z.array(z.object({
      start: z.number(),
      end: z.number().nullable(),
      kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence']),
      originalText: z.string(),
      newText: z.string(),
      anchorText: z.string(),
      targetUrl: z.string(),
      confidence: z.number(),
      rationale: z.string()
    })),
    summary: z.string().describe('Overall internal linking strategy')
  })
});

// URL Suggestion Agent - Simple task (o4-mini)
export const urlSuggestionAgent = new Agent({
  name: 'UrlSuggestionAgent',
  model: 'o4-mini',
  instructions: `[Full instructions from Step 14]`,
  tools: [],
  outputType: z.object({
    suggestedUrl: z.string(),
    rationale: z.string()
  })
});
```

## 4. Streaming Multiple Agents to SSE

```typescript
// Helper to pipe agent streams with tagging
async pipeStream(agentName: string, streamedResult: any, sessionId: string) {
  for await (const event of streamedResult.toStream()) {
    sseUpdate(sessionId, {
      agent: agentName,
      event: event,
      timestamp: new Date().toISOString()
    });
  }
}

// Execute Phase 1 with streaming
async executePhase1WithStreaming(sessionId: string, article: string, params: any) {
  const internalStream = this.runner.run(internalLinksAgent, 
    [{ role: 'user', content: formatInternalLinksPrompt(article, params.targetDomain) }], 
    { stream: true }
  );
  
  const mentionStream = this.runner.run(clientMentionAgent,
    [{ role: 'user', content: formatClientMentionPrompt(article, params.clientName) }],
    { stream: true }
  );
  
  // Stream both agents in parallel
  await Promise.all([
    this.pipeStream('internalLinks', internalStream, sessionId),
    this.pipeStream('clientMention', mentionStream, sessionId)
  ]);
  
  // Get final outputs
  const [internalResult, mentionResult] = await Promise.all([
    internalStream.finalOutput,
    mentionStream.finalOutput
  ]);
  
  return { internalResult, mentionResult };
}
```

## 5. Conversation History for Client Link

```typescript
async runClientLinkWithFollowups(article: string, clientUrl: string, anchorText?: string) {
  // Initial prompt
  let history = [{ 
    role: 'user', 
    content: `Article:\n${article}\n\nClient URL: ${clientUrl}\nAnchor Text: ${anchorText || 'Choose appropriate anchor text'}` 
  }];
  
  // First pass
  const result1 = await this.runner.run(clientLinkAgent, history, { stream: true });
  history = result1.history; // SDK maintains the history
  
  // Follow-up 1: Context refinement
  history.push({ role: 'user', content: CLIENT_LINK_FOLLOWUP_1 });
  const result2 = await this.runner.run(clientLinkAgent, history, { stream: true });
  history = result2.history;
  
  // Follow-up 2: Source-based rewrite
  history.push({ role: 'user', content: CLIENT_LINK_FOLLOWUP_2 });
  const result3 = await this.runner.run(clientLinkAgent, history, { stream: true });
  history = result3.history;
  
  // Follow-up 3: Validation
  history.push({ role: 'user', content: `Please confirm the link URL is exactly: ${clientUrl}` });
  const finalResult = await this.runner.run(clientLinkAgent, history, { stream: true });
  
  return {
    finalOutput: await finalResult.finalOutput,
    conversationHistory: finalResult.history
  };
}
```

## 6. Error Handling with Graceful Degradation

```typescript
async executePhaseWithErrorHandling(phaseName: string, agents: AgentTask[]) {
  const tasks = agents.map(({ name, agent, input }) => 
    this.runner.run(agent, input, { stream: true })
      .then(res => ({ ok: true, name, result: res }))
      .catch(err => ({ ok: false, name, error: err }))
  );
  
  const results = await Promise.allSettled(tasks);
  
  // Process results
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok);
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
  
  if (failed.length > 0) {
    console.error(`Phase ${phaseName} had ${failed.length} failures:`, failed);
    
    // Store partial results
    await this.updateSession(sessionId, {
      [`${phaseName}_partial_failure`]: true,
      [`${phaseName}_errors`]: failed.map(f => ({
        agent: f.value?.name || 'unknown',
        error: f.reason || f.value?.error
      }))
    });
  }
  
  return successful.map(s => s.value);
}
```

## 7. Safe Text Modification Merging

```typescript
interface TextModification {
  start: number;
  end?: number;
  newText: string;
  agentName: string;
  priority: number;
}

function mergeTextModifications(article: string, modifications: TextModification[]): string {
  // Sort by start position descending
  const sorted = modifications.sort((a, b) => b.start - a.start);
  
  // Detect overlaps
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (next.start < (current.end ?? current.start)) {
      console.warn(`Overlap detected between ${current.agentName} and ${next.agentName}`);
      
      // Resolve by priority (Phase 2 > Phase 1)
      if (current.priority > next.priority) {
        sorted.splice(i + 1, 1);
        i--; // Re-check this position
      } else {
        sorted.splice(i, 1);
        i--;
      }
    }
  }
  
  // Apply modifications
  let modifiedArticle = article;
  for (const mod of sorted) {
    const before = modifiedArticle.slice(0, mod.start);
    const after = modifiedArticle.slice(mod.end ?? mod.start);
    modifiedArticle = before + mod.newText + after;
  }
  
  return modifiedArticle;
}
```

## 8. Extracting Tool Calls from Results

```typescript
function extractToolCallsFromResult(result: any, toolName: string) {
  return result.newItems
    .filter(item => 
      item.type === 'tool_call_output' && 
      item.tool === toolName
    )
    .map(item => JSON.parse(item.rawOutput));
}

// Usage
const internalLinkEdits = extractToolCallsFromResult(
  internalResult, 
  'insert_internal_link'
);
```

## 9. Model Selection Strategy

```typescript
const MODEL_SELECTION = {
  // Heavy reasoning tasks
  REASONING: 'o3-2025-04-16',
  
  // Mechanical/simple tasks
  SIMPLE: 'o4-mini',
  
  // Critics and validators
  CRITIC: 'o4-mini'
};

// Agent model assignments
const AGENT_MODELS = {
  internalLinks: MODEL_SELECTION.REASONING,   // Complex web search & placement
  clientMention: MODEL_SELECTION.REASONING,   // Strategic placement
  clientLink: MODEL_SELECTION.REASONING,      // Multi-turn refinement
  images: MODEL_SELECTION.REASONING,          // Create vs find decision
  linkRequests: MODEL_SELECTION.SIMPLE,       // Straightforward analysis
  urlSuggestion: MODEL_SELECTION.SIMPLE       // Simple URL generation
};
```

## 10. Rate Limiting and Resource Management

```typescript
import { RateLimiter } from 'limiter';

class OrchestrationService {
  private rateLimiter: RateLimiter;
  
  constructor() {
    // 300 requests per minute for O3 tier
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 300,
      interval: 'minute'
    });
  }
  
  async runAgentWithRateLimit(agent: Agent, input: any) {
    await this.rateLimiter.removeTokens(1);
    
    try {
      return await this.runner.run(agent, input, { stream: true });
    } catch (error) {
      if (error.status === 429) {
        // Exponential backoff
        await this.delay(Math.pow(2, this.retryCount) * 1000);
        this.retryCount++;
        return this.runAgentWithRateLimit(agent, input);
      }
      throw error;
    }
  }
}
```

## Complete Service Implementation Structure

```typescript
export class LinkOrchestrationService {
  private runner: Runner;
  private activeStreams: Map<string, any>;
  
  async performOrchestration(sessionId: string) {
    const session = await this.getSession(sessionId);
    
    try {
      // Phase 1: Parallel (Internal Links + Client Mentions)
      await this.updatePhase(sessionId, 1, 'running');
      const phase1 = await this.executePhase1WithStreaming(sessionId, session.originalArticle, session);
      
      // Apply Phase 1 modifications
      const articleAfterPhase1 = this.mergeTextModifications(
        session.originalArticle,
        [...phase1.internalLinks, ...phase1.clientMentions]
      );
      
      // Phase 2: Sequential (Client Link with conversation)
      await this.updatePhase(sessionId, 2, 'running');
      const phase2 = await this.runClientLinkWithFollowups(
        articleAfterPhase1,
        session.clientUrl,
        session.anchorText
      );
      
      // Apply Phase 2 modifications
      const articleAfterPhase2 = this.mergeTextModifications(
        articleAfterPhase1,
        [phase2.modification]
      );
      
      // Phase 3: Parallel (Images, Link Requests, URL)
      await this.updatePhase(sessionId, 3, 'running');
      const phase3 = await this.executePhase3WithStreaming(sessionId, articleAfterPhase2, session);
      
      // Save final results
      await this.saveFinalResults(sessionId, {
        finalArticle: articleAfterPhase2,
        ...phase3
      });
      
    } catch (error) {
      await this.handleOrchestrationError(sessionId, error);
      throw error;
    }
  }
}
```

## Key Takeaways

1. **One Runner** - Share across all agents
2. **Return JSON** from tools, not strings
3. **Use result.history** for conversation continuity
4. **Promise.allSettled** for graceful degradation
5. **Sort modifications descending** by position
6. **Mix models** - o3 for reasoning, o4-mini for simple tasks
7. **Stream everything** for better UX
8. **Rate limit** at the orchestration level
9. **Cache results** for retries
10. **Track phases** in the database for recovery