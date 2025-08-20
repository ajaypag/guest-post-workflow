import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { EmailParserService } from '@/lib/services/emailParserService';
import { ShadowPublisherService } from '@/lib/services/shadowPublisherService';
import { shadowPublisherServiceV2 } from '@/lib/services/shadowPublisherServiceV2';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

interface ManyReachProspect {
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  www?: string;
  domain?: string;
  replied: boolean;
  replies: number;
  dateSentInitial?: string;
  dateAdded?: string;
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

interface PollingResult {
  campaignId: string;
  campaignName?: string;
  totalProspects: number;
  repliedProspects: number;
  newRepliesProcessed: number;
  errors: string[];
  processedEmails: Array<{
    email: string;
    status: 'success' | 'error' | 'skipped';
    message: string;
    publisherId?: string | null;
  }>;
}

export class ManyReachPollingService {
  private apiKey: string;
  private baseUrl = 'https://app.manyreach.com/api';
  
  constructor() {
    this.apiKey = process.env.MANYREACH_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('MANYREACH_API_KEY environment variable is required');
    }
  }

  /**
   * Poll a specific campaign for new replies
   */
  async pollCampaignForReplies(campaignId: string): Promise<PollingResult> {
    const result: PollingResult = {
      campaignId,
      totalProspects: 0,
      repliedProspects: 0,
      newRepliesProcessed: 0,
      errors: [],
      processedEmails: []
    };

    console.log(`🔍 Polling ManyReach campaign ${campaignId} for replies...`);
    
    try {
      // Get campaign details first
      const campaignResponse = await fetch(
        `${this.baseUrl}/campaigns?apikey=${this.apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json();
        const campaign = campaignData.data?.find((c: any) => c.campaignID.toString() === campaignId);
        if (campaign) {
          result.campaignName = campaign.name;
        }
      }

      // Get all prospects in the campaign
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
      console.log(`📊 Found ${prospects.length} prospects in campaign`);

      // Filter for prospects who have replied
      const repliedProspects = prospects.filter(p => p.replied === true);
      result.repliedProspects = repliedProspects.length;
      
      console.log(`💬 Found ${repliedProspects.length} prospects with replies`);

      // Process each replied prospect
      for (const prospect of repliedProspects) {
        try {
          // Check if we've already processed this prospect's reply
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

          if (existingLog.length > 0) {
            console.log(`⏭️ Already processed reply from ${prospect.email}`);
            result.processedEmails.push({
              email: prospect.email,
              status: 'skipped',
              message: 'Already processed'
            });
            continue;
          }

          // Get the actual messages for this prospect
          const messages = await this.getProspectMessages(prospect.email);
          
          // Find the reply messages
          const replyMessages = messages.filter(m => m.type === 'REPLY');
          
          if (replyMessages.length === 0) {
            console.log(`❓ No reply content found for ${prospect.email} despite replied flag`);
            result.processedEmails.push({
              email: prospect.email,
              status: 'error',
              message: 'No reply content found'
            });
            continue;
          }

          // Process the latest reply
          const latestReply = replyMessages.sort((a, b) => 
            new Date(b.time).getTime() - new Date(a.time).getTime()
          )[0];

          const processResult = await this.processReply(
            prospect,
            latestReply,
            campaignId,
            result.campaignName
          );
          
          result.newRepliesProcessed++;
          result.processedEmails.push({
            email: prospect.email,
            status: 'success',
            message: `Processed with confidence ${(processResult.confidence * 100).toFixed(1)}%`,
            publisherId: processResult.publisherId
          });
          
          console.log(`✅ Processed reply from ${prospect.email}`);
          
        } catch (error) {
          const errorMsg = `Failed to process ${prospect.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
          result.processedEmails.push({
            email: prospect.email,
            status: 'error',
            message: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      }

      console.log(`✅ Polling complete. Processed ${result.newRepliesProcessed} new replies`);
      return result;

    } catch (error) {
      const errorMsg = `Polling error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Get all messages for a specific prospect
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
   * Process a reply and create shadow publisher if appropriate
   */
  private async processReply(
    prospect: ManyReachProspect,
    message: ManyReachMessage,
    campaignId: string,
    campaignName?: string
  ): Promise<{ confidence: number; publisherId?: string | null }> {
    const startTime = Date.now();

    // Strip HTML and extract text content
    const textContent = message.emailBody
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Create email processing log entry
    const [logEntry] = await db.insert(emailProcessingLogs).values({
      webhookId: `poll-${campaignId}-${Date.now()}`,
      campaignId,
      campaignName: campaignName || `ManyReach Campaign ${campaignId}`,
      campaignType: 'outreach',
      emailFrom: prospect.email,
      emailTo: 'outreach@linkio.com',
      emailSubject: message.subject || `Reply from ${prospect.firstname || prospect.email}`,
      emailMessageId: message.messageId || `manyreach-${Date.now()}`,
      receivedAt: new Date(message.time),
      rawContent: textContent,
      htmlContent: message.emailBody,
      threadId: null,
      replyCount: prospect.replies || 1,
      status: 'processing',
      processingDurationMs: null,
    }).returning();

    console.log(`📧 Processing polled reply from ${prospect.email} (Log ID: ${logEntry.id})`);

    try {
      // Check if V2 parser is enabled (same logic as webhook)
      const useV2Parser = process.env.USE_EMAIL_PARSER_V2 === 'true' || false;
      
      console.log('🔍 DEBUG: Environment variable USE_EMAIL_PARSER_V2 =', process.env.USE_EMAIL_PARSER_V2);
      console.log('🔍 DEBUG: useV2Parser resolved to:', useV2Parser);
      
      let publisherId: string | null = null;
      let confidence = 0;
      
      if (useV2Parser) {
        console.log('🚀 Using V2 parser with qualification system');
        
        // Use V2 service which includes parsing + qualification
        publisherId = await shadowPublisherServiceV2.processPublisherFromEmail(
          logEntry.id,
          textContent,
          prospect.email,
          message.subject || `Reply from ${prospect.company || prospect.firstname || prospect.email}`,
          'outreach'
        );
        
        if (publisherId) {
          console.log(`✅ Qualified publisher created with ID: ${publisherId}`);
          confidence = 1.0; // V2 qualified = high confidence
        } else {
          console.log(`❌ Email disqualified - no publisher created`);
          confidence = 0.0; // V2 disqualified = no confidence
        }
        
      } else {
        console.log('🔄 Using V1 parser (legacy mode)');
        
        // Parse the email content with AI (V1)
        const emailParser = new EmailParserService();
        const parsedData = await emailParser.parseEmail({
          from: prospect.email,
          subject: message.subject || `Reply from ${prospect.company || prospect.firstname || prospect.email}`,
          content: textContent
        });

        confidence = parsedData.overallConfidence;

        // Update log with parsing results
        await db.update(emailProcessingLogs)
          .set({
            parsedData: parsedData as any,
            confidenceScore: parsedData.overallConfidence.toString(),
            parsingErrors: (parsedData.errors || []) as any,
            status: parsedData.overallConfidence >= 0.7 ? 'parsed' : 'needs_review',
            processedAt: new Date(),
            processingDurationMs: Date.now() - startTime,
          })
          .where(eq(emailProcessingLogs.id, logEntry.id));

        console.log(`🤖 AI parsing completed with confidence: ${(parsedData.overallConfidence * 100).toFixed(1)}%`);

        // If confidence is high enough, create shadow publisher (V1)
        if (parsedData.overallConfidence >= 0.7) {
          const shadowPublisherService = new ShadowPublisherService();
          const legacyPublisherId = await shadowPublisherService.processPublisherFromEmail(
            logEntry.id, 
            parsedData, 
            'outreach'
          );
          publisherId = legacyPublisherId?.toString() || null;
          
          console.log(`✅ Shadow publisher created with ID: ${publisherId}`);
        } else {
          console.log(`⏸️ Confidence too low (${(parsedData.overallConfidence * 100).toFixed(1)}%) - queued for review`);
        }
      }

      return { confidence, publisherId };

    } catch (error) {
      console.error('Failed to process reply:', error);
      
      await db.update(emailProcessingLogs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processingDurationMs: Date.now() - startTime,
        })
        .where(eq(emailProcessingLogs.id, logEntry.id));
      
      throw error;
    }
  }

  /**
   * Poll all configured campaigns
   */
  async pollAllCampaigns(): Promise<PollingResult[]> {
    const campaignIds = process.env.MANYREACH_CAMPAIGN_IDS?.split(',') || 
                       ['29497', '26503', '24545', '24205', '28329', '26982'];
    
    console.log(`🔄 Starting poll for ${campaignIds.length} campaigns...`);
    
    const results: PollingResult[] = [];
    
    for (const campaignId of campaignIds) {
      try {
        const result = await this.pollCampaignForReplies(campaignId.trim());
        results.push(result);
      } catch (error) {
        console.error(`Failed to poll campaign ${campaignId}:`, error);
        results.push({
          campaignId: campaignId.trim(),
          totalProspects: 0,
          repliedProspects: 0,
          newRepliesProcessed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processedEmails: []
        });
      }
    }
    
    return results;
  }

  /**
   * Import historical replies from a campaign
   */
  async importHistoricalReplies(campaignId: string, limit?: number): Promise<PollingResult> {
    console.log(`📚 Starting historical import for campaign ${campaignId}...`);
    
    // For historical import, we temporarily bypass the duplicate check
    // by clearing the check or marking as historical
    const result = await this.pollCampaignForReplies(campaignId);
    
    console.log(`📚 Historical import complete: ${result.newRepliesProcessed} replies imported`);
    return result;
  }
}