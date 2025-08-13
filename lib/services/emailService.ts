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
  FROM_EMAIL: process.env.EMAIL_FROM || 'info@linkio.com',
  FROM_NAME: process.env.EMAIL_FROM_NAME || 'Linkio',
  REPLY_TO: process.env.EMAIL_REPLY_TO || 'info@linkio.com',
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
  | 'notification'
  | 'account_welcome'
  | 'account_invitation'
  | 'order_review'
  | 'order_approved'
  | 'order_paid';

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
        from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
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

  /**
   * Send payment failed email with retry link
   */
  static async sendPaymentFailedEmail(options: {
    to: string;
    orderId: string;
    errorMessage: string;
    retryUrl: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Payment Failed</h2>
        <p>We were unable to process your payment for Order #${options.orderId.substring(0, 8)}.</p>
        
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f57c00;">
          <h3 style="margin-top: 0; color: #e65100;">Error Details:</h3>
          <p style="margin: 10px 0;">${options.errorMessage}</p>
        </div>
        
        <div style="margin: 30px 0;">
          <p><strong>What to do next:</strong></p>
          <ul>
            <li>Check that your card details are correct</li>
            <li>Ensure you have sufficient funds available</li>
            <li>Contact your bank if the issue persists</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${options.retryUrl}" style="display: inline-block; padding: 12px 30px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Try Payment Again
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          If you continue to experience issues, please contact our support team at info@linkio.com
        </p>
      </div>
    `;

    const text = `
Payment Failed - Order #${options.orderId.substring(0, 8)}

We were unable to process your payment.

Error: ${options.errorMessage}

Please try again at: ${options.retryUrl}

If you continue to experience issues, contact info@linkio.com
    `;

    return await this.send('notification', {
      to: options.to,
      subject: `Payment Failed - Order #${options.orderId.substring(0, 8)}`,
      text,
      html,
    });
  }

  /**
   * Send payment success confirmation email
   */
  static async sendPaymentSuccessEmail(options: {
    to: string;
    orderId: string;
    amount: number;
    paymentIntentId: string;
    orderViewUrl: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const formattedAmount = (options.amount / 100).toFixed(2);
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">Payment Successful!</h2>
        <p>Thank you! We've successfully received your payment for Order #${options.orderId.substring(0, 8)}.</p>
        
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
          <h3 style="margin-top: 0; color: #2e7d32;">Payment Details:</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
              <td style="padding: 8px 0; font-family: monospace;">${options.orderId.substring(0, 8)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Amount Paid:</strong></td>
              <td style="padding: 8px 0; color: #2e7d32; font-weight: bold;">$${formattedAmount} USD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Transaction ID:</strong></td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${options.paymentIntentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Date:</strong></td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin: 30px 0;">
          <h3>What happens next?</h3>
          <ol style="line-height: 2;">
            <li>Our team will begin processing your order immediately</li>
            <li>You'll receive regular updates on your order progress</li>
            <li>Estimated delivery time will be provided within 24 hours</li>
            <li>You can track your order status anytime from your dashboard</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${options.orderViewUrl}" style="display: inline-block; padding: 12px 30px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Order Details
          </a>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 30px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Need help?</strong><br>
            Contact our support team at info@linkio.com<br>
            or reply to this email with any questions.
          </p>
        </div>
      </div>
    `;

    const text = `
Payment Successful - Order #${options.orderId.substring(0, 8)}

Thank you! We've successfully received your payment.

Payment Details:
- Order ID: ${options.orderId.substring(0, 8)}
- Amount Paid: $${formattedAmount} USD
- Transaction ID: ${options.paymentIntentId}
- Date: ${new Date().toLocaleString()}

What happens next:
1. Our team will begin processing your order immediately
2. You'll receive regular updates on your order progress
3. Estimated delivery time will be provided within 24 hours
4. You can track your order status at: ${options.orderViewUrl}

Need help? Contact info@linkio.com
    `;

    return await this.send('notification', {
      to: options.to,
      subject: `Payment Confirmed - Order #${options.orderId.substring(0, 8)}`,
      text,
      html,
    });
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmation(email: string, data: {
    orderNumber: string;
    amount: string;
    paymentMethod: string;
    transactionId?: string;
    invoiceNumber?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Payment Confirmation</h2>
        <p>This email confirms that we have received your payment for order #${data.orderNumber}.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details:</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0;"><strong>Amount:</strong></td>
              <td style="padding: 5px 0;">$${data.amount}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Payment Method:</strong></td>
              <td style="padding: 5px 0;">${data.paymentMethod}</td>
            </tr>
            ${data.transactionId ? `
            <tr>
              <td style="padding: 5px 0;"><strong>Transaction ID:</strong></td>
              <td style="padding: 5px 0;">${data.transactionId}</td>
            </tr>
            ` : ''}
            ${data.invoiceNumber ? `
            <tr>
              <td style="padding: 5px 0;"><strong>Invoice Number:</strong></td>
              <td style="padding: 5px 0;">${data.invoiceNumber}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p>Our team will now begin processing your order. You can track the progress in your account dashboard.</p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>The Linkio Team</p>
      </div>
    `;

    return this.send('order_paid', {
      to: email,
      subject: `Payment Confirmed - Order #${data.orderNumber}`,
      html,
      text: `Payment confirmed for order #${data.orderNumber}. Amount: $${data.amount}`,
    });
  }

  /**
   * Send refund confirmation email
   */
  static async sendRefundConfirmationEmail(options: {
    to: string;
    orderId: string;
    refundAmount: number;
    isFullRefund: boolean;
    orderViewUrl: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const formattedAmount = (options.refundAmount / 100).toFixed(2);
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">Refund Processed</h2>
        <p>We've successfully processed your refund for Order #${options.orderId.substring(0, 8)}.</p>
        
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="margin-top: 0; color: #e65100;">Refund Details:</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
              <td style="padding: 8px 0; font-family: monospace;">${options.orderId.substring(0, 8)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Refund Amount:</strong></td>
              <td style="padding: 8px 0; color: #e65100; font-weight: bold;">$${formattedAmount} USD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Refund Type:</strong></td>
              <td style="padding: 8px 0;">${options.isFullRefund ? 'Full Refund' : 'Partial Refund'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Date Processed:</strong></td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin: 30px 0;">
          <h3>What happens next?</h3>
          <ul style="line-height: 2;">
            <li>The refund will appear in your account within 5-10 business days</li>
            <li>You'll receive a confirmation from your payment provider</li>
            ${!options.isFullRefund ? '<li>Any remaining balance on this order is still being processed</li>' : ''}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${options.orderViewUrl}" 
             style="background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Order Details
          </a>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 30px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            If you have any questions about this refund, please contact our support team.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
          <p>Thank you for your business. We apologize for any inconvenience.</p>
          <p>© ${new Date().getFullYear()} Linkio. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.send('notification', {
      to: options.to,
      subject: `Refund Processed - Order #${options.orderId.substring(0, 8)}`,
      html,
      text: `Your refund of $${formattedAmount} has been processed for Order #${options.orderId.substring(0, 8)}. The refund will appear in your account within 5-10 business days.`,
    });
  }

  /**
   * Send account welcome email
   */
  static async sendAccountWelcome(data: {
    email: string;
    name: string;
    company?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #2563EB, #1D4ED8); color: white; padding: 40px 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to Linkio!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your guest posting journey starts here</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151;">Hi ${data.name},</p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Welcome aboard! Your Linkio account has been successfully created. 
            ${data.company ? `We're excited to help ${data.company} grow its online presence through high-quality guest posting.` : 'We\'re excited to help you grow your online presence through high-quality guest posting.'}
          </p>
          
          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1F2937;">🚀 Getting Started Checklist</h2>
            <ul style="margin: 0; padding-left: 20px; color: #4B5563;">
              <li style="margin-bottom: 10px;">✅ Complete your profile information</li>
              <li style="margin-bottom: 10px;">✅ Add your website and target pages</li>
              <li style="margin-bottom: 10px;">✅ Create your first guest post order</li>
              <li style="margin-bottom: 10px;">✅ Explore our publisher network</li>
              <li style="margin-bottom: 10px;">✅ Review content guidelines</li>
              <li style="margin-bottom: 10px;">✅ Set up your preferences</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/account/dashboard" 
               style="background-color: #2563EB; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Go to Your Dashboard →
            </a>
          </div>
          
          <div style="border-top: 1px solid #E5E7EB; margin-top: 30px; padding-top: 20px;">
            <h3 style="font-size: 16px; color: #1F2937; margin-bottom: 10px;">Need Help?</h3>
            <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">
              Our team is here to support you. Visit our 
              <a href="${process.env.NEXTAUTH_URL}/help" style="color: #2563EB;">Help Center</a> 
              or reply to this email if you have any questions.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Linkio. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">
            <a href="${process.env.NEXTAUTH_URL}/terms" style="color: #9CA3AF; text-decoration: none;">Terms</a> · 
            <a href="${process.env.NEXTAUTH_URL}/privacy" style="color: #9CA3AF; text-decoration: none;">Privacy</a>
          </p>
        </div>
      </div>
    `;

    return this.send('account_welcome', {
      to: data.email,
      subject: 'Welcome to Linkio - Your Account is Ready',
      html,
      text: `Welcome to Linkio, ${data.name}! Your account has been created successfully. Visit ${process.env.NEXTAUTH_URL}/account/dashboard to get started.`,
    });
  }

  /**
   * Send account welcome email with onboarding steps
   */
  static async sendAccountWelcomeWithOnboarding(data: {
    email: string;
    name: string;
    company?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #2563EB, #1D4ED8); color: white; padding: 40px 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to Linkio!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your guest posting journey starts here</p>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
            Hi ${data.name},
          </p>
          
          <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">
            Welcome to Linkio! Your account has been created successfully${data.company ? ` for ${data.company}` : ''}.
          </p>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 0 0 30px 0;">
            <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1F2937;">Get Started with Your Dashboard</h2>
            <p style="margin: 0 0 20px 0; color: #4B5563;">Complete these steps to make the most of Linkio:</p>
            
            <div style="margin: 0 0 15px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="width: 24px; height: 24px; background: #E5E7EB; border-radius: 50%; margin-right: 10px;"></div>
                <span style="color: #374151; font-weight: 600;">Complete Your Profile</span>
              </div>
              <p style="margin: 0 0 0 34px; color: #6B7280; font-size: 14px;">Add your company details and contact information</p>
            </div>
            
            <div style="margin: 0 0 15px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="width: 24px; height: 24px; background: #E5E7EB; border-radius: 50%; margin-right: 10px;"></div>
                <span style="color: #374151; font-weight: 600;">Set Up Your First Brand</span>
              </div>
              <p style="margin: 0 0 0 34px; color: #6B7280; font-size: 14px;">Add your website and target pages for link building</p>
            </div>
            
            <div style="margin: 0 0 15px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="width: 24px; height: 24px; background: #E5E7EB; border-radius: 50%; margin-right: 10px;"></div>
                <span style="color: #374151; font-weight: 600;">Create Your First Order</span>
              </div>
              <p style="margin: 0 0 0 34px; color: #6B7280; font-size: 14px;">Start your first guest posting campaign</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/account/dashboard" 
               style="display: inline-block; background: #2563EB; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 30px 0 0 0;">
            <p style="margin: 0; color: #6B7280; font-size: 14px;">
              <strong>Need help?</strong> Our team is here to assist you. Reply to this email 
              or visit our <a href="${process.env.NEXTAUTH_URL}/help" style="color: #2563EB; text-decoration: none;">help center</a>.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Linkio. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">
            <a href="${process.env.NEXTAUTH_URL}/terms" style="color: #9CA3AF; text-decoration: none;">Terms</a> · 
            <a href="${process.env.NEXTAUTH_URL}/privacy" style="color: #9CA3AF; text-decoration: none;">Privacy</a>
          </p>
        </div>
      </div>
    `;

    return this.send('account_welcome', {
      to: data.email,
      subject: 'Welcome to Linkio - Get Started Today',
      html,
      text: `Welcome to Linkio, ${data.name}! Your account has been created successfully. Visit ${process.env.NEXTAUTH_URL}/account/dashboard to get started with your onboarding checklist.`,
    });
  }

  /**
   * Send account invitation email
   */
  static async sendAccountInvitation(email: string, data: {
    inviteUrl: string;
    expiresIn: string;
    companyName?: string;
    contactName?: string;
    invitedBy: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>You're Invited to Join Linkio</h2>
        <p>Hi${data.contactName ? ` ${data.contactName}` : ''},</p>
        
        <p>${data.invitedBy} has invited you to create an account${data.companyName ? ` for ${data.companyName}` : ''} on Linkio, our guest post management platform.</p>
        
        <p>With your Linkio account, you'll be able to:</p>
        <ul>
          <li>Review and approve guest post orders</li>
          <li>Track the progress of your content campaigns</li>
          <li>Access published URLs and detailed reports</li>
          <li>Communicate directly with our team</li>
        </ul>
        
        <div style="margin: 30px 0;">
          <a href="${data.inviteUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This invitation will expire in ${data.expiresIn}. If you need a new invitation, please contact ${data.invitedBy}.</p>
        
        <p>If you have any questions, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>The Linkio Team</p>
      </div>
    `;

    return this.send('account_invitation', {
      to: email,
      subject: `You're invited to join Linkio${data.companyName ? ` - ${data.companyName}` : ''}`,
      html,
      text: `You've been invited to create an account on Linkio. Visit ${data.inviteUrl} to accept the invitation.`,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(data: {
    to: string;
    contactName: string;
    resetUrl: string;
    expiresIn: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Hi ${data.contactName},</p>
        
        <p>We received a request to reset your password for your Linkio account. If you didn't make this request, you can safely ignore this email.</p>
        
        <p>To reset your password, click the button below:</p>
        
        <div style="margin: 30px 0;">
          <a href="${data.resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This link will expire in ${data.expiresIn}. If the link has expired, you can request a new password reset from your administrator.</p>
        
        <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${data.resetUrl}</p>
        
        <p>Best regards,<br>The Linkio Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;

    return this.send('password-reset', {
      to: data.to,
      subject: 'Reset Your Linkio Password',
      html,
      text: `Hi ${data.contactName}, We received a request to reset your password. Visit ${data.resetUrl} to reset your password. This link will expire in ${data.expiresIn}.`,
    });
  }

  /**
   * Send order ready for review email
   */
  static async sendOrderReadyForReview(data: {
    email: string;
    name: string;
    orderId: string;
    shareToken: string;
    itemCount: number;
    totalAmount: number;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const previewUrl = `${process.env.NEXTAUTH_URL}/orders/share/${data.shareToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Your Guest Post Order is Ready for Review</h2>
        <p>Hi ${data.name},</p>
        
        <p>Your guest post order (${data.itemCount} placement${data.itemCount > 1 ? 's' : ''}) totaling $${(data.totalAmount / 100).toFixed(2)} is ready for your review and approval.</p>
        
        <div style="margin: 30px 0;">
          <a href="${previewUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review and Approve Order</a>
        </div>
        
        <p>This link will expire in 7 days. If you need a new link, please contact your account manager.</p>
        
        <p>If you have any questions about this order, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>The Linkio Team</p>
      </div>
    `;

    return this.send('order_review', {
      to: data.email,
      subject: `Guest Post Order Ready for Review - ${data.itemCount} Placement${data.itemCount > 1 ? 's' : ''}`,
      html,
      text: `Your guest post order is ready for review. Visit ${previewUrl} to review and approve.`,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();