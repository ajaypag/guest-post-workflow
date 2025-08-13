import { EmailService } from '@/lib/services/emailService';
import { format } from 'date-fns';

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  user: { id: string; name: string; email: string }
) {
  return EmailService.send('welcome', {
    to: user.email,
    subject: 'Welcome to Linkio',
    react: (await import('@/lib/email/templates/WelcomeEmail')).WelcomeEmail({
      userName: user.name,
      userEmail: user.email,
    }),
    tags: [
      { name: 'type', value: 'welcome' },
      { name: 'userId', value: user.id },
    ],
  });
}

/**
 * Send workflow completed notification
 */
export async function sendWorkflowCompletedEmail(
  workflow: {
    id: string;
    name: string;
    clientName: string;
    completedSteps: number;
    totalSteps: number;
    completedAt: Date;
  },
  recipient: { name: string; email: string }
) {
  const viewUrl = `${process.env.NEXTAUTH_URL}/workflows/${workflow.id}`;
  
  return EmailService.send('workflow-completed', {
    to: recipient.email,
    subject: `Workflow "${workflow.name}" Completed`,
    react: (await import('@/lib/email/templates/WorkflowCompletedEmail')).WorkflowCompletedEmail({
      userName: recipient.name,
      workflowName: workflow.name,
      clientName: workflow.clientName,
      completedSteps: workflow.completedSteps,
      totalSteps: workflow.totalSteps,
      completedAt: format(workflow.completedAt, 'PPpp'),
      viewUrl,
    }),
    tags: [
      { name: 'type', value: 'workflow-completed' },
      { name: 'workflowId', value: workflow.id },
    ],
  });
}

/**
 * Send bulk outreach emails with rate limiting
 */
export async function sendBulkOutreachEmails(
  contacts: Array<{
    email: string;
    name: string;
    websiteDomain: string;
    websiteMetrics: {
      domainRating: number;
      monthlyTraffic: number;
      categories: string[];
    };
  }>,
  campaign: {
    type: 'guest-post' | 'link-insert' | 'partnership';
    message: string;
    subject?: string;
    senderName: string;
    senderEmail: string;
    replyToEmail?: string;
  }
) {
  const recipients = contacts.map(contact => ({
    to: contact.email,
    data: {
      contactName: contact.name,
      websiteDomain: contact.websiteDomain,
      websiteMetrics: contact.websiteMetrics,
      outreachType: campaign.type,
      message: campaign.message,
      subject: campaign.subject,
      senderName: campaign.senderName,
      senderEmail: campaign.senderEmail,
      replyToEmail: campaign.replyToEmail,
    },
  }));

  return EmailService.sendBulk(
    'contact-outreach',
    recipients,
    (data) => ({
      subject: data.subject || `${campaign.type === 'guest-post' ? 'Guest Post' : 'Collaboration'} Opportunity for ${data.websiteDomain}`,
      template: (require('@/lib/email/templates/ContactOutreachEmail')).ContactOutreachEmail(data),
    })
  );
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email content to prevent injection
 */
export function sanitizeEmailContent(content: string): string {
  // Remove any potential script tags or HTML that could be malicious
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Format email recipient list
 */
export function formatRecipients(recipients: string | string[]): string[] {
  if (Array.isArray(recipients)) {
    return recipients.filter(isValidEmail);
  }
  return recipients.split(',').map(r => r.trim()).filter(isValidEmail);
}

/**
 * Get email preview text (first 150 characters)
 */
export function getEmailPreview(content: string): string {
  const stripped = content.replace(/<[^>]*>/g, ''); // Strip HTML
  return stripped.length > 150 ? stripped.substring(0, 147) + '...' : stripped;
}

/**
 * Check if email sending is configured
 */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.EMAIL_FROM &&
    process.env.NEXTAUTH_URL
  );
}

/**
 * Get email configuration status
 */
export function getEmailConfigStatus(): {
  configured: boolean;
  missing: string[];
} {
  const required = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Create unsubscribe link
 */
export function createUnsubscribeLink(
  recipientEmail: string,
  campaignId?: string
): string {
  const params = new URLSearchParams({
    email: recipientEmail,
    ...(campaignId && { campaign: campaignId }),
  });
  
  return `${process.env.NEXTAUTH_URL}/unsubscribe?${params.toString()}`;
}

/**
 * Batch emails for efficient sending
 */
export function batchEmails<T>(
  items: T[],
  batchSize: number = 10
): T[][] {
  const batches: T[][] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  return batches;
}