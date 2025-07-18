import { Agent } from '@openai/agents';
import { fileSearchTool } from '@openai/agents-openai';

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

// Export for compatibility but not used in simplified approach
export const writeSectionTool = writerAgentV2.asTool({
  toolName: 'write_section',
  toolDescription: 'Not used in V2 - see agenticArticleV2Service.ts',
});