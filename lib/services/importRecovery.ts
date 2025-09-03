import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export interface ImportState {
  campaignId: string;
  workspace: string;
  lastProcessedEmail?: string;
  processedCount: number;
  totalCount: number;
  failedEmails: string[];
  status: 'in_progress' | 'failed' | 'completed';
  error?: string;
  retryCount: number;
  lastRetryAt?: Date;
}

export class ImportRecoveryService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = [1000, 5000, 15000]; // Exponential backoff

  /**
   * Save import state for recovery
   */
  static async saveState(state: ImportState): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO manyreach_import_recovery (
          campaign_id, 
          workspace, 
          last_processed_email,
          processed_count,
          total_count,
          failed_emails,
          status,
          error,
          updated_at
        ) VALUES (
          ${state.campaignId},
          ${state.workspace},
          ${state.lastProcessedEmail || null},
          ${state.processedCount},
          ${state.totalCount},
          ${JSON.stringify(state.failedEmails)},
          ${state.status},
          ${state.error || null},
          NOW()
        )
        ON CONFLICT (campaign_id, workspace) 
        DO UPDATE SET
          last_processed_email = EXCLUDED.last_processed_email,
          processed_count = EXCLUDED.processed_count,
          total_count = EXCLUDED.total_count,
          failed_emails = EXCLUDED.failed_emails,
          status = EXCLUDED.status,
          error = EXCLUDED.error,
          updated_at = NOW()
      `);
    } catch (error) {
      console.error('Failed to save import state:', error);
      throw error;
    }
  }

  /**
   * Get import state for resuming
   */
  static async getState(campaignId: string, workspace: string): Promise<ImportState | null> {
    try {
      const result = await db.execute(sql`
        SELECT 
          campaign_id,
          workspace,
          last_processed_email,
          processed_count,
          total_count,
          failed_emails,
          status,
          error,
          created_at,
          updated_at
        FROM manyreach_import_recovery
        WHERE campaign_id = ${campaignId}
        AND workspace = ${workspace}
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        campaignId: row.campaign_id as string,
        workspace: row.workspace as string,
        lastProcessedEmail: row.last_processed_email as string | undefined,
        processedCount: Number(row.processed_count),
        totalCount: Number(row.total_count),
        failedEmails: JSON.parse(row.failed_emails as string || '[]'),
        status: row.status as 'in_progress' | 'failed' | 'completed',
        error: row.error as string | undefined,
        retryCount: 0,
        lastRetryAt: row.updated_at as Date | undefined
      };
    } catch (error) {
      console.error('Failed to get import state:', error);
      return null;
    }
  }

  /**
   * Clear completed or old import states
   */
  static async cleanup(daysOld: number = 7): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM manyreach_import_recovery
        WHERE (status = 'completed' OR updated_at < NOW() - INTERVAL '${daysOld} days')
      `);
    } catch (error) {
      console.error('Failed to cleanup import states:', error);
    }
  }

  /**
   * Mark import as completed
   */
  static async markCompleted(campaignId: string, workspace: string): Promise<void> {
    await db.execute(sql`
      UPDATE manyreach_import_recovery
      SET status = 'completed', updated_at = NOW()
      WHERE campaign_id = ${campaignId}
      AND workspace = ${workspace}
    `);
  }

  /**
   * Mark import as failed with error
   */
  static async markFailed(campaignId: string, workspace: string, error: string): Promise<void> {
    await db.execute(sql`
      UPDATE manyreach_import_recovery
      SET status = 'failed', error = ${error}, updated_at = NOW()
      WHERE campaign_id = ${campaignId}
      AND workspace = ${workspace}
    `);
  }

  /**
   * Retry failed import with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retryCount >= this.MAX_RETRIES) {
        throw error;
      }

      const delay = this.RETRY_DELAY_MS[retryCount] || 30000;
      console.log(`Retry attempt ${retryCount + 1}/${this.MAX_RETRIES} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(fn, retryCount + 1);
    }
  }

  /**
   * Process emails with recovery capability
   */
  static async processEmailsWithRecovery(
    campaignId: string,
    workspace: string,
    emails: any[],
    processEmail: (email: any) => Promise<void>
  ): Promise<{ processed: number; failed: string[] }> {
    // Check for existing state
    const existingState = await this.getState(campaignId, workspace);
    
    let startIndex = 0;
    let failedEmails: string[] = existingState?.failedEmails || [];
    
    if (existingState && existingState.status === 'in_progress') {
      // Resume from last processed email
      const lastIndex = emails.findIndex(e => e.id === existingState.lastProcessedEmail);
      if (lastIndex !== -1) {
        startIndex = lastIndex + 1;
        console.log(`Resuming from email ${startIndex + 1}/${emails.length}`);
      }
    }

    let processedCount = existingState?.processedCount || 0;

    for (let i = startIndex; i < emails.length; i++) {
      const email = emails[i];
      
      try {
        // Save progress before processing
        await this.saveState({
          campaignId,
          workspace,
          lastProcessedEmail: email.id,
          processedCount,
          totalCount: emails.length,
          failedEmails,
          status: 'in_progress',
          retryCount: 0
        });

        // Process email with retry
        await this.retryWithBackoff(() => processEmail(email));
        processedCount++;
        
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error);
        failedEmails.push(email.id);
        
        // Save failed state
        await this.saveState({
          campaignId,
          workspace,
          lastProcessedEmail: email.id,
          processedCount,
          totalCount: emails.length,
          failedEmails,
          status: 'in_progress',
          error: (error as Error).message,
          retryCount: 0
        });
      }
    }

    // Mark as completed or failed based on results
    if (failedEmails.length === 0) {
      await this.markCompleted(campaignId, workspace);
    } else if (failedEmails.length === emails.length) {
      await this.markFailed(campaignId, workspace, 'All emails failed to process');
    } else {
      await this.saveState({
        campaignId,
        workspace,
        processedCount,
        totalCount: emails.length,
        failedEmails,
        status: 'completed',
        retryCount: 0
      });
    }

    return { processed: processedCount, failed: failedEmails };
  }

  /**
   * Get all active imports for monitoring
   */
  static async getActiveImports(workspace?: string): Promise<ImportState[]> {
    try {
      let query = sql`
        SELECT 
          campaign_id,
          workspace,
          last_processed_email,
          processed_count,
          total_count,
          failed_emails,
          status,
          error,
          updated_at
        FROM manyreach_import_recovery
        WHERE status = 'in_progress'
      `;

      if (workspace) {
        query = sql`
          ${query}
          AND workspace = ${workspace}
        `;
      }

      const result = await db.execute(query);
      
      return result.rows.map(row => ({
        campaignId: row.campaign_id as string,
        workspace: row.workspace as string,
        lastProcessedEmail: row.last_processed_email as string | undefined,
        processedCount: Number(row.processed_count),
        totalCount: Number(row.total_count),
        failedEmails: JSON.parse(row.failed_emails as string || '[]'),
        status: row.status as 'in_progress',
        error: row.error as string | undefined,
        retryCount: 0,
        lastRetryAt: row.updated_at as Date | undefined
      }));
    } catch (error) {
      console.error('Failed to get active imports:', error);
      return [];
    }
  }
}