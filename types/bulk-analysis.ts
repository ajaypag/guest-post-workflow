export interface BulkAnalysisDomain {
  id: string;
  clientId: string;
  domain: string;
  qualificationStatus: 'pending' | 'high_quality' | 'average_quality' | 'disqualified';
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
  aiQualificationReasoning?: string;
  aiQualifiedAt?: string;
  wasManuallyQualified?: boolean;
  manuallyQualifiedBy?: string;
  manuallyQualifiedAt?: string;
  wasHumanVerified?: boolean;
  humanVerifiedBy?: string;
  humanVerifiedAt?: string;
  selectedTargetPageId?: string;
}