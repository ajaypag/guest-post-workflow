import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import { EmailParserV3Simplified } from './emailParserV3Simplified';
import { ManyReachApiKeyService } from './manyreachApiKeyService';

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
  ignored: number;
  errors: string[];
  lastImportAt?: Date;
  newRepliesSinceLastImport?: number;
}

interface CampaignStatus {
  campaignId: string;
  campaignName: string;
  workspace: string;
  totalProspects: number;
  repliedProspects: number;
  lastImportAt?: Date;
  totalImported: number;
  totalIgnored: number;
  newReplies?: number;
}

export class ManyReachImportV3Enhanced {
  private apiKey: string | null = null;
  private workspaceName: string;
  private baseUrl = 'https://app.manyreach.com/api';
  private emailParser: EmailParserV3Simplified;
  
  constructor(workspaceName: string = 'main') {
    this.workspaceName = workspaceName;
    this.emailParser = new EmailParserV3Simplified();
  }
  
  /**
   * Initialize API key from database
   */
  private async ensureApiKey(): Promise<void> {
    if (!this.apiKey) {
      this.apiKey = await ManyReachApiKeyService.getApiKey(this.workspaceName);
      
      if (!this.apiKey) {
        // Fallback to env variable for backward compatibility
        this.apiKey = process.env.MANYREACH_API_KEY || null;
        
        if (!this.apiKey) {
          throw new Error(`No API key found for workspace '${this.workspaceName}'. Please configure it in /admin/manyreach-keys`);
        }
      }
    }
  }

