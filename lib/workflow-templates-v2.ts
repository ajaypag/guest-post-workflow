import { WorkflowStep } from '@/types/workflow';

// IMPORTANT: We're keeping ALL steps, not replacing anything
// The link-orchestration step is OPTIONAL and works alongside individual steps
export const WORKFLOW_STEPS_WITH_ORCHESTRATION = [
  {
    id: 'domain-selection',
    title: 'Guest Post Site Selection',
    description: 'Identify the specific website where your guest post will be published. This forms the foundation for all subsequent analysis and content strategy.'
  },
  {
    id: 'keyword-research',
    title: 'Site Qualification and Preparation',
    description: 'Find topic overlap between the guest post site and your client to identify content opportunities with ranking potential.'
  },
  {
    id: 'topic-generation',
    title: 'Topic Generation',
    description: 'Generate guest post topics that meet three criteria: relevant to the guest post site, relevant to your client URL, and have search volume (10-50 searches/month target range).'
  },
  {
    id: 'deep-research',
    title: 'Outline Creation',
    description: 'Use GPT-o3 Deep Research to create a comprehensive, well-researched outline for your guest post with detailed findings and structure.'
  },
  {
    id: 'article-draft',
    title: 'Article Draft',
    description: 'Use GPT-o3 Advanced Reasoning to write the article section by section, building from research outline to complete draft with structured prompts and narrative flow.'
  },
  {
    id: 'content-audit',
    title: 'Semantic SEO Optimization',
    description: 'Review and optimize the article section by section against semantic SEO best practices using structured audit prompts to improve content quality and search performance.'
  },
  {
    id: 'final-polish',
    title: 'Polish & Finalize',
    description: 'Review article section by section for brand alignment using a critical two-prompt loop pattern (Proceed → Cleanup) to ensure voice consistency and adherence to brand guidelines.'
  },
  {
    id: 'formatting-qa',
    title: 'Formatting & QA',
    description: 'Manual formatting and citation check'
  },
  // OPTIONAL: Link orchestration (users can choose this OR individual steps)
  {
    id: 'link-orchestration',
    title: 'Link Building Hub (Optional)',
    description: 'Choose between AI-powered orchestration (all at once) or individual step control. This step provides both options without replacing the individual steps below.'
  },
  // Individual link building steps (kept for manual control)
  {
    id: 'internal-links',
    title: 'Internal Links',
    description: 'Add relevant internal links to other pages on the guest post site'
  },
  {
    id: 'external-links',
    title: 'External Links',
    description: 'Add authoritative external links to support claims and add credibility'
  },
  {
    id: 'client-mention',
    title: 'Client Mention',
    description: 'Add natural mentions of the client brand throughout the article'
  },
  {
    id: 'client-link',
    title: 'Client Link',
    description: 'Insert one contextual link to the client website'
  },
  {
    id: 'images',
    title: 'Images',
    description: 'Create or source relevant images for the article'
  },
  {
    id: 'link-requests',
    title: 'Link Requests',
    description: 'Identify opportunities for internal linking from existing content'
  },
  {
    id: 'url-suggestion',
    title: 'URL Suggestion',
    description: 'Suggest SEO-friendly URL for the guest post'
  },
  // Final step
  {
    id: 'email-template',
    title: 'Email Template',
    description: 'Generate professional email template for sending guest post to publisher with all relevant details and links.'
  }
];

// For backward compatibility
export const WORKFLOW_STEPS_V2 = WORKFLOW_STEPS_WITH_ORCHESTRATION;

// Helper to add orchestration step to workflows that don't have it
export function addOrchestrationStep(steps: WorkflowStep[]): WorkflowStep[] {
  // Check if orchestration step already exists
  if (steps.some(s => s.id === 'link-orchestration')) {
    return steps; // Already has orchestration, no changes needed
  }
  
  const newSteps: WorkflowStep[] = [];
  
  // Copy steps 0-7 as-is
  for (let i = 0; i <= 7; i++) {
    if (steps[i]) {
      newSteps.push(steps[i]);
    }
  }
  
  // Insert the orchestration step at position 8
  const linkOrchestrationStep: WorkflowStep = {
    id: 'link-orchestration',
    title: 'Link Building Hub (Optional)',
    description: 'Choose between AI-powered orchestration (all at once) or individual step control. This step provides both options without replacing the individual steps below.',
    status: 'pending',
    inputs: {},
    outputs: {}
  };
  
  newSteps.push(linkOrchestrationStep);
  
  // Copy ALL remaining steps (9-15 become 10-16)
  for (let i = 8; i < steps.length; i++) {
    if (steps[i]) {
      newSteps.push(steps[i]);
    }
  }
  
  return newSteps;
}

// DEPRECATED: This old function replaced steps, which we no longer want
export function migrateWorkflowToV2(oldSteps: WorkflowStep[]): WorkflowStep[] {
  console.warn('migrateWorkflowToV2 is deprecated. Use addOrchestrationStep instead.');
  // For backward compatibility, just add the orchestration step
  return addOrchestrationStep(oldSteps);
}

// Check if a workflow needs the orchestration step added
export function needsOrchestrationStep(steps: WorkflowStep[]): boolean {
  // Workflow needs orchestration if it doesn't have the link-orchestration step
  return !steps.some(s => s.id === 'link-orchestration');
}

// DEPRECATED: Old function name for backward compatibility
export function isLegacyWorkflow(steps: WorkflowStep[]): boolean {
  return needsOrchestrationStep(steps);
}

// Get the appropriate step index mapping
export function getStepIndexMapping(hasOrchestration: boolean = true): Record<string, number> {
  // With orchestration step, all steps are kept and orchestration is inserted at position 8
  if (hasOrchestration) {
    return {
      'domain-selection': 0,
      'keyword-research': 1,
      'topic-generation': 2,
      'deep-research': 3,
      'article-draft': 4,
      'content-audit': 5,
      'final-polish': 6,
      'formatting-qa': 7,
      'link-orchestration': 8, // NEW: Optional orchestration hub
      'internal-links': 9,     // Shifted from 8
      'external-links': 10,    // Shifted from 9
      'client-mention': 11,    // Shifted from 10
      'client-link': 12,       // Shifted from 11
      'images': 13,            // Shifted from 12
      'link-requests': 14,     // Shifted from 13
      'url-suggestion': 15,    // Shifted from 14
      'email-template': 16     // Shifted from 15
    };
  } else {
    // Original mapping without orchestration
    return {
      'domain-selection': 0,
      'keyword-research': 1,
      'topic-generation': 2,
      'deep-research': 3,
      'article-draft': 4,
      'content-audit': 5,
      'final-polish': 6,
      'formatting-qa': 7,
      'internal-links': 8,
      'external-links': 9,
      'client-mention': 10,
      'client-link': 11,
      'images': 12,
      'link-requests': 13,
      'url-suggestion': 14,
      'email-template': 15
    };
  }
}