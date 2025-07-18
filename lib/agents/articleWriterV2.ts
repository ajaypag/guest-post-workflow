import { Agent } from '@openai/agents';
import { fileSearchTool } from '@openai/agents-openai';
import { z } from 'zod';

// File search tool with your vector store - same one used in current implementation
const fileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

// Output schema for the writer - hidden from final article
const writerOutputSchema = z.object({
  content: z.string().describe('The section content written in natural prose'),
  done: z.boolean().describe('Whether this completes the article'),
});

// The writer agent with minimal instructions - just the vector store access
export const writerAgentV2 = new Agent({
  name: 'ArticleWriterV2',
  instructions: '', // Minimal instructions - the prompt will come from orchestrator
  model: 'o3-2025-04-16',
  tools: [fileSearch],
  outputType: writerOutputSchema,
});

// Export the agent as a tool for the orchestrator
export const writeSectionTool = writerAgentV2.asTool({
  toolName: 'write_section',
  toolDescription: 'Draft the next article section based on the outline and previous context',
});