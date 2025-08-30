export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  completedAt?: Date;
  fields?: {
    inputs?: Array<{
      name: string;
      label: string;
      placeholder?: string;
      type?: string;
    }>;
    outputs?: Array<{
      name: string;
      label: string;
      placeholder?: string;
      type?: string;
    }>;
  };
}

export interface GuestPostWorkflow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  clientName: string;
  clientUrl: string;
  targetDomain: string;
  websiteId?: string; // NEW: Foreign key to websites table
  currentStep: number;
  createdBy: string; // User name who created the workflow
  createdByEmail?: string; // Optional: User email for more identification
  userId?: string; // ID of user who created the workflow
  assignedUserId?: string; // ID of user currently assigned to work on this workflow
  estimatedCompletionDate?: Date; // Expected delivery date (14 days from assignment)
  assignedAt?: Date; // When the workflow was assigned
  steps: WorkflowStep[];
  website?: { // NEW: Website data from database JOIN
    id: string;
    domain: string;
    domainRating?: number | null;
    totalTraffic?: number | null;
    publisherCompany?: string | null;
    overallQuality?: string | null;
  };
  metadata: {
    pitchKeyword?: string;
    pitchTopic?: string;
    articleTitle?: string;
    wordCount?: number;
    googleDocUrl?: string;
    finalDraftUrl?: string;
    clientId?: string;
    orderId?: string;
    orderGroupId?: string;
    siteSelectionId?: string;
    targetPageUrl?: string;
    anchorText?: string;
    targetPageId?: string;
  };
}

// Updated step titles - force reload
export const WORKFLOW_STEPS = [
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
    id: 'publisher-pre-approval',
    title: 'Publisher Pre-Approval',
    description: 'Confirm pricing and topic with blogger before content creation. Send professional outreach email with topic proposals, pricing confirmation, and timeline expectations to ensure alignment before proceeding.'
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
  {
    id: 'internal-links',
    title: 'Add Internal Links',
    description: 'Add internal links to guest post site'
  },
  {
    id: 'external-links',
    title: 'Add Tier 2 Links',
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
    title: 'Internal Links to New Guest Post',
    description: 'Find articles for internal link requests'
  },
  {
    id: 'url-suggestion',
    title: 'URL Suggestion',
    description: 'Suggest URL structure for the post'
  },
  {
    id: 'publication-outreach',
    title: 'Publication & Outreach',
    description: 'Send final article to publisher with payment terms and publication timeline. Coordinate publication scheduling and track publisher response and confirmation.'
  },
  {
    id: 'publication-verification',
    title: 'Publication Verification & QA',
    description: 'Verify published article meets quality standards. Complete QA checklist: confirm URL, validate all links, verify images, check formatting, and authorize payment to publisher upon successful completion.'
  }
];