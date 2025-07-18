// This file is kept for compatibility but the orchestrator is not used in the simplified V2 approach
// The service directly manages the conversation with the writer agent

import { Agent } from '@openai/agents';
import { z } from 'zod';

const orchestratorOutputSchema = z.object({
  fullArticle: z.string(),
  wordCount: z.number(),
});

// Placeholder agent - not used in actual implementation
export const orchestratorAgentV2 = new Agent({
  name: 'ArticleOrchestratorV2',
  instructions: 'Not used - see agenticArticleV2Service.ts for actual implementation',
  model: 'o3-2025-04-16',
  tools: [],
  outputType: orchestratorOutputSchema,
});