import { Agent } from '@openai/agents';
import { z } from 'zod';
import { writeSectionTool } from './articleWriterV2';

// Output schema for the orchestrator - final assembled article
const orchestratorOutputSchema = z.object({
  fullArticle: z.string().describe('The complete article assembled from all sections'),
  wordCount: z.number().describe('Total word count of the article'),
});

// The orchestrator agent - manages the article writing flow
export const orchestratorAgentV2 = new Agent({
  name: 'ArticleOrchestratorV2',
  instructions: `You orchestrate article writing.
1. First: call write_section with the full outline and context
2. Loop: call write_section until done:true is returned
3. Aggregate: combine all sections into a cohesive article
4. Return: { fullArticle: "combined sections", wordCount: X }
Never write content yourself - only manage the writing process.`,
  model: 'o3-2025-04-16',
  tools: [writeSectionTool],
  outputType: orchestratorOutputSchema,
});