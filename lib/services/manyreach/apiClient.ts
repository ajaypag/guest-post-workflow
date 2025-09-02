/**
 * ManyReach API Client with Workspace Support
 */

import { WorkspaceManager, ManyReachWorkspace } from './workspaceManager';

export interface Campaign {
  id: string;
  name: string;
  status: string;
  totalProspects?: number;
  repliedProspects?: number;
  bounceRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Prospect {
  email: string;
  replied: boolean;
  dateSentInitial?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  [key: string]: any;
}

export interface Message {
  type: 'SENT' | 'REPLY';
  messageId?: string;
  time: string;
  emailBody: string;
  subject?: string;
  from?: string;
  to?: string;
}

export interface EmailSelectionOptions {
  limit?: number;           // Maximum number of emails to process
  offset?: number;          // Skip first N emails
  filterReplied?: boolean;  // Only process replied prospects
  campaignIds?: string[];   // Specific campaigns to process
  dateFrom?: Date;          // Process emails from this date
  dateTo?: Date;            // Process emails to this date
  excludeProcessed?: boolean; // Skip already processed emails
}

export class ManyReachAPIClient {
  private baseUrl = 'https://app.manyreach.com/api';
  private workspaceManager: WorkspaceManager;
  private currentWorkspace: ManyReachWorkspace | null = null;
  
  constructor(workspaceId?: string) {
    this.workspaceManager = new WorkspaceManager();
    
    if (workspaceId) {
      try {
        this.setWorkspace(workspaceId);
      } catch (error) {
        // If workspace doesn't exist, leave currentWorkspace as null
        // This allows graceful handling in calling code
        console.warn(`Workspace ${workspaceId} not found, leaving currentWorkspace as null`);
      }
    } else {
      const defaultWs = this.workspaceManager.getDefaultWorkspace();
      if (defaultWs) {
        this.currentWorkspace = defaultWs;
      }
    }
  }
  
  /**
   * Switch to a different workspace
   */
  setWorkspace(workspaceId: string): void {
    const workspace = this.workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    this.currentWorkspace = workspace;
  }
  
  /**
   * Get current workspace
   */
  getCurrentWorkspace(): ManyReachWorkspace | null {
    return this.currentWorkspace;
  }
  
  /**
   * Get all available workspaces
   */
  getAvailableWorkspaces(): ManyReachWorkspace[] {
    return this.workspaceManager.getAllWorkspaces();
  }
  
  /**
   * Get API key for current workspace
   */
  private async getApiKey(): Promise<string> {
    if (!this.currentWorkspace) {
      throw new Error('No workspace selected');
    }
    
    const apiKey = await this.workspaceManager.getApiKey(this.currentWorkspace.id);
    if (!apiKey) {
      throw new Error(`No API key configured for workspace ${this.currentWorkspace.name}. Please configure it in /admin/manyreach-keys`);
    }
    
    return apiKey;
  }
  
  /**
   * Fetch all campaigns from current workspace
   */
  async getCampaigns(): Promise<Campaign[]> {
    if (!this.currentWorkspace) {
      console.warn('No workspace configured, returning empty campaigns list');
      return [];
    }
    
    console.log(`🔍 Fetching campaigns for workspace: ${this.currentWorkspace?.name}`);
    
    const apiKey = await this.getApiKey();
    const response = await fetch(
      `${this.baseUrl}/campaigns?apikey=${apiKey}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📊 Raw campaigns response:`, data);
    
    // Handle different response formats from ManyReach
    let campaigns = [];
    if (Array.isArray(data)) {
      campaigns = data;
    } else if (data.data && Array.isArray(data.data)) {
      campaigns = data.data;
    } else if (data.campaigns && Array.isArray(data.campaigns)) {
      campaigns = data.campaigns;
    }
    
    // Ensure each campaign has an ID field (ManyReach uses campaignID)
    campaigns = campaigns.map((c: any) => ({
      id: c.campaignID || c.id || c._id || c.campaignId || c.campaign_id,
      name: c.name || c.campaignName || c.campaign_name || 'Unnamed Campaign',
      status: c.campStatus || c.status || 'unknown',
      totalProspects: c.prospects || c.totalProspects || c.total_prospects || 0,
      repliedProspects: c.replies || c.repliedProspects || c.replied_prospects || 0,
      bounceRate: c.bounces || c.bounceRate || c.bounce_rate || 0,
      createdAt: c.dateCreated || c.createdAt || c.created_at,
      updatedAt: c.updatedAt || c.updated_at
    }));
    
    console.log(`✅ Processed ${campaigns.length} campaigns`);
    return campaigns;
  }
  
