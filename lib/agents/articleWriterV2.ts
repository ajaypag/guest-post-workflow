import { Agent } from '@openai/agents';
import { fileSearchTool, webSearchTool } from '@openai/agents-openai';
import { z } from 'zod';

// File search tool with your vector store - same one used in current implementation
const fileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

// Web search tool for fact-checking and current information
const webSearch = webSearchTool();

// The writer agent with minimal instructions - just the vector store access
export const writerAgentV2 = new Agent({
  name: 'ArticleWriterV2',
  instructions: '', // Empty instructions - all prompts come from the conversation
  model: 'o3-2025-04-16',
  tools: [fileSearch, webSearch],
  // No output schema - agent returns plain text responses
});

// Factory function to create ArticleEndCritic with dynamic outline
export const createArticleEndCritic = (writerPlanningResponse: string) => new Agent({
  name: 'ArticleEndCritic',
  model: 'o4-mini',
  instructions: `You are an END-OF-ARTICLE detector.

You will receive the entire draft after each new section.  
Using your own judgment, answer **YES** only when BOTH are true:

1.   The draft has covered every major section from the writer's planned outline below.
2.   The draft ends with a paragraph or short section that clearly concludes
     the piece— it summarises or reflects on the article's main points AND
     provides a sense of closure (e.g. a call-to-action or a forward-looking
     remark).

If either condition is missing, reply **NO**.

Return a single word: YES or NO.  Do not critique style or correctness.

Here is the writer's planning response and outline:
${writerPlanningResponse.trim()}`,
  outputType: z.object({
    verdict: z.enum(['YES', 'NO']).describe('Whether the article is complete')
  }),
});

// Export for compatibility but not used in simplified approach
export const writeSectionTool = writerAgentV2.asTool({
  toolName: 'write_section',
  toolDescription: 'Not used in V2 - see agenticArticleV2Service.ts',
});