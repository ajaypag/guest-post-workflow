import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { emailFollowUps } from '@/lib/db/emailProcessingSchema';
import { eq, and, isNull, or, lte, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import * as crypto from 'crypto';
import { shadowPublisherConfig } from '@/lib/config/shadowPublisherConfig';

export class ShadowPublisherInvitationService {
  private resend: Resend | null = null;
  
  private getResend(): Resend {
    if (!this.resend) {
      const apiKey = process.env.RESEND_API_KEY || 're_test_key_here';
      this.resend = new Resend(apiKey);
    }
    return this.resend;
  }
  
  /**
   * Send invitation email to a shadow publisher
   */
  async sendInvitation(publisherId: string): Promise<boolean> {
    try {
      // Get publisher details
      const [publisher] = await db
        .select()
        .from(publishers)
        .where(
          and(
            eq(publishers.id, publisherId),
            eq(publishers.accountStatus, 'shadow')
          )
        )
        .limit(1);
      
      if (!publisher) {
        console.error('Publisher not found or not a shadow publisher:', publisherId);
        return false;
      }
      
      // Check if invitation was already sent recently
      if (publisher.invitationSentAt) {
        const hoursSinceSent = (Date.now() - publisher.invitationSentAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSent < 24) {
          console.log('Invitation already sent recently:', publisherId);
          return false;
        }
      }
      
      // Generate or use existing invitation token
      let invitationToken = publisher.invitationToken;
      if (!invitationToken) {
        invitationToken = this.generateInvitationToken();
        
        // Update publisher with token
        await db.update(publishers)
          .set({
            invitationToken,
            invitationExpiresAt: new Date(Date.now() + shadowPublisherConfig.invitation.expiryDays * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          })
          .where(eq(publishers.id, publisherId));
      }
      
      // Build claim URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const claimUrl = `${baseUrl}/publisher/claim?token=${invitationToken}`;
      
      // Send email
      const emailHtml = this.buildInvitationEmail(
        publisher.contactName || 'Publisher',
        publisher.email,
        claimUrl,
        publisher.source === 'manyreach'
      );
      
      const result = await this.getResend().emails.send({
        from: process.env.EMAIL_FROM || 'info@linkio.com',
        to: publisher.email,
        subject: 'Complete Your Publisher Account Setup',
        html: emailHtml,
      });
      
      if (result.error) {
        console.error('Failed to send invitation email:', result.error);
        return false;
      }
      
      // Update invitation sent timestamp
      await db.update(publishers)
        .set({
          invitationSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisherId));
      
      console.log('Invitation sent successfully to:', publisher.email);
      return true;
      
    } catch (error) {
      console.error('Failed to send invitation:', error);
      return false;
    }
  }
  
  /**
   * Send invitations to all eligible shadow publishers
   */
  async sendBulkInvitations(
    publisherIds?: string[], 
    source: string = 'migration',
    batchSize: number = 50  // Default batch size
  ): Promise<{ sent: number; failed: number; errors?: string[]; totalEligible?: number }> {
    const results = { sent: 0, failed: 0, errors: [] as string[], totalEligible: 0 };
    
    try {
      let publishersToInvite;
      
      if (publisherIds && publisherIds.length > 0) {
        // Use provided publisher IDs (limit to batchSize)
        const limitedIds = publisherIds.slice(0, batchSize);
        publishersToInvite = await db
          .select()
          .from(publishers)
          .where(
            and(
              eq(publishers.accountStatus, 'shadow'),
              or(
                ...limitedIds.map(id => eq(publishers.id, id))
              )
            )
          );
        results.totalEligible = publisherIds.length;
      } else {
        // Find shadow publishers who haven't been invited or need re-invitation
        // First count total eligible
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(publishers)
          .where(
            and(
              eq(publishers.accountStatus, 'shadow'),
              or(
                isNull(publishers.invitationSentAt),
                lte(publishers.invitationSentAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Older than 7 days
              )
            )
          );
        results.totalEligible = Number(countResult?.count || 0);
        
        // Then get batch
        publishersToInvite = await db
          .select()
          .from(publishers)
          .where(
            and(
              eq(publishers.accountStatus, 'shadow'),
              or(
                isNull(publishers.invitationSentAt),
                lte(publishers.invitationSentAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Older than 7 days
              )
            )
          )
          .limit(batchSize);
      }
      
      console.log(`📧 Processing ${publishersToInvite.length} publishers for invitations...`);
      
      for (const publisher of publishersToInvite) {
        try {
          const success = await this.sendInvitation(publisher.id);
          if (success) {
            results.sent++;
            console.log(`✅ Sent invitation to ${publisher.email}`);
          } else {
            results.failed++;
            results.errors?.push(`Failed to send to ${publisher.email}`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = `Error sending to ${publisher.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors?.push(errorMsg);
          console.error(errorMsg);
        }
        
        // Small delay to avoid overwhelming the API (100ms instead of 1000ms)
        // This allows ~10 emails per second vs 1 per second
        await this.delay(100);
      }
      
    } catch (error) {
      console.error('Failed to send bulk invitations:', error);
      results.errors?.push(`Bulk send error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return results;
  }
  
  /**
   * Send follow-up reminder for unclaimed accounts
   */
  async sendReminder(publisherId: string): Promise<boolean> {
    try {
      const [publisher] = await db
        .select()
        .from(publishers)
        .where(
          and(
            eq(publishers.id, publisherId),
            eq(publishers.accountStatus, 'shadow')
          )
        )
        .limit(1);
      
      if (!publisher || !publisher.invitationToken) {
        return false;
      }
      
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const claimUrl = `${baseUrl}/publisher/claim?token=${publisher.invitationToken}`;
      
      const emailHtml = this.buildReminderEmail(
        publisher.contactName || 'Publisher',
        claimUrl
      );
      
      const result = await this.getResend().emails.send({
        from: process.env.EMAIL_FROM || 'info@linkio.com',
        to: publisher.email,
        subject: 'Reminder: Complete Your Publisher Account Setup',
        html: emailHtml,
      });
      
      return !result.error;
      
    } catch (error) {
      console.error('Failed to send reminder:', error);
      return false;
    }
  }
  
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private buildInvitationEmail(name: string, email: string, claimUrl: string, fromManyReach: boolean): string {
    const contextMessage = fromManyReach
      ? `<p style="background-color: #f0f9ff; padding: 12px; border-radius: 6px; margin: 20px 0;">
          We received your response to our outreach email and have created a publisher account for you based on the information you provided.
        </p>`
      : '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Complete Your Publisher Account Setup</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Our Publisher Network!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; margin-top: -1px;">
            <p style="font-size: 16px; margin-top: 0;">Hi ${name},</p>
            
            ${contextMessage}
            
            <p>Your publisher account has been created with the email address: <strong>${email}</strong></p>
            
            <p>To complete your account setup and start managing your websites and offerings, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Complete Account Setup
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${claimUrl}" style="color: #667eea; word-break: break-all;">${claimUrl}</a>
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #111827; font-size: 16px;">What happens next?</h3>
              <ul style="color: #4b5563; margin: 10px 0; padding-left: 20px;">
                <li>Set up your password and complete your profile</li>
                <li>Manage your website listings and pricing</li>
                <li>Receive and manage guest post orders</li>
                <li>Track your earnings and performance</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              This invitation link will expire in ${shadowPublisherConfig.invitation.expiryDays} days for security reasons. 
              If you didn't expect this email or have any questions, please contact our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
              Guest Post Workflow System<br>
              © ${new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }
  
  private buildReminderEmail(name: string, claimUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reminder: Complete Your Publisher Account Setup</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">⏰ Reminder: Your Publisher Account is Waiting</h2>
          </div>
          
          <p style="font-size: 16px;">Hi ${name},</p>
          
          <p>We noticed you haven't completed your publisher account setup yet. Your account is ready and waiting for you!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${claimUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Complete Setup Now
            </a>
          </div>
          
          <p><strong>Why complete your setup?</strong></p>
          <ul>
            <li>Start receiving guest post orders immediately</li>
            <li>Set your own pricing and requirements</li>
            <li>Track earnings and performance</li>
            <li>Manage multiple websites from one dashboard</li>
          </ul>
          
          <p style="color: #dc2626; font-weight: 600;">
            ⚠️ This invitation link will expire soon. Don't miss out on potential revenue!
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            If you're having trouble with the button above, copy and paste this URL into your browser:<br>
            <a href="${claimUrl}" style="color: #667eea; word-break: break-all; font-size: 11px;">${claimUrl}</a>
          </p>
        </body>
      </html>
    `;
  }
}