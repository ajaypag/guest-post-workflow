import { db } from '@/lib/db/connection';
import { emailProcessingLogs, EmailProcessingLog } from '@/lib/db/emailProcessingSchema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { EmailParserV3Simplified } from './emailParserV3Simplified';
import { WorkspaceManager } from './manyreach/workspaceManager';

interface ManyReachProspect {
  email: string;
  replied: boolean;
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

interface ImportResult {
  campaignId: string;
  campaignName?: string;
  totalProspects: number;
  repliedProspects: number;
  realReplies: number;
  imported: number;
  skipped: number;
  errors: string[];
}

interface DraftCreationResult {
  draftId: string;
  emailLogId: string;
  status: 'created' | 'duplicate' | 'error';
  message?: string;
}

export class ManyReachImportV3 {
  private apiKey: string;
  private baseUrl = 'https://app.manyreach.com/api';
  private emailParser: EmailParserV3Simplified;
  private workspaceManager: WorkspaceManager;
  
  constructor(workspaceId?: string) {
    this.workspaceManager = new WorkspaceManager();
    this.emailParser = new EmailParserV3Simplified();
    
    // Get API key from workspace manager
    if (workspaceId) {
      this.apiKey = this.workspaceManager.getApiKey(workspaceId) || '';
    } else {
      const defaultWorkspace = this.workspaceManager.getDefaultWorkspace();
      this.apiKey = defaultWorkspace?.apiKey || process.env.MANYREACH_API_KEY || '';
    }
    
    if (!this.apiKey) {
      console.warn('⚠️ MANYREACH_API_KEY not set - import will fail');
    }
  }

