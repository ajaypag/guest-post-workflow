export interface BulkAnalysisProject {
  id: string;
  clientId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  status: 'active' | 'archived' | 'completed';
  autoApplyKeywords?: string[];
  tags?: string[];
  domainCount: number;
  qualifiedCount: number;
  workflowCount: number;
  lastActivityAt?: Date | string | null;
  createdBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // UI-only properties
  analyzedCount?: number;
  pendingCount?: number;
  analysisProgress?: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  autoApplyKeywords?: string[];
  tags?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: 'active' | 'archived' | 'completed';
  autoApplyKeywords?: string[];
  tags?: string[];
}