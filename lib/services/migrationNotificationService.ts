/**
 * Migration Notification Service
 * 
 * Sends notifications about migration progress, issues, and milestones
 */

import { EmailService } from './emailService';
import { migrationStatusService } from './migrationStatusService';

export interface NotificationConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    frequency: 'realtime' | 'hourly' | 'daily';
  };
  slack: {
    enabled: boolean;
    webhook?: string;
    channels: string[];
  };
  milestones: {
    enabled: boolean;
    thresholds: number[]; // e.g., [25, 50, 75, 100] for percentage milestones
  };
}

interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
}

export class MigrationNotificationService {
  private config: NotificationConfig;
  private lastNotificationTime = new Map<string, Date>();

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Send migration started notification
   */
  async notifyMigrationStarted(sessionId: string, type: 'dry_run' | 'live', stats: any): Promise<void> {
    if (!this.config.email.enabled) return;

    const template = this.createMigrationStartedTemplate(sessionId, type, stats);
    
    await this.sendEmailNotification(template, `migration_started_${sessionId}`);
    await this.sendSlackNotification(
      `🚀 Publisher migration ${type === 'dry_run' ? '(DRY RUN)' : 'LIVE'} started\n` +
      `Session: ${sessionId}\n` +
      `Publishers to migrate: ${stats.totalWebsites || 'TBD'}`
    );
  }

  /**
   * Send migration completed notification
   */
  async notifyMigrationCompleted(sessionId: string, results: any): Promise<void> {
    if (!this.config.email.enabled) return;

    const template = this.createMigrationCompletedTemplate(sessionId, results);
    
    await this.sendEmailNotification(template, `migration_completed_${sessionId}`);
    await this.sendSlackNotification(
      `✅ Publisher migration completed\n` +
      `Session: ${sessionId}\n` +
      `Publishers created: ${results.shadowPublishersCreated}\n` +
      `Offerings created: ${results.offeringsCreated}\n` +
      `Success rate: ${results.errors?.length === 0 ? '100%' : 'With errors'}`
    );
  }

  /**
   * Send migration milestone notification
   */
  async notifyMigrationMilestone(sessionId: string, milestone: number, progress: any): Promise<void> {
    if (!this.config.milestones.enabled) return;
    if (!this.config.milestones.thresholds.includes(milestone)) return;

    const template = this.createMilestoneTemplate(sessionId, milestone, progress);
    
    await this.sendEmailNotification(template, `milestone_${milestone}_${sessionId}`);
    await this.sendSlackNotification(
      `📊 Migration milestone reached: ${milestone}%\n` +
      `Session: ${sessionId}\n` +
      `Progress: ${progress.completedSteps}/${progress.totalSteps} phases complete`
    );
  }

  /**
   * Send migration error notification
   */
  async notifyMigrationError(sessionId: string, error: string, phase?: string): Promise<void> {
    if (!this.config.email.enabled) return;

    const template = this.createErrorTemplate(sessionId, error, phase);
    
    await this.sendEmailNotification(template, `migration_error_${sessionId}`, true);
    await this.sendSlackNotification(
      `🚨 Migration error occurred\n` +
      `Session: ${sessionId}\n` +
      `Phase: ${phase || 'Unknown'}\n` +
      `Error: ${error.substring(0, 200)}...`
    );
  }

  /**
   * Send daily migration summary
   */
  async sendDailySummary(): Promise<void> {
    if (this.config.email.frequency !== 'daily') return;

    const sessions = migrationStatusService.getRecentSessions(24);
    if (sessions.length === 0) return;

    const template = this.createDailySummaryTemplate(sessions);
    
    await this.sendEmailNotification(template, `daily_summary_${new Date().toISOString().split('T')[0]}`);
  }

  /**
   * Send invitation campaign notifications
   */
  async notifyInvitationCampaign(campaignId: string, results: { sent: number; failed: number }): Promise<void> {
    if (!this.config.email.enabled) return;

    const template = this.createInvitationCampaignTemplate(campaignId, results);
    
    await this.sendEmailNotification(template, `invitation_campaign_${campaignId}`);
    await this.sendSlackNotification(
      `📧 Invitation campaign completed\n` +
      `Campaign: ${campaignId}\n` +
      `Sent: ${results.sent}\n` +
      `Failed: ${results.failed}\n` +
      `Success rate: ${(results.sent / (results.sent + results.failed) * 100).toFixed(1)}%`
    );
  }

