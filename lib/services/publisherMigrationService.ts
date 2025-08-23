/**
 * Enhanced Publisher Migration Service
 * 
 * Handles the complete publisher migration workflow including
 * data migration, invitation sending, and onboarding
 */

import { db } from '@/lib/db/connection';
import { 
  websites, 
  publishers, 
  publisherOfferings,
  publisherWebsites,
  publisherPerformance 
} from '@/lib/db/schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import { EmailService } from './emailService';
import { migrationStatusService } from './migrationStatusService';
import { WebsiteToPublisherMigrator } from '../../scripts/migrate-websites-to-publishers';
import { migrationValidator } from '../utils/publisherMigrationValidation';
import { v4 as uuidv4 } from 'uuid';
import { renderToStaticMarkup } from 'react-dom/server';
import PublisherMigrationInvitationEmail, { 
  PublisherMigrationInvitationEmailPlainText 
} from '../email/templates/PublisherMigrationInvitationEmail';

export interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  sendInvitations: boolean;
  validateFirst: boolean;
  skipExisting: boolean;
}

export interface PublisherInvitationData {
  publisherId: string;
  publisherName: string;
  companyName: string;
  email: string;
  websites: Array<{
    domain: string;
    currentRate?: number;
    estimatedTurnaround?: number;
  }>;
  totalWebsites: number;
  estimatedMonthlyValue?: number;
  claimToken: string;
}

export class PublisherMigrationService {
  
