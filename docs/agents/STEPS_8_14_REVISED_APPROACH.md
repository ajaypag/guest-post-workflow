# Steps 8-14 Orchestration: Revised Implementation Approach

## Key Clarifications

1. **Multi-Agent is Correct**: We need multiple specialized agents because we're doing multiple distinct tasks (internal links, images, client mentions, etc.)

2. **Instructions in Agents**: We CAN use detailed instructions in agent definitions - empty instructions was specific to the V2 article writing scenario

3. **Custom Tools**: Our custom tools are appropriate for the specialized tasks

4. **Parallel Orchestration**: We SHOULD use parallel coordination where possible for efficiency

5. **Structured Output**: We can use Zod schemas for structured output - this is cleaner than delimiter parsing

6. **Conversation History**: Important for multi-turn interactions (Client Link's 3 prompts, Images with multiple generations)

## Correct Implementation Pattern

### 1. Agent Definitions (Using Proper Nomenclature)

```typescript
import { Agent } from '@openai/agents';
import { webSearchTool } from '@openai/agents-openai';
import { z } from 'zod';

// Each agent has specific instructions and tools
export const internalLinksAgent = new Agent({
  name: 'InternalLinksAgent',
  model: 'o3-2025-04-16',
  instructions: `[Full instructions from STEPS_8_14_ORCHESTRATION_PLAN.md]`,
  tools: [
    webSearchTool(),
    insertInternalLinkTool
  ],
  outputType: internalLinksSchema
});

export const imagesAgent = new Agent({
  name: 'ImagesAgent',
  model: 'o3-2025-04-16',
  instructions: `[Full instructions for image strategy]`,
  tools: [
    generateImageTool,  // DALL-E integration
    webSearchTool(),    // For finding product images
    imageAnalysisTool
  ],
  outputType: imagesSchema
});

// Client Link agent needs conversation continuity
export const clientLinkAgent = new Agent({
  name: 'ClientLinkAgent',
  model: 'o3-2025-04-16',
  instructions: `[Initial placement instructions]`,
  tools: [insertClientLinkTool],
  outputType: clientLinkSchema
});
```

### 2. Orchestration Service with Parallel Processing

```typescript
import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';

export class LinkOrchestrationService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async performOrchestration(sessionId: string) {
    const session = await this.getSession(sessionId);
    const { article, targetDomain, clientInfo } = session;

    // Phase 1: Parallel Processing (Internal Links + Client Mentions)
    const phase1Results = await Promise.all([
      this.runInternalLinksAgent(article, targetDomain),
      this.runClientMentionAgent(article, clientInfo)
    ]);

    const articleAfterPhase1 = this.applyModifications(
      article, 
      [...phase1Results[0].modifications, ...phase1Results[1].modifications]
    );

    // Phase 2: Sequential Processing (Client Link with conversation)
    const clientLinkResult = await this.runClientLinkWithConversation(
      articleAfterPhase1,
      clientInfo
    );

    const articleAfterPhase2 = this.applyModifications(
      articleAfterPhase1,
      clientLinkResult.modifications
    );

    // Phase 3: Parallel Processing (Images, Link Requests, URL)
    const phase3Results = await Promise.all([
      this.runImagesAgent(articleAfterPhase2),
      this.runLinkRequestsAgent(articleAfterPhase2, session.guestPostSite),
      this.runUrlSuggestionAgent(articleAfterPhase2, session)
    ]);

    // Save all results
    await this.saveFinalResults(sessionId, {
      finalArticle: articleAfterPhase2,
      imageStrategy: phase3Results[0],
      linkRequests: phase3Results[1],
      urlSuggestion: phase3Results[2]
    });
  }

  // Example: Client Link with conversation continuity
  private async runClientLinkWithConversation(article: string, clientInfo: any) {
    const runner = new Runner({
      modelProvider: this.openaiProvider,
      tracingDisabled: true
    });

    // Initial placement
    let conversationHistory = [{
      role: 'user',
      content: `Article:\n${article}\n\nClient URL: ${clientInfo.url}\nAnchor Text: ${clientInfo.anchorText}`
    }];

    let result = await runner.run(clientLinkAgent, conversationHistory, {
      stream: true,
      maxTurns: 1
    });

    // Preserve conversation history
    await result.finalOutput;
    conversationHistory = (result as any).history;

    // Follow-up refinements
    for (const refinementPrompt of clientInfo.refinementPrompts) {
      conversationHistory.push({
        role: 'user',
        content: refinementPrompt
      });

      result = await runner.run(clientLinkAgent, conversationHistory, {
        stream: true,
        maxTurns: 1
      });

      await result.finalOutput;
      conversationHistory = (result as any).history;
    }

    return this.extractFinalModifications(conversationHistory);
  }

  // Parallel agent execution (no conversation needed)
  private async runInternalLinksAgent(article: string, targetDomain: string) {
    const runner = new Runner({
      modelProvider: this.openaiProvider,
      tracingDisabled: true
    });

    const result = await runner.run(internalLinksAgent, [{
      role: 'user',
      content: `Article:\n${article}\n\nTarget Domain: ${targetDomain}`
    }], {
      stream: true,
      maxTurns: 1
    });

    return await result.finalOutput;
  }
}
```

### 3. Proper Tool Definitions

```typescript
// Custom tools with Zod schemas
const insertInternalLinkTool = {
  name: 'insert_internal_link',
  description: 'Insert an internal link into the article',
  parameters: z.object({
    modificationType: z.enum(['exact_replacement', 'sentence_rewrite', 'add_sentence']),
    targetText: z.string(),
    newText: z.string(),
    linkUrl: z.string(),
    anchorText: z.string()
  })
};

const generateImageTool = {
  name: 'generate_image',
  description: 'Generate an image using DALL-E',
  parameters: z.object({
    prompt: z.string(),
    style: z.enum(['realistic', 'digital-art', 'illustration']),
    aspectRatio: z.enum(['1:1', '16:9', '9:16'])
  })
};
```

### 4. Session Management

```typescript
// Database schema for orchestration sessions
export const linkOrchestrationSessions = pgTable('link_orchestration_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  
  // Phase tracking
  currentPhase: integer('current_phase').default(1),
  phase1Results: jsonb('phase1_results'),
  phase2Results: jsonb('phase2_results'),
  phase3Results: jsonb('phase3_results'),
  
  // Article versions
  originalArticle: text('original_article').notNull(),
  articleAfterPhase1: text('article_after_phase1'),
  articleAfterPhase2: text('article_after_phase2'),
  finalArticle: text('final_article'),
  
  // Results
  imageStrategy: jsonb('image_strategy'),
  linkRequests: text('link_requests'),
  urlSuggestion: text('url_suggestion'),
  
  // Metadata
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

## Key Differences from V2 Pattern

1. **Multiple Agents**: Each step has its own specialized agent
2. **Parallel Execution**: Phase 1 and 3 run agents in parallel
3. **Structured Output**: Using Zod schemas for clean data handling
4. **Tool Variety**: Custom tools for specific operations + web search
5. **Conversation Continuity**: Only where needed (Client Link, Images)

## Implementation Priority

1. Create database schema
2. Build individual agents with proper tools
3. Implement orchestration service with phases
4. Add SSE streaming for progress updates
5. Create unified UI component
6. Test with real workflow data