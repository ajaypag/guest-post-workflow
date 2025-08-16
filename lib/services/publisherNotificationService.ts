import { db } from '@/lib/db/connection';
import { publisherOrderNotifications } from '@/lib/db/publisherEarningsSchema';
import { publishers } from '@/lib/db/schema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orders } from '@/lib/db/orderSchema';
import { clients } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotificationData {
  orderLineItemId: string;
  publisherId: string;
  notificationType: 'assignment' | 'reminder' | 'deadline' | 'completion_request';
  metadata?: any;
}

export class PublisherNotificationService {
  /**
   * Send assignment notification to publisher
   */
  static async notifyPublisherAssignment(orderLineItemId: string, publisherId: string) {
    try {
      // Get all the data needed for the notification
      const orderData = await db
        .select({
          lineItem: orderLineItems,
          order: orders,
          client: clients,
          publisher: publishers
        })
        .from(orderLineItems)
        .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
        .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
        .leftJoin(publishers, eq(orderLineItems.publisherId, publishers.id))
        .where(eq(orderLineItems.id, orderLineItemId))
        .limit(1);

      if (!orderData[0]) {
        throw new Error('Order line item not found');
      }

      const { lineItem, order, client, publisher } = orderData[0];

      if (!publisher) {
        throw new Error('Publisher not found');
      }

      // Create notification record
      await db.insert(publisherOrderNotifications).values({
        publisherId,
        orderLineItemId,
        orderId: lineItem.orderId,
        notificationType: 'assignment',
        status: 'sent',
        sentAt: new Date(),
        metadata: {
          assignedDomain: lineItem.assignedDomain,
          targetPageUrl: lineItem.targetPageUrl,
          anchorText: lineItem.anchorText,
          publisherPrice: lineItem.publisherPrice,
          platformFee: lineItem.platformFee
        }
      });

      // Send email notification
      const emailResult = await this.sendAssignmentEmail({
        publisherEmail: publisher.email,
        publisherName: publisher.contactName || 'Publisher',
        orderNumber: order?.id.slice(-8) || 'Unknown',
        clientName: client?.name || 'Unknown Client',
        domain: lineItem.assignedDomain || 'Not specified',
        targetPageUrl: lineItem.targetPageUrl || '',
        anchorText: lineItem.anchorText || '',
        publisherPrice: lineItem.publisherPrice || 0,
        platformFee: lineItem.platformFee || 0,
        netEarnings: (lineItem.publisherPrice || 0) - (lineItem.platformFee || 0),
        lineItemId: orderLineItemId
      });

      console.log('✅ Publisher assignment notification sent:', {
        publisherId,
        orderLineItemId,
        emailId: emailResult?.id
      });

      return { success: true, emailId: emailResult?.id };

    } catch (error) {
      console.error('❌ Failed to send publisher assignment notification:', error);
      
      // Log failed notification
      try {
        await db.insert(publisherOrderNotifications).values({
          publisherId,
          orderLineItemId,
          orderId: '', // We might not have this if the query failed
          notificationType: 'assignment',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: { errorDetails: error }
        });
      } catch (logError) {
        console.error('Failed to log notification error:', logError);
      }

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send assignment email to publisher
   */
  private static async sendAssignmentEmail(data: {
    publisherEmail: string;
    publisherName: string;
    orderNumber: string;
    clientName: string;
    domain: string;
    targetPageUrl: string;
    anchorText: string;
    publisherPrice: number;
    platformFee: number;
    netEarnings: number;
    lineItemId: string;
  }) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const acceptUrl = `${baseUrl}/publisher/orders/${data.lineItemId}/accept`;
    const rejectUrl = `${baseUrl}/publisher/orders/${data.lineItemId}/reject`;
    const dashboardUrl = `${baseUrl}/publisher/orders`;

    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0;">New Order Assignment</h1>
          <p style="margin: 10px 0 0 0; color: #6b7280;">Order #${data.orderNumber}</p>
        </div>

        <p>Hi ${data.publisherName},</p>
        
        <p>You've been assigned a new content order! Here are the details:</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Order Details</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Client:</strong> ${data.clientName}</li>
            <li><strong>Domain:</strong> ${data.domain}</li>
            <li><strong>Target URL:</strong> ${data.targetPageUrl}</li>
            <li><strong>Anchor Text:</strong> "${data.anchorText}"</li>
          </ul>
        </div>

        <div style="background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #065f46;">Payment Information</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Gross Payment:</strong> $${(data.publisherPrice / 100).toFixed(2)}</li>
            <li><strong>Platform Fee:</strong> $${(data.platformFee / 100).toFixed(2)}</li>
            <li><strong>Your Earnings:</strong> $${(data.netEarnings / 100).toFixed(2)}</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px; display: inline-block;">
            Accept Order
          </a>
          <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Decline Order
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          You can also manage this order from your <a href="${dashboardUrl}" style="color: #2563eb;">publisher dashboard</a>.
        </p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 12px;">
          <p>This is an automated notification from your content management system.</p>
        </div>
      </div>
    `;

    try {
      const result = await resend.emails.send({
        from: 'Content Orders <orders@linkio.com>',
        to: data.publisherEmail,
        subject: `New Order Assignment #${data.orderNumber} - ${data.domain}`,
        html: htmlContent,
        text: `New Order Assignment #${data.orderNumber}
        
Client: ${data.clientName}
Domain: ${data.domain}
Target URL: ${data.targetPageUrl}
Anchor Text: "${data.anchorText}"

Payment: $${(data.netEarnings / 100).toFixed(2)} (after $${(data.platformFee / 100).toFixed(2)} platform fee)

Accept: ${acceptUrl}
Decline: ${rejectUrl}
Dashboard: ${dashboardUrl}`
      });

      return result.data;
    } catch (error) {
      console.error('Failed to send assignment email:', error);
      throw error;
    }
  }

  /**
   * Send reminder notification
   */
  static async sendReminder(orderLineItemId: string, reminderType: 'acceptance' | 'progress' | 'deadline') {
    // Implementation for reminder notifications
    console.log('TODO: Implement reminder notifications', { orderLineItemId, reminderType });
  }

  /**
   * Get notification history for a publisher
   */
  static async getNotificationHistory(publisherId: string, limit = 20) {
    return db
      .select()
      .from(publisherOrderNotifications)
      .where(eq(publisherOrderNotifications.publisherId, publisherId))
      .orderBy(publisherOrderNotifications.sentAt)
      .limit(limit);
  }
}