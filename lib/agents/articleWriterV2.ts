import { Agent } from '@openai/agents';
import { fileSearchTool } from '@openai/agents-openai';
import { z } from 'zod';

// File search tool with your vector store - same one used in current implementation
const fileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

// The writer agent with minimal instructions - just the vector store access
export const writerAgentV2 = new Agent({
  name: 'ArticleWriterV2',
  instructions: '', // Empty instructions - all prompts come from the conversation
  model: 'o3-2025-04-16',
  tools: [fileSearch],
  // No output schema - agent returns plain text responses
});

// Factory function to create ArticleEndCritic with dynamic outline
export const createArticleEndCritic = (outline: string) => new Agent({
  name: 'ArticleEndCritic',
  model: 'gpt-4.1-nano',
  instructions: `You are an END-OF-ARTICLE detector.

Here is the article outline:
${outline.trim()}

Reply YES only when ALL of these conditions are met:
1. The draft contains a clear, final "Conclusion / CTA" section
2. This conclusion fulfills the last outline item
3. The conclusion provides proper closure (summary, next steps, or call-to-action)
4. All major outline sections appear to be covered

Otherwise reply NO.

IMPORTANT: You must reply with exactly 'YES' or 'NO' - nothing else.`,
  outputType: z.object({
    verdict: z.enum(['YES', 'NO']).describe('Whether the article is complete')
  }),
});

// Export for compatibility but not used in simplified approach
export const writeSectionTool = writerAgentV2.asTool({
  toolName: 'write_section',
  toolDescription: 'Not used in V2 - see agenticArticleV2Service.ts',
});