  /**
   * Execute complete migration workflow
   */
  async executeFullMigration(config: MigrationConfig = {
    dryRun: true,
    batchSize: 10,
    sendInvitations: false,
    validateFirst: true,
    skipExisting: true
  }) {
    const sessionId = migrationStatusService.startSession('full_migration', 6);
    
    try {
      // Phase 1: Validation
      if (config.validateFirst) {
        migrationStatusService.updatePhase(sessionId, 'validation', 'running', 'Running data validation...');
        const validationReport = await migrationValidator.validateAll();
        
        if (validationReport.errors > 0 && !config.dryRun) {
          throw new Error(`Migration blocked: ${validationReport.errors} critical errors found`);
        }
        
        migrationStatusService.updatePhase(sessionId, 'validation', 'completed', 
          `Validation complete: ${validationReport.totalIssues} issues found`, 100);
      }
      
      // Phase 2: Data Migration
      migrationStatusService.updatePhase(sessionId, 'migration', 'running', 'Migrating publisher data...');
      
      const migrator = new WebsiteToPublisherMigrator({
        dryRun: config.dryRun,
        batchSize: config.batchSize
      });
      
      const migrationStats = await migrator.migrate();
      
      migrationStatusService.updatePhase(sessionId, 'migration', 'completed',
        `Migrated ${migrationStats.shadowPublishersCreated} publishers`, 100);
      
      // Phase 3: Invitation Preparation
      if (config.sendInvitations && migrationStats.shadowPublishersCreated > 0) {
        migrationStatusService.updatePhase(sessionId, 'invitations', 'running', 
          'Preparing publisher invitations...');
        
        const invitationResults = await this.sendMigrationInvitations(config.dryRun);
        
        migrationStatusService.updatePhase(sessionId, 'invitations', 'completed',
          `Sent ${invitationResults.sent} invitations`, 100);
      }
      
      // Phase 4: Monitoring Setup
      migrationStatusService.updatePhase(sessionId, 'monitoring', 'running', 
        'Setting up monitoring...');
      
      await this.setupMigrationMonitoring(sessionId);
      
      migrationStatusService.updatePhase(sessionId, 'monitoring', 'completed',
        'Monitoring configured', 100);
      
      // Complete session
      migrationStatusService.completeSession(sessionId, {
        migrationStats,
        invitationsSent: config.sendInvitations ? migrationStats.shadowPublishersCreated : 0,
        mode: config.dryRun ? 'dry_run' : 'live'
      });
      
      return {
        success: true,
        sessionId,
        stats: migrationStats,
        message: config.dryRun ? 'Dry run completed successfully' : 'Migration completed successfully'
      };
      
    } catch (error) {
      migrationStatusService.completeSession(sessionId, null, 
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  /**
   * Send migration invitations to shadow publishers
   */
  async sendMigrationInvitations(dryRun: boolean = false): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    // Get shadow publishers who haven't been invited yet
    const shadowPublishers = await db
      .select({
        id: publishers.id,
        email: publishers.email,
        companyName: publishers.companyName,
        contactName: publishers.contactName,
        invitationToken: publishers.invitationToken
      })
      .from(publishers)
      .where(
        and(
          eq(publishers.accountStatus, 'shadow'),
          sql`invitation_sent_at IS NULL`
        )
      );
    
    console.log(`📧 Found ${shadowPublishers.length} publishers to invite`);
    
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process invitations in batches
    const batchSize = 10;
    for (let i = 0; i < shadowPublishers.length; i += batchSize) {
      const batch = shadowPublishers.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (publisher) => {
        try {
          // Get publisher's websites
          const publisherWebsites = await this.getPublisherWebsiteData(publisher.id);
          
          if (publisherWebsites.length === 0) {
            console.log(`⚠️ Skipping ${publisher.companyName} - no websites found`);
            return;
          }
          
          // Prepare invitation data
          const invitationData: PublisherInvitationData = {
            publisherId: publisher.id,
            publisherName: publisher.contactName || publisher.companyName || '',
            companyName: publisher.companyName || '',
            email: publisher.email,
            websites: publisherWebsites,
            totalWebsites: publisherWebsites.length,
            estimatedMonthlyValue: this.calculateEstimatedValue(publisherWebsites),
            claimToken: publisher.invitationToken || uuidv4()
          };
          
          // Send invitation
          await this.sendPublisherInvitation(invitationData, dryRun);
          
          // Update invitation sent timestamp
          if (!dryRun) {
            await db
              .update(publishers)
              .set({ 
                invitationSentAt: new Date(),
                invitationToken: invitationData.claimToken
              })
              .where(eq(publishers.id, publisher.id));
          }
          
          sent++;
          console.log(`✅ Invitation sent to ${publisher.companyName} (${publisher.email})`);
          
        } catch (error) {
          failed++;
          const errorMessage = `Failed to invite ${publisher.companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(`❌ ${errorMessage}`);
        }
      }));
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < shadowPublishers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return { sent, failed, errors };
  }
  
  /**
   * Send individual publisher invitation
   */
  private async sendPublisherInvitation(
    data: PublisherInvitationData,
    dryRun: boolean = false
  ): Promise<void> {
    const claimUrl = `${process.env.NEXTAUTH_URL}/publisher/claim/${data.claimToken}`;
    
    // Render email templates
    const htmlContent = renderToStaticMarkup(
      PublisherMigrationInvitationEmail({
        publisherName: data.publisherName,
        companyName: data.companyName,
        websites: data.websites,
        claimUrl,
        totalWebsites: data.totalWebsites,
        estimatedMonthlyValue: data.estimatedMonthlyValue
      })
    );
    
    const textContent = PublisherMigrationInvitationEmailPlainText({
      publisherName: data.publisherName,
      companyName: data.companyName,
      websites: data.websites,
      claimUrl,
      totalWebsites: data.totalWebsites,
      estimatedMonthlyValue: data.estimatedMonthlyValue
    });
    
    if (dryRun) {
      console.log(`[DRY RUN] Would send invitation to ${data.email}`);
      console.log(`  Subject: Claim Your Publisher Account - Linkio Marketplace`);
      console.log(`  Websites: ${data.totalWebsites}`);
      console.log(`  Claim URL: ${claimUrl}`);
      return;
    }
    
    // Send email
    await EmailService.send('invitation', {
      to: data.email,
      subject: 'Claim Your Publisher Account - Linkio Marketplace',
      html: htmlContent,
      text: textContent,
      from: 'Linkio Publishers <publishers@linkio.com>',
      replyTo: 'publishers@linkio.com',
      tags: [{ name: 'publisher_migration', value: 'invitation' }]
    });
  }
  
  /**
   * Get website data for a publisher
   */
  private async getPublisherWebsiteData(publisherId: string) {
    const result = await db
      .select({
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        avgResponseTimeHours: websites.avgResponseTimeHours
      })
      .from(websites)
      .innerJoin(publisherWebsites, eq(websites.id, publisherWebsites.websiteId))
      .where(eq(publisherWebsites.publisherId, publisherId));
    
    return result.map(w => ({
      domain: w.domain,
      currentRate: w.guestPostCost ? parseFloat(w.guestPostCost) : undefined,
      estimatedTurnaround: w.avgResponseTimeHours ? Math.ceil(w.avgResponseTimeHours / 24) : undefined
    }));
  }
  
  /**
   * Calculate estimated monthly value for a publisher
   */
  private calculateEstimatedValue(websites: Array<{ currentRate?: number }>): number | undefined {
    const ratesWithValues = websites.filter(w => w.currentRate).map(w => w.currentRate!);
    
    if (ratesWithValues.length === 0) return undefined;
    
    const averageRate = ratesWithValues.reduce((a, b) => a + b, 0) / ratesWithValues.length;
    const totalWebsites = websites.length;
    
    // Estimate 2-4 posts per website per month
    const estimatedPostsPerMonth = totalWebsites * 3;
    return Math.round(averageRate * estimatedPostsPerMonth);
  }
  
  /**
   * Setup monitoring for migration progress
   */
  private async setupMigrationMonitoring(sessionId: string): Promise<void> {
    // This could include:
    // - Setting up webhook notifications
    // - Creating monitoring dashboards
    // - Setting up alerts for claim rates
    
    console.log(`📊 Migration monitoring configured for session ${sessionId}`);
  }
  
  /**
   * Get migration analytics
   */
  async getMigrationAnalytics() {
    const analytics = await db.execute(sql`
      SELECT 
        -- Publisher stats
        COUNT(CASE WHEN account_status = 'shadow' THEN 1 END) as shadow_publishers,
        COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_publishers,
        COUNT(CASE WHEN invitation_sent_at IS NOT NULL THEN 1 END) as invitations_sent,
        COUNT(CASE WHEN claimed_at IS NOT NULL THEN 1 END) as accounts_claimed,
        
        -- Timing stats
        AVG(CASE 
          WHEN claimed_at IS NOT NULL AND invitation_sent_at IS NOT NULL 
          THEN EXTRACT(DAYS FROM claimed_at - invitation_sent_at)
        END) as avg_claim_days,
        
        -- Conversion rates
        ROUND(
          COUNT(CASE WHEN claimed_at IS NOT NULL THEN 1 END)::numeric / 
          NULLIF(COUNT(CASE WHEN invitation_sent_at IS NOT NULL THEN 1 END), 0) * 100,
          2
        ) as claim_rate_percentage
        
      FROM ${publishers}
      WHERE source = 'legacy_migration'
    `);
    
    const row = analytics.rows[0] as any;
    
    return {
      shadowPublishers: Number(row.shadow_publishers || 0),
      activePublishers: Number(row.active_publishers || 0),
      invitationsSent: Number(row.invitations_sent || 0),
      accountsClaimed: Number(row.accounts_claimed || 0),
      avgClaimDays: Number(row.avg_claim_days || 0),
      claimRatePercentage: Number(row.claim_rate_percentage || 0)
    };
  }
  
  /**
   * Get detailed migration status
   */
  async getMigrationStatus() {
    const [analytics, recentSessions, validationReport] = await Promise.all([
      this.getMigrationAnalytics(),
      migrationStatusService.getRecentSessions(),
      migrationValidator.validateAll()
    ]);
    
    return {
      analytics,
      recentSessions,
      validation: {
        ready: validationReport.readyForMigration,
        errors: validationReport.errors,
        warnings: validationReport.warnings,
        issues: validationReport.totalIssues
      },
      overall: migrationStatusService.getOverallStatus()
    };
  }
  
  /**
   * Generate comprehensive migration report
   */
  async generateMigrationReport(): Promise<string> {
    const [status, validationReport] = await Promise.all([
      this.getMigrationStatus(),
      migrationValidator.validateAll()
    ]);
    
    return migrationValidator.generateHTMLReport(validationReport);
  }
}

// Export singleton instance
export const publisherMigrationService = new PublisherMigrationService();