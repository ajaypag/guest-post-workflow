import { Agent } from '@openai/agents';
import { fileSearchTool, webSearchTool } from '@openai/agents-openai';

// File search tool with your vector store - contains brand guide and semantic SEO docs
const fileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

// Web search tool for fact-checking and current information
const webSearch = webSearchTool();

// V2 Polish Agent - Empty instructions for LLM-driven orchestration
export const polisherAgentV2 = new Agent({
  name: 'FinalPolisherV2',
  instructions: '', // CRITICAL: Empty - guidance comes from conversation prompts
  model: 'o3-2025-04-16',
  tools: [fileSearch, webSearch], // Access to brand guide, semantic SEO knowledge base, and web search
});

// V2 approach: Let the LLM naturally balance brand voice with semantic clarity
// through a single-prompt pattern that combines analysis and polish