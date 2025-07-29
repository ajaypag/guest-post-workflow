import { Resend } from 'resend';
import { db } from '@/lib/db/connection';
import { Pool } from 'pg';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

// Lazy-load Resend client to avoid build-time initialization
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Email configuration
export const EMAIL_CONFIG = {
  FROM_EMAIL: process.env.EMAIL_FROM || 'onboarding@resend.dev', // Use Resend's test email if not configured
  FROM_NAME: process.env.EMAIL_FROM_NAME || 'PostFlow',
  REPLY_TO: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || 'onboarding@resend.dev',
};

// Email types
export type EmailType = 
  | 'welcome'
  | 'password-reset'
  | 'workflow-completed'
  | 'workflow-update'
  | 'contact-outreach'
  | 'guest-post-request'
  | 'invitation'
  | 'notification';

// Email send options
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
}

// Email log entry
export interface EmailLog {
  id: string;
  type: EmailType;
  to: string[];
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  sentAt?: Date;
  error?: string;
  resendId?: string;
  metadata?: Record<string, any>;
}

export class EmailService {
  /**
   * Send an email using Resend
   */
  static async send(
    type: EmailType,
    options: EmailOptions
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    console.log('[EmailService] send() called with type:', type);
    
    try {
      // Validate API key
      if (!process.env.RESEND_API_KEY) {
        console.error('[EmailService] RESEND_API_KEY not found in environment');
        throw new Error('Resend API key not configured');
      }
      
      console.log('[EmailService] API key found, preparing email...');

      // Prepare email data
      const emailData = {
        from: options.from || `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        react: options.react,
        reply_to: options.replyTo || EMAIL_CONFIG.REPLY_TO,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        tags: options.tags || [],
      };

      console.log('[EmailService] Sending email with data:', {
        to: emailData.to,
        subject: emailData.subject,
        from: emailData.from
      });
      
      // Send email
      const { data, error } = await getResendClient().emails.send(emailData);

      if (error) {
        console.error('[EmailService] Resend API error:', error);
        // Log error
        await this.logEmail(type, options, 'failed', undefined, error.message);
        return { success: false, error: error.message };
      }

      // Log success
      await this.logEmail(type, options, 'sent', data?.id);

      return { success: true, id: data?.id };
    } catch (error: any) {
      console.error('Email send error:', error);
      
      // Log error
      await this.logEmail(type, options, 'failed', undefined, error.message);
      
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      };
    }
  }

  /**
   * Send email with template
   */
  static async sendWithTemplate(
    type: EmailType,
    to: string | string[],
    templateData: {
      subject: string;
      template: React.ReactElement;
      [key: string]: any;
    }
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    return this.send(type, {
      to,
      subject: templateData.subject,
      react: templateData.template,
      tags: [{ name: 'type', value: type }],
    });
  }

  /**
   * Send bulk emails (batch processing)
   */
  static async sendBulk(
    type: EmailType,
    recipients: Array<{
      to: string;
      data: Record<string, any>;
    }>,
    templateFn: (data: Record<string, any>) => {
      subject: string;
      template: React.ReactElement;
    }
  ): Promise<{
    sent: number;
    failed: number;
    results: Array<{ to: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ to: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;
    const DELAY_MS = 1000; // 1 second between batches

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const { subject, template } = templateFn(recipient.data);
          const result = await this.sendWithTemplate(type, recipient.to, {
            subject,
            template,
          });

          if (result.success) {
            sent++;
          } else {
            failed++;
          }

          return {
            to: recipient.to,
            success: result.success,
            error: result.error,
          };
        })
      );

      results.push(...batchResults);

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    return { sent, failed, results };
  }

  /**
   * Log email activity
   */
  private static async logEmail(
    type: EmailType,
    options: EmailOptions,
    status: 'sent' | 'failed' | 'queued',
    resendId?: string,
    error?: string
  ): Promise<void> {
    try {
      const to = Array.isArray(options.to) ? options.to : [options.to];
      
      await pool.query(`
        INSERT INTO email_logs (
          type, recipients, subject, status, 
          sent_at, error, resend_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        type,
        to,
        options.subject,
        status,
        status === 'sent' ? new Date() : null,
        error,
        resendId,
        {
          from: options.from,
          cc: options.cc,
          bcc: options.bcc,
          hasAttachments: !!options.attachments?.length,
        }
      ]);
    } catch (err) {
      console.error('Failed to log email:', err);
      // Don't throw - logging failure shouldn't prevent email sending
    }
  }

  /**
   * Get email logs
   */
  static async getEmailLogs(
    filters: {
      type?: EmailType;
      status?: 'sent' | 'failed' | 'queued';
      startDate?: Date;
      endDate?: Date;
      recipient?: string;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ logs: EmailLog[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(filters.type);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    if (filters.recipient) {
      conditions.push(`$${paramIndex++} = ANY(recipients)`);
      params.push(filters.recipient);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM email_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get logs
    params.push(limit, offset);
    const result = await pool.query(`
      SELECT 
        id, type, recipients as to, subject, 
        status, sent_at as "sentAt", error, 
        resend_id as "resendId", metadata
      FROM email_logs 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    return {
      logs: result.rows,
      total,
    };
  }

  /**
   * Retry failed emails
   */
  static async retryFailed(logId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get failed email log
      const result = await pool.query(`
        SELECT * FROM email_logs 
        WHERE id = $1 AND status = 'failed'
      `, [logId]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Email log not found or not failed' };
      }

      const log = result.rows[0];

      // Retry sending
      const sendResult = await this.send(log.type, {
        to: log.recipients,
        subject: log.subject,
        html: log.metadata?.html,
        text: log.metadata?.text,
      });

      // Update log status
      if (sendResult.success) {
        await pool.query(`
          UPDATE email_logs 
          SET status = 'sent', sent_at = NOW(), error = NULL, resend_id = $1
          WHERE id = $2
        `, [sendResult.id, logId]);
      }

      return sendResult;
    } catch (error: any) {
      console.error('Failed to retry email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get email statistics
   */
  static async getStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    byType: Record<EmailType, { sent: number; failed: number }>;
    dailyStats: Array<{ date: string; sent: number; failed: number }>;
  }> {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM email_logs
      WHERE created_at BETWEEN $1 AND $2
    `, [startDate, endDate]);

    const byTypeResult = await pool.query(`
      SELECT 
        type,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM email_logs
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY type
    `, [startDate, endDate]);

    const dailyResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM email_logs
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate, endDate]);

    const byType: Record<string, { sent: number; failed: number }> = {};
    byTypeResult.rows.forEach(row => {
      byType[row.type] = { sent: row.sent, failed: row.failed };
    });

    return {
      total: parseInt(statsResult.rows[0].total),
      sent: parseInt(statsResult.rows[0].sent),
      failed: parseInt(statsResult.rows[0].failed),
      byType: byType as Record<EmailType, { sent: number; failed: number }>,
      dailyStats: dailyResult.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        sent: parseInt(row.sent),
        failed: parseInt(row.failed),
      })),
    };
  }
}