  /**
   * Get all campaigns from ManyReach
   */
  async getCampaigns() {
    try {
      await this.ensureApiKey();
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
   * Get campaign import status with tracking info
   */
  async getCampaignStatus(campaignId: string): Promise<CampaignStatus | null> {
    try {
      // Get campaign info from ManyReach
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find((c: any) => 
        c.campaignID?.toString() === campaignId.toString()
      );
      
      if (!campaign) {
        return null;
      }

      // Get import tracking from database
      const trackingResult = await db.execute(sql`
        SELECT 
          last_import_at,
          total_imported,
          total_skipped
        FROM manyreach_campaign_imports
        WHERE workspace_name = ${this.workspaceName}
          AND campaign_id = ${campaignId}
        LIMIT 1
      `);

      const tracking = (trackingResult as any).rows?.[0];

      // Count ignored emails for this campaign
      const ignoredResult = await db.execute(sql`
        SELECT COUNT(*) as ignored_count
        FROM manyreach_ignored_emails
        WHERE (campaign_id = ${campaignId} AND workspace_name = ${this.workspaceName})
           OR (scope = 'global' AND email IN (
             SELECT DISTINCT email_from 
             FROM email_processing_logs 
             WHERE campaign_id = ${campaignId}
           ))
      `);

      const ignoredCount = (ignoredResult as any).rows?.[0]?.ignored_count || 0;

      // Count new replies since last import
      let newReplies = 0;
      if (tracking?.last_import_at) {
        // Get prospects that replied after last import
        await this.ensureApiKey();
        const prospectsResponse = await fetch(
          `${this.baseUrl}/campaigns/${campaignId}/prospects?apikey=${this.apiKey}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (prospectsResponse.ok) {
          const prospectsData = await prospectsResponse.json();
          const prospects: ManyReachProspect[] = prospectsData.data || [];
          
          // Check which ones are new since last import
          for (const prospect of prospects.filter(p => p.replied)) {
            const existingLog = await db.execute(sql`
              SELECT id FROM email_processing_logs
              WHERE email_from = ${prospect.email}
                AND campaign_id = ${campaignId}
                AND import_status = 'imported'
              LIMIT 1
            `);
            
            if ((existingLog as any).rows?.length === 0) {
              newReplies++;
            }
          }
        }
      }

      return {
        campaignId: campaign.campaignID,
        campaignName: campaign.name,
        workspace: this.workspaceName,
        totalProspects: campaign.prospects || 0,
        repliedProspects: campaign.replies || 0,
        lastImportAt: tracking?.last_import_at,
        totalImported: tracking?.total_imported || 0,
        totalIgnored: ignoredCount,
        newReplies
      };
    } catch (error) {
      console.error('Error getting campaign status:', error);
      return null;
    }
  }

  /**
   * Get status for all campaigns in workspace
   */
  async getAllCampaignStatuses(): Promise<CampaignStatus[]> {
    try {
      const campaigns = await this.getCampaigns();
      const statuses: CampaignStatus[] = [];

      for (const campaign of campaigns) {
        const status = await this.getCampaignStatus(campaign.campaignID);
        if (status) {
          statuses.push(status);
        }
      }

      return statuses;
    } catch (error) {
      console.error('Error getting all campaign statuses:', error);
      return [];
    }
  }

  /**
   * Check if an email is on the ignore list
   */
  private async isEmailIgnored(email: string, campaignId: string): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT id FROM manyreach_ignored_emails
      WHERE (
        (email = ${email} AND campaign_id = ${campaignId} AND workspace_name = ${this.workspaceName})
        OR (email = ${email} AND scope = 'global')
      )
      LIMIT 1
    `);

    return (result as any).rows?.length > 0;
  }

  /**
   * Add email to ignore list
   */
  async ignoreEmail(
    email: string, 
    campaignId?: string, 
    scope: 'global' | 'campaign' = 'campaign',
    reason?: string
  ): Promise<void> {
    await db.execute(sql`
      INSERT INTO manyreach_ignored_emails (
        email,
        campaign_id,
        workspace_name,
        scope,
        ignore_reason
      ) VALUES (
        ${email},
        ${campaignId || null},
        ${scope === 'campaign' ? this.workspaceName : null},
        ${scope},
        ${reason || null}
      )
      ON CONFLICT (email, campaign_id, workspace_name) DO NOTHING
    `);
  }

  /**
   * Update campaign import tracking
   */
  private async updateImportTracking(
    campaignId: string,
    campaignName: string,
    stats: {
      totalProspects: number;
      repliedProspects: number;
      imported: number;
      skipped: number;
    }
  ): Promise<void> {
    await db.execute(sql`
      INSERT INTO manyreach_campaign_imports (
        workspace_name,
        campaign_id,
        campaign_name,
        last_import_at,
        total_prospects,
        total_replied,
        total_imported,
        total_skipped
      ) VALUES (
        ${this.workspaceName},
        ${campaignId},
        ${campaignName},
        NOW(),
        ${stats.totalProspects},
        ${stats.repliedProspects},
        ${stats.imported},
        ${stats.skipped}
      )
      ON CONFLICT (workspace_name, campaign_id) 
      DO UPDATE SET
        campaign_name = EXCLUDED.campaign_name,
        last_import_at = NOW(),
        total_prospects = EXCLUDED.total_prospects,
        total_replied = EXCLUDED.total_replied,
        total_imported = manyreach_campaign_imports.total_imported + EXCLUDED.total_imported,
        total_skipped = manyreach_campaign_imports.total_skipped + EXCLUDED.total_skipped,
        updated_at = NOW()
    `);
  }

  /**
   * Import all real replies from a campaign
   */
  async importCampaignReplies(campaignId: string, onlyNewSince?: Date): Promise<ImportResult> {
    const result: ImportResult = {
      campaignId,
      totalProspects: 0,
      repliedProspects: 0,
      realReplies: 0,
      imported: 0,
      skipped: 0,
      ignored: 0,
      errors: []
    };

    console.log(`🔄 Starting import for campaign ${campaignId}...`);
    if (onlyNewSince) {
      console.log(`📅 Only importing replies since ${onlyNewSince.toISOString()}`);
    }

    try {
      // Get campaign info
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find((c: any) => 
        c.campaignID?.toString() === campaignId.toString()
      );
      
      let campaignSenderEmail: string | undefined;
      if (campaign) {
        result.campaignName = campaign.name;
        campaignSenderEmail = campaign.from;
        console.log(`📧 Campaign: ${campaign.name}`);
        console.log(`📧 Sender: ${campaignSenderEmail || 'unknown'}`);
      }

      // Get all prospects in campaign
      await this.ensureApiKey();
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
          // Check if email is ignored
          if (await this.isEmailIgnored(prospect.email, campaignId)) {
            console.log(`🚫 Ignored: ${prospect.email}`);
            result.ignored++;
            continue;
          }

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
          let replyMessages = messages.filter(m => m.type === 'REPLY');
          
          // Filter by date if specified
          if (onlyNewSince) {
            replyMessages = replyMessages.filter(m => 
              new Date(m.time) > onlyNewSince
            );
          }
          
          if (replyMessages.length === 0) {
            console.log(`⚠️ No real reply from ${prospect.email} (likely auto-reply/bounce or before cutoff date)`);
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
            result.campaignName,
            campaignSenderEmail
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

      // Update tracking
      await this.updateImportTracking(
        campaignId,
        result.campaignName || `Campaign ${campaignId}`,
        {
          totalProspects: result.totalProspects,
          repliedProspects: result.repliedProspects,
          imported: result.imported,
          skipped: result.skipped
        }
      );

      console.log(`✅ Import complete. Imported ${result.imported} new replies, ignored ${result.ignored}`);
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
    await this.ensureApiKey();
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
    campaignName?: string,
    campaignSenderEmail?: string
  ): Promise<{ status: string; message?: string }> {
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

      // Parse and create draft (rest of the logic stays the same)
      const parsedData = await this.emailParser.parseEmail(
        message.emailBody, 
        campaignSenderEmail,
        {
          from: message.from,
          to: message.to,
          subject: message.subject
        }
      );
      
      // Create draft for review
      await db.execute(sql`
        INSERT INTO publisher_drafts (
          email_log_id,
          parsed_data,
          status
        ) VALUES (
          ${emailLog.id},
          ${JSON.stringify(parsedData)}::jsonb,
          'pending'
        )
      `);

      return { status: 'created' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Extract text from HTML
   */
  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}