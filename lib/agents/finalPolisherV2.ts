import { Agent } from '@openai/agents';
import { fileSearchTool } from '@openai/agents-openai';

// File search tool with your vector store - contains brand guide and semantic SEO docs
const fileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

// V2 Polish Agent - Empty instructions for LLM-driven orchestration
export const polisherAgentV2 = new Agent({
  name: 'FinalPolisherV2',
  instructions: '', // CRITICAL: Empty - guidance comes from conversation prompts
  model: 'gpt-4o-mini',
  tools: [fileSearch], // Access to brand guide and semantic SEO knowledge base
});

// V2 approach: Let the LLM naturally balance brand voice with semantic clarity
// through the two-prompt loop pattern (proceed → cleanup)