  /**
   * Send publisher claim notifications
   */
  async notifyPublisherClaim(publisherName: string, companyName: string, websiteCount: number): Promise<void> {
    if (!this.config.email.enabled) return;

    const template = this.createPublisherClaimTemplate(publisherName, companyName, websiteCount);
    
    await this.sendEmailNotification(template, `publisher_claim_${Date.now()}`);
    await this.sendSlackNotification(
      `🎉 Publisher claimed account\n` +
      `Publisher: ${publisherName} (${companyName})\n` +
      `Websites: ${websiteCount}`
    );
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    template: NotificationTemplate, 
    key: string, 
    isUrgent: boolean = false
  ): Promise<void> {
    // Check rate limiting (except for urgent notifications)
    if (!isUrgent && this.isRateLimited(key)) {
      return;
    }

    try {
      await EmailService.send('notification', {
        to: this.config.email.recipients,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: 'Migration System <system@linkio.com>',
        tags: [{ name: 'migration_notification', value: isUrgent ? 'urgent' : 'normal' }]
      });

      this.lastNotificationTime.set(key, new Date());
      
    } catch (error) {
      console.error(`Failed to send email notification for ${key}:`, error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: string): Promise<void> {
    if (!this.config.slack.enabled || !this.config.slack.webhook) return;

    try {
      const response = await fetch(this.config.slack.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: 'Migration Bot',
          icon_emoji: ':robot_face:'
        })
      });

      if (!response.ok) {
        console.error('Failed to send Slack notification:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Check if notification is rate limited
   */
  private isRateLimited(key: string): boolean {
    const lastSent = this.lastNotificationTime.get(key);
    if (!lastSent) return false;

    const minInterval = this.getMinNotificationInterval();
    const elapsed = Date.now() - lastSent.getTime();
    
    return elapsed < minInterval;
  }

  /**
   * Get minimum notification interval based on frequency config
   */
  private getMinNotificationInterval(): number {
    switch (this.config.email.frequency) {
      case 'realtime': return 5 * 60 * 1000; // 5 minutes
      case 'hourly': return 60 * 60 * 1000; // 1 hour
      case 'daily': return 24 * 60 * 60 * 1000; // 24 hours
      default: return 5 * 60 * 1000;
    }
  }

  /**
   * Create migration started email template
   */
  private createMigrationStartedTemplate(sessionId: string, type: string, stats: any): NotificationTemplate {
    const subject = `Publisher Migration ${type.toUpperCase()} Started - ${sessionId}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🚀 Publisher Migration Started</h2>
        <p>A new publisher migration session has been initiated.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Migration Details</h3>
          <ul>
            <li><strong>Session ID:</strong> ${sessionId}</li>
            <li><strong>Type:</strong> ${type === 'dry_run' ? 'Dry Run (Safe)' : 'Live Migration'}</li>
            <li><strong>Started:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Websites to process:</strong> ${stats.totalWebsites || 'TBD'}</li>
          </ul>
        </div>
        
        <p>You can monitor progress in the <a href="${process.env.NEXTAUTH_URL}/admin/publisher-migration">migration dashboard</a>.</p>
        
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated notification from the Linkio migration system.
        </p>
      </div>
    `;
    
    const text = `
Publisher Migration ${type.toUpperCase()} Started - ${sessionId}

A new publisher migration session has been initiated.

Migration Details:
- Session ID: ${sessionId}
- Type: ${type === 'dry_run' ? 'Dry Run (Safe)' : 'Live Migration'}
- Started: ${new Date().toLocaleString()}
- Websites to process: ${stats.totalWebsites || 'TBD'}

Monitor progress at: ${process.env.NEXTAUTH_URL}/admin/publisher-migration
    `;

    return { subject, html, text };
  }

  /**
   * Create migration completed email template
   */
  private createMigrationCompletedTemplate(sessionId: string, results: any): NotificationTemplate {
    const isSuccess = results.errors?.length === 0;
    const subject = `Publisher Migration ${isSuccess ? 'Completed Successfully' : 'Completed with Issues'} - ${sessionId}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isSuccess ? '#10b981' : '#f59e0b'};">
          ${isSuccess ? '✅' : '⚠️'} Migration ${isSuccess ? 'Completed' : 'Completed with Issues'}
        </h2>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Results Summary</h3>
          <ul>
            <li><strong>Session ID:</strong> ${sessionId}</li>
            <li><strong>Shadow Publishers Created:</strong> ${results.shadowPublishersCreated}</li>
            <li><strong>Offerings Created:</strong> ${results.offeringsCreated}</li>
            <li><strong>Relationships Created:</strong> ${results.relationshipsCreated}</li>
            <li><strong>Errors:</strong> ${results.errors?.length || 0}</li>
            <li><strong>Skipped:</strong> ${results.skipped?.length || 0}</li>
          </ul>
        </div>
        
        ${!isSuccess ? `
          <div style="background: #fef3cd; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h4 style="color: #92400e; margin-top: 0;">Issues Encountered</h4>
            <p>The migration completed but encountered some issues. Please review the detailed report.</p>
          </div>
        ` : ''}
        
        <p>View full details in the <a href="${process.env.NEXTAUTH_URL}/admin/publisher-migration">migration dashboard</a>.</p>
      </div>
    `;
    
    const text = `
Publisher Migration ${isSuccess ? 'Completed Successfully' : 'Completed with Issues'} - ${sessionId}

Results Summary:
- Session ID: ${sessionId}
- Shadow Publishers Created: ${results.shadowPublishersCreated}
- Offerings Created: ${results.offeringsCreated}
- Relationships Created: ${results.relationshipsCreated}
- Errors: ${results.errors?.length || 0}
- Skipped: ${results.skipped?.length || 0}

View full details at: ${process.env.NEXTAUTH_URL}/admin/publisher-migration
    `;

    return { subject, html, text };
  }

  /**
   * Create milestone notification template
   */
  private createMilestoneTemplate(sessionId: string, milestone: number, progress: any): NotificationTemplate {
    const subject = `Migration Milestone: ${milestone}% Complete - ${sessionId}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">📊 Migration Milestone Reached</h2>
        <p>Your publisher migration has reached ${milestone}% completion.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Progress Update</h3>
          <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 16px 0;">
            <div style="background: #7c3aed; height: 100%; width: ${milestone}%; transition: width 0.3s;"></div>
          </div>
          <ul>
            <li><strong>Completion:</strong> ${milestone}%</li>
            <li><strong>Phases Complete:</strong> ${progress.completedSteps}/${progress.totalSteps}</li>
            <li><strong>Current Phase:</strong> ${progress.currentPhase || 'Unknown'}</li>
          </ul>
        </div>
        
        <p>Continue monitoring in the <a href="${process.env.NEXTAUTH_URL}/admin/publisher-migration">migration dashboard</a>.</p>
      </div>
    `;
    
    const text = `
Migration Milestone: ${milestone}% Complete - ${sessionId}

Your publisher migration has reached ${milestone}% completion.

Progress Update:
- Completion: ${milestone}%  
- Phases Complete: ${progress.completedSteps}/${progress.totalSteps}
- Current Phase: ${progress.currentPhase || 'Unknown'}

Continue monitoring at: ${process.env.NEXTAUTH_URL}/admin/publisher-migration
    `;

    return { subject, html, text };
  }

  /**
   * Create error notification template
   */
  private createErrorTemplate(sessionId: string, error: string, phase?: string): NotificationTemplate {
    const subject = `🚨 Migration Error - ${sessionId}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Migration Error</h2>
        <p>An error occurred during the publisher migration process.</p>
        
        <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="color: #991b1b; margin-top: 0;">Error Details</h3>
          <ul>
            <li><strong>Session ID:</strong> ${sessionId}</li>
            <li><strong>Phase:</strong> ${phase || 'Unknown'}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p><strong>Error Message:</strong></p>
          <pre style="background: #fff; padding: 8px; border-radius: 4px; overflow-x: auto;">${error}</pre>
        </div>
        
        <p>Please check the <a href="${process.env.NEXTAUTH_URL}/admin/publisher-migration">migration dashboard</a> for more details and resolution steps.</p>
      </div>
    `;
    
    const text = `
🚨 Migration Error - ${sessionId}

An error occurred during the publisher migration process.

Error Details:
- Session ID: ${sessionId}
- Phase: ${phase || 'Unknown'}
- Time: ${new Date().toLocaleString()}

Error Message:
${error}

Check the migration dashboard for more details: ${process.env.NEXTAUTH_URL}/admin/publisher-migration
    `;

    return { subject, html, text };
  }

  /**
   * Create daily summary template
   */
  private createDailySummaryTemplate(sessions: any[]): NotificationTemplate {
    const subject = `Daily Migration Summary - ${new Date().toLocaleDateString()}`;
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const errorSessions = sessions.filter(s => s.status === 'error');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #374151;">📅 Daily Migration Summary</h2>
        <p>Here's your daily summary of publisher migration activity.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Today's Activity</h3>
          <ul>
            <li><strong>Total Sessions:</strong> ${sessions.length}</li>
            <li><strong>Completed:</strong> ${completedSessions.length}</li>
            <li><strong>Errors:</strong> ${errorSessions.length}</li>
          </ul>
        </div>
        
        ${sessions.length > 0 ? `
          <div style="margin: 24px 0;">
            <h3>Recent Sessions</h3>
            ${sessions.slice(0, 5).map(session => `
              <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; margin: 8px 0;">
                <strong>${session.id}</strong> - ${session.type} 
                <span style="color: ${session.status === 'completed' ? '#10b981' : '#ef4444'};">
                  (${session.status})
                </span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <p>View all activity in the <a href="${process.env.NEXTAUTH_URL}/admin/publisher-migration">migration dashboard</a>.</p>
      </div>
    `;
    
    const text = `
Daily Migration Summary - ${new Date().toLocaleDateString()}

Today's Activity:
- Total Sessions: ${sessions.length}
- Completed: ${completedSessions.length}
- Errors: ${errorSessions.length}

View all activity at: ${process.env.NEXTAUTH_URL}/admin/publisher-migration
    `;

    return { subject, html, text };
  }

  /**
   * Create invitation campaign template
   */
  private createInvitationCampaignTemplate(campaignId: string, results: any): NotificationTemplate {
    const subject = `Invitation Campaign Complete - ${campaignId}`;
    const successRate = (results.sent / (results.sent + results.failed) * 100).toFixed(1);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">📧 Invitation Campaign Complete</h2>
        <p>Your publisher invitation campaign has finished processing.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Campaign Results</h3>
          <ul>
            <li><strong>Campaign ID:</strong> ${campaignId}</li>
            <li><strong>Invitations Sent:</strong> ${results.sent}</li>
            <li><strong>Failed:</strong> ${results.failed}</li>
            <li><strong>Success Rate:</strong> ${successRate}%</li>
          </ul>
        </div>
        
        <p>Monitor publisher responses in the <a href="${process.env.NEXTAUTH_URL}/admin/publisher-migration">migration dashboard</a>.</p>
      </div>
    `;
    
    const text = `
Invitation Campaign Complete - ${campaignId}

Campaign Results:
- Campaign ID: ${campaignId}
- Invitations Sent: ${results.sent}
- Failed: ${results.failed}
- Success Rate: ${successRate}%

Monitor responses at: ${process.env.NEXTAUTH_URL}/admin/publisher-migration
    `;

    return { subject, html, text };
  }

  /**
   * Create publisher claim template
   */
  private createPublisherClaimTemplate(publisherName: string, companyName: string, websiteCount: number): NotificationTemplate {
    const subject = `🎉 New Publisher Claimed Account - ${companyName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">🎉 Publisher Account Claimed</h2>
        <p>Great news! A publisher has claimed their account.</p>
        
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="color: #166534; margin-top: 0;">Publisher Details</h3>
          <ul>
            <li><strong>Name:</strong> ${publisherName}</li>
            <li><strong>Company:</strong> ${companyName}</li>
            <li><strong>Websites:</strong> ${websiteCount}</li>
            <li><strong>Claimed:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <p>The publisher can now start receiving orders through the marketplace!</p>
      </div>
    `;
    
    const text = `
🎉 Publisher Account Claimed - ${companyName}

Publisher Details:
- Name: ${publisherName}
- Company: ${companyName}  
- Websites: ${websiteCount}
- Claimed: ${new Date().toLocaleString()}

The publisher can now start receiving orders through the marketplace!
    `;

    return { subject, html, text };
  }
}

// Default notification configuration
export const defaultNotificationConfig: NotificationConfig = {
  email: {
    enabled: true,
    recipients: ['admin@linkio.com'],
    frequency: 'realtime'
  },
  slack: {
    enabled: false,
    channels: ['#migrations']
  },
  milestones: {
    enabled: true,
    thresholds: [25, 50, 75, 100]
  }
};

// Export singleton instance
export const migrationNotificationService = new MigrationNotificationService(defaultNotificationConfig);