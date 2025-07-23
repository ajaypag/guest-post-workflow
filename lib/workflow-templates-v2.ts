import { WorkflowStep } from '@/types/workflow';

// Original steps 0-7 remain unchanged
export const WORKFLOW_STEPS_V2 = [
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
  // NEW: Unified link orchestration step replaces steps 8-14
  {
    id: 'link-orchestration',
    title: 'Link Building & Optimization',
    description: 'Unified AI-powered step that handles: Internal Links, Client Mentions, Client Link Placement, Image Strategy, Link Requests, and URL Suggestion - all orchestrated in parallel and sequential phases for optimal efficiency.'
  },
  // Original final step remains
  {
    id: 'email-template',
    title: 'Email Template',
    description: 'Generate professional email template for sending guest post to publisher with all relevant details and links.'
  }
];

// Helper to convert old workflows to new format
export function migrateWorkflowToV2(oldSteps: WorkflowStep[]): WorkflowStep[] {
  const newSteps: WorkflowStep[] = [];
  
  // Copy steps 0-7 as-is
  for (let i = 0; i <= 7; i++) {
    if (oldSteps[i]) {
      newSteps.push(oldSteps[i]);
    }
  }
  
  // Create new link orchestration step with combined data from old steps 8-14
  const linkOrchestrationStep: WorkflowStep = {
    id: 'link-orchestration',
    title: 'Link Building & Optimization',
    description: 'Unified AI-powered step that handles: Internal Links, Client Mentions, Client Link Placement, Image Strategy, Link Requests, and URL Suggestion - all orchestrated in parallel and sequential phases for optimal efficiency.',
    status: 'pending',
    inputs: {},
    outputs: {}
  };
  
  // Check if any of the old steps 8-14 were completed
  let hasCompletedOldSteps = false;
  
  for (let i = 8; i <= 14; i++) {
    if (oldSteps[i]?.status === 'completed') {
      hasCompletedOldSteps = true;
      
      // Merge relevant data from old steps
      switch (oldSteps[i].id) {
        case 'internal-links':
          linkOrchestrationStep.outputs.internalLinksLegacy = oldSteps[i].outputs;
          break;
        case 'client-mention':
          linkOrchestrationStep.outputs.clientMentionLegacy = oldSteps[i].outputs;
          break;
        case 'client-link':
          linkOrchestrationStep.outputs.clientLinkLegacy = oldSteps[i].outputs;
          break;
        case 'images':
          linkOrchestrationStep.outputs.imagesLegacy = oldSteps[i].outputs;
          break;
        case 'link-requests':
          linkOrchestrationStep.outputs.linkRequestsLegacy = oldSteps[i].outputs;
          break;
        case 'url-suggestion':
          linkOrchestrationStep.outputs.urlSuggestionLegacy = oldSteps[i].outputs;
          break;
      }
    }
  }
  
  // Mark as completed if any old steps were completed
  if (hasCompletedOldSteps) {
    linkOrchestrationStep.status = 'completed';
    linkOrchestrationStep.outputs.migratedFromLegacy = true;
  }
  
  newSteps.push(linkOrchestrationStep);
  
  // Add the email template step (was step 15, now step 9)
  if (oldSteps[15]) {
    newSteps.push(oldSteps[15]);
  } else {
    newSteps.push({
      id: 'email-template',
      title: 'Email Template',
      description: 'Generate professional email template for sending guest post to publisher with all relevant details and links.',
      status: 'pending',
      inputs: {},
      outputs: {}
    });
  }
  
  return newSteps;
}

// Check if a workflow uses the old format
export function isLegacyWorkflow(steps: WorkflowStep[]): boolean {
  // If it has more than 10 steps and includes the old individual link steps
  return steps.length > 10 && 
    steps.some(s => ['internal-links', 'client-mention', 'client-link'].includes(s.id));
}

// Get the appropriate step index mapping
export function getStepIndexMapping(isV2: boolean = true): Record<string, number> {
  if (isV2) {
    return {
      'domain-selection': 0,
      'keyword-research': 1,
      'topic-generation': 2,
      'deep-research': 3,
      'article-draft': 4,
      'content-audit': 5,
      'final-polish': 6,
      'formatting-qa': 7,
      'link-orchestration': 8,
      'email-template': 9
    };
  } else {
    // Legacy mapping
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