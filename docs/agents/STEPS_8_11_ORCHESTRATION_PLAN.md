# Steps 8-11 Orchestration Agent Plan

## Overview
Build a single orchestration agent that handles Internal Links, External Links (excluding Airtable), Client Mention, and Client Link insertion in an efficient, parallelized workflow.

## Architecture Design

### 1. Article Retrieval Strategy (Corrected)
```typescript
// Fallback chain priority:
1. formattingQaStep.outputs.cleanedArticle     // Formatting & QA (Step 7)
2. finalPolishStep.outputs.finalArticle        // Polish & Finalize (Step 6)
3. contentAuditStep.outputs.seoOptimizedArticle // Semantic SEO (Step 5)
4. articleDraftStep.outputs.fullArticle        // Article Draft (Step 4)
```

### 2. Parallel vs Sequential Processing
```
Parallel Group 1 (can run simultaneously):
- Internal Links (Step 8) - needs: article + target domain
- Client Mention (Step 10) - needs: article + client name

Sequential (must wait for Group 1):
- Client Link (Step 11) - needs: article with previous modifications + client URL/anchor
```

### 3. Agent Structure (V2 Pattern)
```typescript
// Single orchestration agent with empty instructions
export const linkOrchestrationAgent = new Agent({
  name: 'LinkOrchestrationAgent',
  instructions: '', // Empty - all guidance from database prompts
  model: 'o3-2025-04-16',
  tools: [
    internalLinkTool,
    clientMentionTool,
    clientLinkTool,
    finalizeArticleTool
  ]
});
```

### 4. Database Schema Updates
```sql
-- Add to workflow step outputs
ALTER TABLE workflows 
ADD COLUMN final_orchestrated_article TEXT;

-- New session table for orchestration
CREATE TABLE link_orchestration_sessions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  version INTEGER NOT NULL,
  status VARCHAR(50),
  input_article TEXT,
  internal_links_result TEXT,
  client_mention_result TEXT,
  client_link_result TEXT,
  final_article TEXT,
  session_metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 5. Tool Definitions
```typescript
// Tool for internal links
const internalLinkTool = tool({
  name: 'suggest_internal_links',
  description: 'Suggest internal links to guest post site',
  parameters: z.object({
    suggestions: z.array(z.object({
      anchor_text: z.string(),
      target_url: z.string(),
      context: z.string(),
      location: z.string()
    })),
    rationale: z.string()
  }),
  execute: async (args) => {
    // Save suggestions and update session
    return 'Internal link suggestions saved';
  }
});

// Similar tools for client mention and client link
```

### 6. Orchestration Flow
```typescript
async performOrchestration(sessionId: string) {
  // 1. Retrieve article using fallback chain
  const article = await this.getArticleWithFallback(workflowId);
  
  // 2. Phase 1: Parallel processing
  const phase1Prompt = buildPhase1Prompt(article, domain, clientName);
  // Agent processes internal links AND client mentions
  
  // 3. Phase 2: Sequential - Client link
  const updatedArticle = mergePhase1Results(article, results);
  const phase2Prompt = buildPhase2Prompt(updatedArticle, clientUrl);
  
  // 4. Finalize
  const finalArticle = mergeFinalResults(updatedArticle, clientLinkResult);
  await saveFinalArticle(workflowId, finalArticle);
}
```

### 7. Prompt Structure
```typescript
// Database-driven prompts (to be collected from GPTs)
const prompts = {
  internalLinks: '', // From Step 8 GPT
  clientMention: '', // From Step 10 GPT
  clientLink: '',    // From Step 11 GPT
  
  // Orchestration prompts
  phase1Introduction: 'Process internal links and client mentions...',
  phase2Introduction: 'Now add the client link...',
  completionCheck: 'Verify all modifications are complete...'
};
```

### 8. SSE Streaming Updates
```typescript
// Real-time progress updates
sseUpdate(sessionId, {
  type: 'phase',
  phase: 'internal_links',
  status: 'processing',
  message: 'Analyzing article for internal link opportunities...'
});
```

### 9. Error Handling & Retry
- Apply retry pattern if agent outputs text instead of tools
- Validate each tool output before proceeding
- Rollback capability if final merge fails

### 10. UI Integration
```typescript
// New component: LinkOrchestrationStep.tsx
- Single button: "Run Link Optimization"
- Progress indicators for each sub-step
- Preview of changes before final save
- Option to accept/reject individual suggestions
```

## Implementation Steps

1. **Phase 1: Infrastructure**
   - Create database tables
   - Set up service class structure
   - Implement SSE connections

2. **Phase 2: Prompt Collection**
   - Extract prompts from each GPT (8, 10, 11)
   - Store in database or config
   - Create prompt builder functions

3. **Phase 3: Tool Implementation**
   - Build each tool with proper validation
   - Implement merge logic for article updates
   - Add position tracking for modifications

4. **Phase 4: Orchestration Logic**
   - Implement parallel phase 1
   - Implement sequential phase 2
   - Build final article merger

5. **Phase 5: UI Components**
   - Create orchestration step component
   - Add progress tracking
   - Implement preview/approval flow

## Key Decisions Needed

1. **Article Modification Tracking**
   - How to track exact positions of insertions?
   - Use line numbers, paragraph IDs, or markers?

2. **Conflict Resolution**
   - What if internal link and client mention target same paragraph?
   - Priority rules for overlapping modifications

3. **Validation Rules**
   - Maximum links per section
   - Proximity rules (no links too close)
   - Context relevance scoring

4. **User Control**
   - Auto-apply all suggestions or review mode?
   - Granular control per suggestion type?

## Next Steps
1. Review and approve this plan
2. Collect GPT prompts one by one
3. Start with database schema implementation
4. Build service class skeleton
5. Implement tools incrementally

## Notes
- Consider caching article analysis to avoid re-parsing
- Track token usage for cost optimization
- Plan for future addition of Step 9 (External Links with Airtable)