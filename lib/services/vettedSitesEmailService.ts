import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestClients } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { clients } from '@/lib/db/schema'; // Main schema file
import { eq, and, inArray, desc, or, sql } from 'drizzle-orm';
import { EmailService } from './emailService';
import { VettedSitesShareEmail } from '@/lib/email/templates/VettedSitesShareEmail';
import { VettedSitesApprovalEmail } from '@/lib/email/templates/VettedSitesApprovalEmail';
import { VettedSitesFulfillmentEmail } from '@/lib/email/templates/VettedSitesFulfillmentEmail';
import { VettedSitesRejectionEmail } from '@/lib/email/templates/VettedSitesRejectionEmail';
import { render } from '@react-email/render';

interface DomainMatchData {
  domain: string;
  directKeywords: number;
  relatedKeywords: number;
  avgPosition?: number;
  dr?: number;
  traffic?: number;
  cost?: number;
  reasoning?: string;
}

interface ShareEmailData {
  totalMatches: number;
  topDomains: DomainMatchData[];
  clientWebsite: string;
}

export class VettedSitesEmailService {
  /**
   * Build rich email data from database for share email
   */
  static async buildShareEmailData(requestId: string): Promise<ShareEmailData> {
    // Get request details
    const [request] = await db
      .select()
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error(`Vetted sites request ${requestId} not found`);
    }

    // Get client details for this request
    const requestClientsData = await db
      .select({
        client: clients
      })
      .from(vettedRequestClients)
      .leftJoin(clients, eq(vettedRequestClients.clientId, clients.id))
      .where(eq(vettedRequestClients.requestId, requestId))
      .limit(1);

    // Get client website (use first client if available)
    const clientWebsite = requestClientsData[0]?.client?.website || 'your website';

    // Get linked projects (same pattern as claim page)
    const { vettedRequestProjects } = await import('@/lib/db/vettedSitesRequestSchema');
    const linkedProjects = await db
      .select({
        projectId: vettedRequestProjects.projectId,
      })
      .from(vettedRequestProjects)
      .where(eq(vettedRequestProjects.requestId, requestId));
    
    const linkedProjectIds = linkedProjects.map(p => p.projectId);

    // Get qualified domains with their rich metrics (same pattern as claim page)
    const domains = linkedProjectIds.length > 0 ? await db
      .select({
        domain: bulkAnalysisDomains.domain,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus,
        evidence: bulkAnalysisDomains.evidence,
        aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
        // Website metrics (LEFT JOIN - may be null)
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        guestPostCost: websites.guestPostCost,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(
        and(
          // Query domains from linked projects OR with sourceRequestId (same as claim page)
          or(
            inArray(bulkAnalysisDomains.projectId, linkedProjectIds),
            eq(bulkAnalysisDomains.sourceRequestId, requestId)
          ),
          inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality'])
        )
      )
      .orderBy(desc(bulkAnalysisDomains.aiQualifiedAt)) // Order by qualification date
      .limit(5) : []; // Top 5 for email

    // Transform database results into email format
    const topDomains: DomainMatchData[] = domains.map(d => {
      const evidence = d.evidence as any; // JSONB data
      
      return {
        domain: d.domain,
        directKeywords: evidence?.direct_count || 0,
        relatedKeywords: evidence?.related_count || 0,
        avgPosition: evidence?.direct_median_position || undefined,
        dr: d.domainRating || undefined,
        traffic: d.totalTraffic || undefined,
        cost: d.guestPostCost ? Number(d.guestPostCost) : undefined,
        reasoning: d.aiQualificationReasoning?.substring(0, 80) + '...' || undefined,
      };
    });

    // Get total count of qualified domains (same pattern as claim page)
    const totalCountResult = linkedProjectIds.length > 0 ? await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkAnalysisDomains)
      .where(
        and(
          // Query domains from linked projects OR with sourceRequestId
          or(
            inArray(bulkAnalysisDomains.projectId, linkedProjectIds),
            eq(bulkAnalysisDomains.sourceRequestId, requestId)
          ),
          inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality'])
        )
      ) : [{ count: 0 }];

    return {
      totalMatches: totalCountResult[0]?.count || 0,
      topDomains,
      clientWebsite,
    };
  }