  /**
   * Get prospects from a campaign with filtering options
   */
  async getProspects(
    campaignId: string, 
    options?: EmailSelectionOptions
  ): Promise<Prospect[]> {
    const apiKey = await this.getApiKey();
    const response = await fetch(
      `${this.baseUrl}/campaigns/${campaignId}/prospects?apikey=${apiKey}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prospects: ${response.statusText}`);
    }
    
    const data = await response.json();
    let prospects = data.data || [];
    
    // Apply filtering options
    if (options) {
      // Filter by replied status
      if (options.filterReplied !== undefined) {
        prospects = prospects.filter((p: Prospect) => p.replied === options.filterReplied);
      }
      
      // Apply date filters
      if (options.dateFrom || options.dateTo) {
        prospects = prospects.filter((p: Prospect) => {
          if (!p.dateSentInitial) return false;
          const sentDate = new Date(p.dateSentInitial);
          
          if (options.dateFrom && sentDate < options.dateFrom) return false;
          if (options.dateTo && sentDate > options.dateTo) return false;
          
          return true;
        });
      }
      
      // Apply offset and limit
      if (options.offset) {
        prospects = prospects.slice(options.offset);
      }
      if (options.limit) {
        prospects = prospects.slice(0, options.limit);
      }
    }
    
    return prospects;
  }
  
  /**
   * Get email thread for a prospect
   */
  async getEmailThread(campaignId: string, prospectEmail: string): Promise<Message[]> {
    const apiKey = await this.getApiKey();
    const response = await fetch(
      `${this.baseUrl}/email-thread/${campaignId}/${encodeURIComponent(prospectEmail)}?apikey=${apiKey}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch email thread: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  }
  
  /**
   * Get campaigns with preview of replies
   */
  async getCampaignsWithReplies(options?: EmailSelectionOptions): Promise<{
    campaign: Campaign;
    repliedCount: number;
    totalCount: number;
    previewReplies: Array<{
      email: string;
      subject?: string;
      preview: string;
      date: string;
    }>;
  }[]> {
    const campaigns = await this.getCampaigns();
    const results = [];
    
    for (const campaign of campaigns) {
      // Apply campaign filter if specified
      if (options?.campaignIds && !options.campaignIds.includes(campaign.id)) {
        continue;
      }
      
      const prospects = await this.getProspects(campaign.id, {
        ...options,
        filterReplied: true,
        limit: 5 // Get preview of first 5 replies
      });
      
      const previewReplies = [];
      for (const prospect of prospects.slice(0, 3)) { // Preview first 3
        try {
          const thread = await this.getEmailThread(campaign.id, prospect.email);
          const replyMessage = thread.find(m => m.type === 'REPLY');
          if (replyMessage) {
            previewReplies.push({
              email: prospect.email,
              subject: replyMessage.subject,
              preview: replyMessage.emailBody.substring(0, 150) + '...',
              date: replyMessage.time
            });
          }
        } catch (error) {
          console.error(`Error fetching thread for ${prospect.email}:`, error);
        }
      }
      
      results.push({
        campaign,
        repliedCount: campaign.repliedProspects || 0,
        totalCount: campaign.totalProspects || 0,
        previewReplies
      });
    }
    
    return results;
  }
  
  /**
   * Count total emails that would be processed with given options
   */
  async countEmailsToProcess(options?: EmailSelectionOptions): Promise<{
    total: number;
    byCampaign: Map<string, number>;
  }> {
    const campaigns = await this.getCampaigns();
    const byCampaign = new Map<string, number>();
    let total = 0;
    
    for (const campaign of campaigns) {
      if (options?.campaignIds && !options.campaignIds.includes(campaign.id)) {
        continue;
      }
      
      const prospects = await this.getProspects(campaign.id, {
        ...options,
        limit: undefined, // Count all matching
        offset: undefined
      });
      
      const repliedProspects = prospects.filter(p => p.replied);
      const count = Math.min(repliedProspects.length, options?.limit || repliedProspects.length);
      
      byCampaign.set(campaign.name || campaign.id, count);
      total += count;
    }
    
    return { total, byCampaign };
  }
}