  /**
   * Get all campaigns from ManyReach
   */
  async getCampaigns() {
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
      return data.data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Import all real replies from a campaign
   */
  async importCampaignReplies(campaignId: string): Promise<ImportResult> {
    const result: ImportResult = {
      campaignId,
      totalProspects: 0,
      repliedProspects: 0,
      realReplies: 0,
      imported: 0,
      skipped: 0,
      errors: []
    };

    console.log(`🔄 Starting import for campaign ${campaignId}...`);

    try {
      // Get campaign info
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find((c: any) => 
        c.campaignID?.toString() === campaignId.toString()
      );
      
      if (campaign) {
        result.campaignName = campaign.name;
      }

      // Get all prospects in campaign
      const prospectsResponse = await fetch(
        `${this.baseUrl}/campaigns/${campaignId}/prospects?apikey=${this.apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!prospectsResponse.ok) {
        throw new Error(`Failed to fetch prospects: ${prospectsResponse.statusText}`);
      }

      const prospectsData = await prospectsResponse.json();
      const prospects: ManyReachProspect[] = prospectsData.data || [];
      
      result.totalProspects = prospects.length;
      console.log(`Found ${prospects.length} prospects in campaign`);

      // Filter for prospects marked as replied
      const repliedProspects = prospects.filter(p => p.replied === true);
      result.repliedProspects = repliedProspects.length;
      
      console.log(`Found ${repliedProspects.length} prospects marked as replied`);

      // Process each replied prospect
      for (const prospect of repliedProspects) {
        try {
          // Check if we already imported this
          const existingLog = await db
            .select()
            .from(emailProcessingLogs)
            .where(
              and(
                eq(emailProcessingLogs.emailFrom, prospect.email),
                eq(emailProcessingLogs.campaignId, campaignId)
              )
            )
            .limit(1);

          if (existingLog.length > 0 && existingLog[0].import_status === 'imported') {
            console.log(`⏭️ Already imported: ${prospect.email}`);
            result.skipped++;
            continue;
          }

          // Get messages for this prospect
          const messages = await this.getProspectMessages(prospect.email);
          
          // Find REPLY messages (not auto-replies)
          const replyMessages = messages.filter(m => m.type === 'REPLY');
          
          if (replyMessages.length === 0) {
            console.log(`⚠️ No real reply from ${prospect.email} (likely auto-reply/bounce)`);
            continue;
          }

          result.realReplies++;

          // Process the latest reply
          const latestReply = replyMessages.sort((a, b) => 
            new Date(b.time).getTime() - new Date(a.time).getTime()
          )[0];

          const importResult = await this.processReply(
            prospect,
            latestReply,
            campaignId,
            result.campaignName
          );

          if (importResult.status === 'created') {
            result.imported++;
            console.log(`✅ Imported reply from ${prospect.email}`);
          } else if (importResult.status === 'duplicate') {
            result.skipped++;
            console.log(`⏭️ Duplicate: ${prospect.email}`);
          } else {
            result.errors.push(`Failed to import ${prospect.email}: ${importResult.message}`);
          }

        } catch (error) {
          const errorMsg = `Error processing ${prospect.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      console.log(`✅ Import complete. Imported ${result.imported} new replies`);
      return result;

    } catch (error) {
      const errorMsg = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Get messages for a specific prospect
   */
  private async getProspectMessages(email: string): Promise<ManyReachMessage[]> {
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
  }

  /**
   * Process a reply and create draft
   */
  private async processReply(
    prospect: ManyReachProspect,
    message: ManyReachMessage,
    campaignId: string,
    campaignName?: string
  ): Promise<DraftCreationResult> {
    try {
      // Store email in database
      const emailLogResult = await db.insert(emailProcessingLogs).values({
        webhookId: `import-${campaignId}-${Date.now()}`,
        campaignId,
        campaignName: campaignName || `Campaign ${campaignId}`,
        campaignType: 'outreach',
        emailFrom: message.from || prospect.email,
        emailTo: message.to || 'outreach@linkio.com',
        emailSubject: message.subject || 'Reply',
        emailMessageId: message.messageId || `manyreach-${Date.now()}`,
        receivedAt: new Date(message.time),
        rawContent: this.extractTextFromHtml(message.emailBody),
        htmlContent: message.emailBody,
        status: 'processing',
        import_status: 'imported'
      }).returning();

      const emailLog = (emailLogResult as any)[0];
      console.log(`📧 Stored email from ${prospect.email} (ID: ${emailLog.id})`);

      // Single-phase extraction with GPT-4 (combines email parsing + website analysis)
      console.log('🔍 Extracting publisher and website data with GPT-4...');
      const parsedData = await this.emailParser.parseEmail(message.emailBody);
      
      if (parsedData.hasOffer && parsedData.websites && parsedData.websites.length > 0) {
        console.log(`✅ Extracted ${parsedData.websites.length} website(s) with categories and types`);
        for (const website of parsedData.websites) {
          console.log(`  - ${website.domain}:`);
          if (website.categories?.length) {
            console.log(`    Categories: ${website.categories.join(', ')}`);
          }
          if (website.niche?.length) {
            console.log(`    Niche: ${website.niche.join(', ')}`);
          }
          if (website.websiteType?.length) {
            console.log(`    Type: ${website.websiteType.join(', ')}`);
          }
        }
      }

      // Check if this is a real offer
      if (!parsedData.hasOffer) {
        // Update log to show no offer
        await db.update(emailProcessingLogs)
          .set({
            status: 'parsed',
            parsedData: parsedData as any,
            import_status: 'skipped',
            processingDurationMs: 0
          })
          .where(eq(emailProcessingLogs.id, emailLog.id));

        console.log(`⚠️ No concrete offer found in email from ${prospect.email}`);
        return {
          draftId: '',
          emailLogId: emailLog.id,
          status: 'duplicate', // Using duplicate status for "no offer"
          message: 'No concrete offer found'
        };
      }

      // Create draft
      const draftResult = await db.execute(sql`
        INSERT INTO publisher_drafts (
          email_log_id,
          parsed_data,
          status
        ) VALUES (
          ${emailLog.id},
          ${JSON.stringify(parsedData)}::jsonb,
          'pending'
        )
        RETURNING id
      `);
      
      const draft = (draftResult as any).rows?.[0];
      
      if (!draft) {
        throw new Error('Failed to create draft - no draft returned');
      }

      // Update email log
      await db.update(emailProcessingLogs)
        .set({
          status: 'parsed',
          parsedData: parsedData as any,
          processingDurationMs: 0
        })
        .where(eq(emailProcessingLogs.id, emailLog.id));

      return {
        draftId: draft.id,
        emailLogId: emailLog.id,
        status: 'created'
      };

    } catch (error) {
      console.error('Error processing reply:', error);
      return {
        draftId: '',
        emailLogId: '',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract text from HTML email
   */
  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get import statistics
   */
  async getImportStats() {
    const campaigns = await this.getCampaigns();
    
    // Get import counts from our database
    const importCounts = await db
      .select({
        campaignId: emailProcessingLogs.campaignId,
        count: sql<number>`COUNT(*)`
      })
      .from(emailProcessingLogs)
      .where(eq(emailProcessingLogs.import_status, 'imported'))
      .groupBy(emailProcessingLogs.campaignId);

    // Get draft counts
    const draftCountsResult = await db.execute(sql`
      SELECT 
        e.campaign_id,
        COUNT(DISTINCT d.id) as draft_count,
        COUNT(DISTINCT CASE WHEN d.status = 'pending' THEN d.id END) as pending_count,
        COUNT(DISTINCT CASE WHEN d.status = 'approved' THEN d.id END) as approved_count
      FROM email_processing_logs e
      LEFT JOIN publisher_drafts d ON d.email_log_id = e.id
      WHERE e.import_status = 'imported'
      GROUP BY e.campaign_id
    `);
    const draftCounts = (draftCountsResult as any).rows || [];

    // Combine the data
    return campaigns.map((campaign: any) => {
      const imported = importCounts.find(c => c.campaignId === campaign.campaignID.toString());
      const drafts = draftCounts.find((d: any) => d.campaign_id === campaign.campaignID.toString());
      
      return {
        id: campaign.campaignID,
        name: campaign.name,
        status: campaign.campStatus,
        totalProspects: campaign.prospects || 0,
        sentCount: campaign.sents || 0,
        repliedCount: campaign.replies || 0,
        importedCount: imported?.count || 0,
        draftCount: drafts?.draft_count || 0,
        pendingCount: drafts?.pending_count || 0,
        approvedCount: drafts?.approved_count || 0
      };
    });
  }
}