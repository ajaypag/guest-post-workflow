export interface BulkAnalysisDomain {
  id: string;
  clientId: string;
  domain: string;
  qualificationStatus: 'pending' | 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified';
  keywordCount: number;
  targetPageIds: string[];
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
  hasWorkflow?: boolean;
  workflowId?: string;
  workflowCreatedAt?: string;
  hasDataForSeoResults?: boolean;
  dataForSeoLastAnalyzed?: string;
  dataForSeoResultsCount?: number;
  aiQualificationReasoning?: string;
  aiQualifiedAt?: string;
  wasManuallyQualified?: boolean;
  manuallyQualifiedBy?: string;
  manuallyQualifiedAt?: string;
  wasHumanVerified?: boolean;
  humanVerifiedBy?: string;
  humanVerifiedAt?: string;
  selectedTargetPageId?: string;
  // AI Qualification V2 fields
  overlapStatus?: 'direct' | 'related' | 'both' | 'none';
  authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a';
  authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a';
  topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail';
  topicReasoning?: string;
  evidence?: {
    direct_count: number;
    direct_median_position: number | null;
    related_count: number;
    related_median_position: number | null;
  };
  // Project support
  projectId?: string | null;
  projectAddedAt?: string | null;
  project?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  };
  // Target URL Matching fields
  suggestedTargetUrl?: string;
  targetMatchData?: any; // JSONB field containing full AI analysis
  targetMatchedAt?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}