  /**
   * Send share token email notification
   */
  static async sendShareEmail(
    requestId: string,
    recipientEmail: string,
    recipientName: string,
    customMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get request data
      const [request] = await db
        .select()
        .from(vettedSitesRequests)
        .where(eq(vettedSitesRequests.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      if (!request.shareToken) {
        throw new Error(`No share token found for request ${requestId}`);
      }

      // Build rich email data
      const emailData = await this.buildShareEmailData(requestId);

      // Safeguard: Don't send emails with 0 matches
      if (emailData.totalMatches === 0) {
        throw new Error('Cannot send email: No qualified domains found. Please wait for analysis to complete or ensure domains meet quality criteria.');
      }

      // Generate claim URL
      const claimUrl = `${process.env.NEXTAUTH_URL}/vetted-sites/claim/${request.shareToken}?utm_source=email&utm_campaign=share`;

      // Create email template
      const emailTemplate = VettedSitesShareEmail({
        recipientName,
        clientWebsite: emailData.clientWebsite,
        totalMatches: emailData.totalMatches,
        topDomains: emailData.topDomains,
        proposalVideoUrl: request.proposalVideoUrl || undefined,
        customMessage,
        claimUrl,
        expiryDays: 30, // Default to 30 days
      });

      // Send email
      const result = await EmailService.sendWithTemplate(
        'vetted-sites-share' as any,
        recipientEmail,
        {
          subject: `${emailData.totalMatches} keyword-matched sites identified for ${emailData.clientWebsite}`,
          template: emailTemplate,
        }
      );

      if (result.success) {
        // Update request with email tracking
        await db
          .update(vettedSitesRequests)
          .set({
            shareRecipientEmail: recipientEmail,
            shareRecipientName: recipientName,
            shareCustomMessage: customMessage || null,
            shareEmailSentAt: new Date(),
          })
          .where(eq(vettedSitesRequests.id, requestId));
      }

      return result;

    } catch (error) {
      console.error('[VettedSitesEmailService] Share email failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send approval notification when status changes to approved
   */
  static async sendApprovalNotification(
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get request data with account
      const [request] = await db
        .select({
          id: vettedSitesRequests.id,
          targetUrls: vettedSitesRequests.targetUrls,
          accountId: vettedSitesRequests.accountId,
        })
        .from(vettedSitesRequests)
        .where(eq(vettedSitesRequests.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      if (!request.accountId) {
        console.log(`No account ID found for request ${requestId}`);
        return { success: true }; // Don't fail if no account
      }

      // Get account email
      const { accounts } = await import('@/lib/db/accountSchema');
      const [account] = await db
        .select({
          email: accounts.email,
          contactName: accounts.contactName,
        })
        .from(accounts)
        .where(eq(accounts.id, request.accountId))
        .limit(1);

      if (!account?.email) {
        console.log(`No email found for account ${request.accountId}`);
        return { success: true }; // Don't fail if no email
      }

      // Send email notification (using same pattern as working SitesReadyForReviewEmail)
      const result = await EmailService.sendWithTemplate(
        'notification' as any,
        account.email,
        {
          subject: 'Your vetted sites request has been approved ✅',
          template: VettedSitesApprovalEmail({
            recipientName: account.contactName || 'there',
            targetUrls: (request.targetUrls as string[]) || [],
            statusUrl: `${process.env.NEXTAUTH_URL}/vetted-sites?requestId=${requestId}&utm_source=email&utm_campaign=approval`,
          }),
        }
      );

      return result;

    } catch (error) {
      console.error('[VettedSitesEmailService] Approval notification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send fulfillment notification when status changes to fulfilled
   */
  static async sendFulfillmentNotification(
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get request data
      const [request] = await db
        .select({
          id: vettedSitesRequests.id,
          accountId: vettedSitesRequests.accountId,
        })
        .from(vettedSitesRequests)
        .where(eq(vettedSitesRequests.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      if (!request.accountId) {
        console.log(`No account ID found for request ${requestId}`);
        return { success: true }; // Don't fail if no account
      }

      // Get account email
      const { accounts } = await import('@/lib/db/accountSchema');
      const [account] = await db
        .select({
          email: accounts.email,
          contactName: accounts.contactName,
        })
        .from(accounts)
        .where(eq(accounts.id, request.accountId))
        .limit(1);

      if (!account?.email) {
        console.log(`No email found for account ${request.accountId}`);
        return { success: true }; // Don't fail if no email
      }

      // Get client info for the request
      const requestClients = await db
        .select({
          clientId: vettedRequestClients.clientId,
          client: clients,
        })
        .from(vettedRequestClients)
        .leftJoin(clients, eq(vettedRequestClients.clientId, clients.id))
        .where(eq(vettedRequestClients.requestId, requestId))
        .limit(1);

      const clientWebsite = requestClients[0]?.client?.website;

      // Build rich email data
      const emailData = await this.buildShareEmailData(requestId);

      // Calculate stats
      const avgKeywordOverlap = emailData.topDomains.reduce((sum, d) => 
        sum + (d.directKeywords + d.relatedKeywords), 0) / Math.max(emailData.topDomains.length, 1);
      
      const strongAuthorityCount = emailData.topDomains.filter(d => 
        (d.dr || 0) >= 70).length;
      const strongAuthorityPercentage = (strongAuthorityCount / Math.max(emailData.topDomains.length, 1)) * 100;

      // Create email template (using statically imported component)
      const emailTemplate = VettedSitesFulfillmentEmail({
        recipientName: account.contactName || undefined,
        totalQualified: emailData.totalMatches,
        topDomains: emailData.topDomains,
        resultsUrl: `${process.env.NEXTAUTH_URL}/vetted-sites?requestId=${requestId}&utm_source=email&utm_campaign=fulfillment`,
        clientWebsite,
        avgKeywordOverlap,
        strongAuthorityPercentage,
      });

      // Send email
      const result = await EmailService.sendWithTemplate(
        'notification' as any,
        account.email,
        {
          subject: `Your vetted sites analysis is ready! 🎯`,
          template: emailTemplate,
        }
      );

      return result;

    } catch (error) {
      console.error('[VettedSitesEmailService] Fulfillment notification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send rejection notification when status changes to rejected
   */
  static async sendRejectionNotification(
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get request data
      const [request] = await db
        .select({
          id: vettedSitesRequests.id,
          targetUrls: vettedSitesRequests.targetUrls,
          accountId: vettedSitesRequests.accountId,
        })
        .from(vettedSitesRequests)
        .where(eq(vettedSitesRequests.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      if (!request.accountId) {
        console.log(`No account ID found for request ${requestId}`);
        return { success: true }; // Don't fail if no account
      }

      // Get account email
      const { accounts } = await import('@/lib/db/accountSchema');
      const [account] = await db
        .select({
          email: accounts.email,
          contactName: accounts.contactName,
        })
        .from(accounts)
        .where(eq(accounts.id, request.accountId))
        .limit(1);

      if (!account?.email) {
        console.log(`No email found for account ${request.accountId}`);
        return { success: true }; // Don't fail if no email
      }

      // Create email template (using statically imported component)
      const emailTemplate = VettedSitesRejectionEmail({
        recipientName: account.contactName || undefined,
        targetUrls: request.targetUrls as string[],
        replyEmail: 'info@linkio.com',
      });

      // Send email
      const result = await EmailService.sendWithTemplate(
        'notification' as any,
        account.email,
        {
          subject: 'Update on your vetted sites request',
          template: emailTemplate,
        }
      );

      return result;

    } catch (error) {
      console.error('[VettedSitesEmailService] Rejection notification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export instance for convenience
export const vettedSitesEmailService = new VettedSitesEmailService();