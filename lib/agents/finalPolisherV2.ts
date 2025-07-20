import { Agent } from '@openai/agents';

// V2 Polish Agent - Empty instructions for LLM-driven orchestration
export const polisherAgentV2 = new Agent({
  name: 'FinalPolisherV2',
  instructions: '', // CRITICAL: Empty - guidance comes from conversation prompts
  model: 'gpt-4o-mini',
  tools: [], // No tools needed - pure conversational flow
});

// V2 approach: Let the LLM naturally balance brand voice with semantic clarity
// through the two-prompt loop pattern (proceed → cleanup)