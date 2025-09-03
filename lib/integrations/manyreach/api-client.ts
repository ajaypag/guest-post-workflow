interface Campaign {
  id: string;
  campaignID: string;
  name: string;
  prospects_count: number;
  replied_prospects_count: number;
}

interface ManyReachProspect {
  email: string;
  replied: boolean;
  replies: number;
  dateSentInitial?: string;
  [key: string]: any;
}

interface ManyReachMessage {
  type: 'SENT' | 'REPLY';
  messageId?: string;
  time: string;
  emailBody: string;
  subject?: string;
  from?: string;
  to?: string;
}

export class ManyReachAPIClient {
  private apiKey: string;
  private baseUrl = 'https://app.manyreach.com/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get all campaigns from ManyReach
   */
  async getCampaigns(): Promise<Campaign[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/campaigns?apikey=${this.apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).map((campaign: any) => ({
        id: campaign.campaignID?.toString() || campaign.id?.toString(),
        campaignID: campaign.campaignID?.toString() || campaign.id?.toString(),
        name: campaign.name || 'Unnamed Campaign',
        prospects_count: campaign.prospects || 0,
        replied_prospects_count: campaign.replies || 0,
      }));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Get prospects for a specific campaign
   */
  async getCampaignProspects(campaignId: string): Promise<ManyReachProspect[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/campaigns/${campaignId}/prospects?apikey=${this.apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch prospects: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`Error fetching prospects for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get messages for a specific prospect
   */
  async getProspectMessages(email: string): Promise<ManyReachMessage[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/prospects/messages/${encodeURIComponent(email)}?apikey=${this.apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch messages for ${email}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`Error fetching messages for ${email}:`, error);
      throw error;
    }
  }
}