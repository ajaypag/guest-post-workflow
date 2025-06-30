export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  completedAt?: Date;
}

export interface GuestPostWorkflow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  clientName: string;
  clientUrl: string;
  targetDomain: string;
  currentStep: number;
  steps: WorkflowStep[];
  metadata: {
    pitchKeyword?: string;
    pitchTopic?: string;
    articleTitle?: string;
    wordCount?: number;
    googleDocUrl?: string;
    finalDraftUrl?: string;
  };
}

export const WORKFLOW_STEPS = [
  {
    id: 'domain-selection',
    title: 'Domain Selection',
    description: 'Choose a site for guest posting'
  },
  {
    id: 'keyword-research',
    title: 'Keyword Research & Analysis',
    description: 'Generate keywords and analyze in Ahrefs'
  },
  {
    id: 'topic-generation',
    title: 'Topic Generation',
    description: 'Generate guest post topics using GPT'
  },
  {
    id: 'deep-research',
    title: 'Deep Research',
    description: 'Create detailed article outline'
  },
  {
    id: 'article-draft',
    title: 'Article Draft',
    description: 'Write the article using o3 Advanced Reasoning'
  },
  {
    id: 'content-audit',
    title: 'Content Audit & SEO',
    description: 'Audit and optimize the draft'
  },
  {
    id: 'final-polish',
    title: 'Polish & Finalize',
    description: 'Final edits and brand alignment'
  },
  {
    id: 'formatting-qa',
    title: 'Formatting & QA',
    description: 'Manual formatting and citation check'
  },
  {
    id: 'internal-links',
    title: 'Internal Links',
    description: 'Add internal links to guest post site'
  },
  {
    id: 'external-links',
    title: 'External Links',
    description: 'Link to other guest posts'
  },
  {
    id: 'client-mention',
    title: 'Client Mention',
    description: 'Add client mention for AI overviews'
  },
  {
    id: 'client-link',
    title: 'Client Link',
    description: 'Insert client link naturally'
  },
  {
    id: 'images',
    title: 'Create Images',
    description: 'Generate images for the post'
  },
  {
    id: 'link-requests',
    title: 'Link Requests',
    description: 'Find articles for internal link requests'
  },
  {
    id: 'url-suggestion',
    title: 'URL Suggestion',
    description: 'Suggest URL structure for the post'
  }
];