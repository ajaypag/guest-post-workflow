import { db } from '@/lib/db/connection';
import { 
  orderLineItems, 
  type OrderLineItem,
  type NewOrderLineItem 
} from '@/lib/db/orderLineItemSchema';
import { 
  publisherEarnings,
  publisherOrderNotifications,
  commissionConfigurations,
  type NewPublisherEarning,
  type NewPublisherOrderNotification,
  EARNING_TYPES,
  EARNING_STATUS,
  NOTIFICATION_TYPES
} from '@/lib/db/publisherEarningsSchema';
import { 
  publisherOfferingRelationships,
  publisherOfferings,
  type PublisherOffering
} from '@/lib/db/publisherOfferingsSchemaFixed';
import { websites } from '@/lib/db/websiteSchema';
import { publishers } from '@/lib/db/accountSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { EmailService } from '@/lib/services/emailService';

/**
 * Service to handle order-to-publisher connections and flow
 */
export class PublisherOrderService {
  
  /**
   * Find matching publisher for a domain
   * Prioritizes by: verified status > priority rank > creation date
   */
  static async findPublisherForDomain(domainId: string): Promise<{
    publisherId: string | null;
    offeringId: string | null;
    publisherPrice: number | null;
  }> {
    try {
      // Get the domain details
      const domain = await db.query.bulkAnalysisDomains.findFirst({
        where: eq(bulkAnalysisDomains.id, domainId)
      });

      if (!domain) {
        return { publisherId: null, offeringId: null, publisherPrice: null };
      }

      // Find website by domain name
      const website = await db.query.websites.findFirst({
        where: eq(websites.domain, domain.domain)
      });

      if (!website) {
        return { publisherId: null, offeringId: null, publisherPrice: null };
      }

      // Find the best publisher relationship for this website
      const relationship = await db.query.publisherOfferingRelationships.findFirst({
        where: and(
          eq(publisherOfferingRelationships.websiteId, website.id),
          eq(publisherOfferingRelationships.isActive, true)
        ),
        orderBy: [
          // Prioritize verified publishers
          sql`CASE WHEN verification_status = 'verified' THEN 0 ELSE 1 END`,
          // Then by priority rank (lower is better)
          publisherOfferingRelationships.priorityRank,
          // Finally by creation date (older relationships first)
          publisherOfferingRelationships.createdAt
        ],
        with: {
          offering: true,
          publisher: true
        }
      });

      if (!relationship || !relationship.offering) {
        return { publisherId: null, offeringId: null, publisherPrice: null };
      }

      const offering = relationship.offering;
      const publisherPrice = offering.basePrice ? Math.round(offering.basePrice * 100) : null; // Convert to cents

      return {
        publisherId: relationship.publisherId,
        offeringId: offering.id,
        publisherPrice
      };
    } catch (error) {
      console.error('Error finding publisher for domain:', error);
      return { publisherId: null, offeringId: null, publisherPrice: null };
    }
  }

  /**
   * Assign a domain to an order line item with publisher connection
   */
  static async assignDomainWithPublisher(
    lineItemId: string,
    domainId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find publisher for the domain
      const publisherInfo = await this.findPublisherForDomain(domainId);
      
      // Get domain details
      const domain = await db.query.bulkAnalysisDomains.findFirst({
        where: eq(bulkAnalysisDomains.id, domainId)
      });

      if (!domain) {
        return { success: false, error: 'Domain not found' };
      }

      // Calculate platform fee if publisher found
      let platformFee = null;
      if (publisherInfo.publisherId && publisherInfo.publisherPrice) {
        const feeInfo = await this.calculatePlatformFee(
          publisherInfo.publisherId,
          publisherInfo.publisherPrice
        );
        platformFee = feeInfo.platformFee;
      }

      // Update line item with domain and publisher assignment
      await db
        .update(orderLineItems)
        .set({
          assignedDomainId: domainId,
          assignedDomain: domain.domain,
          publisherId: publisherInfo.publisherId,
          publisherOfferingId: publisherInfo.offeringId,
          publisherPrice: publisherInfo.publisherPrice,
          platformFee,
          publisherStatus: publisherInfo.publisherId ? 'pending' : null,
          status: 'assigned',
          assignedAt: new Date(),
          assignedBy: userId,
          modifiedAt: new Date(),
          modifiedBy: userId
        })
        .where(eq(orderLineItems.id, lineItemId));

      // If publisher assigned, create notification
      if (publisherInfo.publisherId) {
        await this.createPublisherNotification(
          publisherInfo.publisherId,
          lineItemId,
          NOTIFICATION_TYPES.NEW_ORDER
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning domain with publisher:', error);
      return { success: false, error: 'Failed to assign domain' };
    }
  }

  /**
   * Calculate platform fee based on commission configuration
   */
  static async calculatePlatformFee(
    publisherId: string,
    amount: number,
    orderType: string = 'standard'
  ): Promise<{ platformFee: number; commissionPercent: number }> {
    try {
      // Get applicable commission configuration
      // Priority: publisher-specific > global
      let [config] = await db
        .select()
        .from(commissionConfigurations)
        .where(
          and(
            eq(commissionConfigurations.scopeType, 'publisher'),
            eq(commissionConfigurations.scopeId, publisherId),
            eq(commissionConfigurations.isActive, true)
          )
        )
        .orderBy(commissionConfigurations.createdAt)
        .limit(1);

      if (!config) {
        // Fall back to global configuration
        [config] = await db
          .select()
          .from(commissionConfigurations)
          .where(
            and(
              eq(commissionConfigurations.scopeType, 'global'),
              eq(commissionConfigurations.isActive, true)
            )
          )
          .orderBy(commissionConfigurations.createdAt)
          .limit(1);
      }

      // Default to 30% if no configuration found
      const commissionPercent = config?.baseCommissionPercent 
        ? parseFloat(config.baseCommissionPercent) 
        : 30;

      const platformFee = Math.round(amount * commissionPercent / 100);

      return { platformFee, commissionPercent };
    } catch (error) {
      console.error('Error calculating platform fee:', error);
      // Default to 30% commission
      return { 
        platformFee: Math.round(amount * 0.3), 
        commissionPercent: 30 
      };
    }
  }

  /**
   * Create earnings record when order is completed
   */
  static async createEarningsForCompletedOrder(
    lineItemId: string
  ): Promise<{ success: boolean; earningId?: string; error?: string }> {
    try {
      // Get line item details
      const lineItem = await db.query.orderLineItems.findFirst({
        where: eq(orderLineItems.id, lineItemId),
        with: {
          order: true
        }
      });

      if (!lineItem) {
        return { success: false, error: 'Line item not found' };
      }

      if (!lineItem.publisherId || !lineItem.publisherPrice) {
        return { success: false, error: 'No publisher assigned to this order' };
      }

      // Check if earnings already exist
      const [existingEarning] = await db
        .select()
        .from(publisherEarnings)
        .where(
          and(
            eq(publisherEarnings.orderLineItemId, lineItemId),
            eq(publisherEarnings.earningType, EARNING_TYPES.ORDER_COMPLETION)
          )
        )
        .limit(1);

      if (existingEarning) {
        return { success: true, earningId: existingEarning.id };
      }

      // Calculate platform fee
      const feeInfo = await this.calculatePlatformFee(
        lineItem.publisherId,
        lineItem.publisherPrice
      );

      // Find website for this publisher
      const relationship = await db.query.publisherOfferingRelationships.findFirst({
        where: eq(publisherOfferingRelationships.publisherId, lineItem.publisherId)
      });

      // Create earnings record
      const earning: NewPublisherEarning = {
        publisherId: lineItem.publisherId,
        orderLineItemId: lineItemId,
        orderId: lineItem.orderId,
        earningType: EARNING_TYPES.ORDER_COMPLETION,
        amount: lineItem.publisherPrice,
        grossAmount: lineItem.publisherPrice,
        platformFeePercent: feeInfo.commissionPercent.toString(),
        platformFeeAmount: feeInfo.platformFee,
        netAmount: lineItem.publisherPrice - feeInfo.platformFee,
        status: EARNING_STATUS.PENDING,
        websiteId: relationship?.websiteId,
        description: `Earnings for completed order #${lineItem.orderId}`,
        metadata: {
          orderDetails: {
            clientId: lineItem.clientId,
            targetPageUrl: lineItem.targetPageUrl,
            anchorText: lineItem.anchorText,
            completedAt: new Date().toISOString()
          }
        }
      };

      const [newEarning] = await db
        .insert(publisherEarnings)
        .values(earning)
        .returning();

      // Update line item publisher status
      await db
        .update(orderLineItems)
        .set({
          publisherStatus: 'completed',
          modifiedAt: new Date()
        })
        .where(eq(orderLineItems.id, lineItemId));

      // Send notification to publisher
      await this.createPublisherNotification(
        lineItem.publisherId,
        lineItemId,
        NOTIFICATION_TYPES.ORDER_APPROVED,
        {
          earnings: newEarning.netAmount,
          orderId: lineItem.orderId
        }
      );

      return { success: true, earningId: newEarning.id };
    } catch (error) {
      console.error('Error creating earnings:', error);
      return { success: false, error: 'Failed to create earnings record' };
    }
  }

  /**
   * Create notification for publisher
   */
  static async createPublisherNotification(
    publisherId: string,
    lineItemId: string,
    notificationType: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get publisher details
      const publisher = await db.query.publishers.findFirst({
        where: eq(publishers.id, publisherId)
      });

      if (!publisher) {
        console.error('Publisher not found for notification');
        return;
      }

      // Create notification record
      const notification: NewPublisherOrderNotification = {
        publisherId,
        orderLineItemId: lineItemId,
        notificationType,
        channel: 'email',
        status: 'pending',
        subject: this.getNotificationSubject(notificationType),
        message: this.getNotificationMessage(notificationType, metadata),
        metadata
      };

      const [createdNotification] = await db
        .insert(publisherOrderNotifications)
        .values(notification)
        .returning();

      // Send email notification
      if (publisher.email) {
        try {
          await EmailService.send('notification', {
            to: publisher.email,
            subject: notification.subject || '',
            html: notification.message || ''
          });

          // Update notification status
          await db
            .update(publisherOrderNotifications)
            .set({
              status: 'sent',
              sentAt: new Date()
            })
            .where(eq(publisherOrderNotifications.id, createdNotification.id));
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          
          await db
            .update(publisherOrderNotifications)
            .set({
              status: 'failed',
              errorMessage: emailError instanceof Error ? emailError.message : 'Email send failed'
            })
            .where(eq(publisherOrderNotifications.id, createdNotification.id));
        }
      }
    } catch (error) {
      console.error('Error creating publisher notification:', error);
    }
  }

  /**
   * Get notification subject based on type
   */
  private static getNotificationSubject(notificationType: string): string {
    switch (notificationType) {
      case NOTIFICATION_TYPES.NEW_ORDER:
        return 'New Guest Post Order Available';
      case NOTIFICATION_TYPES.ORDER_APPROVED:
        return 'Order Completed - Earnings Added';
      case NOTIFICATION_TYPES.ORDER_CANCELLED:
        return 'Order Cancelled';
      case NOTIFICATION_TYPES.PAYMENT_SENT:
        return 'Payment Sent to Your Account';
      default:
        return 'Order Update';
    }
  }

  /**
   * Get notification message based on type
   */
  private static getNotificationMessage(
    notificationType: string, 
    metadata: Record<string, any>
  ): string {
    switch (notificationType) {
      case NOTIFICATION_TYPES.NEW_ORDER:
        return `
          <p>You have a new guest post order available for review.</p>
          <p>Please log in to your dashboard to accept or decline this order.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/publisher/orders">View Order</a></p>
        `;
      case NOTIFICATION_TYPES.ORDER_APPROVED:
        return `
          <p>Great news! Your order has been completed and approved.</p>
          <p>Earnings of $${(metadata.earnings / 100).toFixed(2)} have been added to your account.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/publisher/earnings">View Earnings</a></p>
        `;
      case NOTIFICATION_TYPES.ORDER_CANCELLED:
        return `
          <p>An order has been cancelled.</p>
          <p>If you have any questions, please contact our support team.</p>
        `;
      case NOTIFICATION_TYPES.PAYMENT_SENT:
        return `
          <p>Payment of $${(metadata.amount / 100).toFixed(2)} has been sent to your account.</p>
          <p>Reference: ${metadata.reference}</p>
          <p><a href="${process.env.NEXTAUTH_URL}/publisher/payments">View Payment Details</a></p>
        `;
      default:
        return '<p>Your order has been updated.</p>';
    }
  }

  /**
   * Get publisher's pending earnings
   */
  static async getPublisherPendingEarnings(publisherId: string): Promise<number> {
    try {
      const result = await db
        .select({
          total: sql<number>`COALESCE(SUM(net_amount), 0)`
        })
        .from(publisherEarnings)
        .where(
          and(
            eq(publisherEarnings.publisherId, publisherId),
            inArray(publisherEarnings.status, [EARNING_STATUS.PENDING, EARNING_STATUS.CONFIRMED]),
            sql`payment_batch_id IS NULL`
          )
        );

      return result[0]?.total || 0;
    } catch (error) {
      console.error('Error getting pending earnings:', error);
      return 0;
    }
  }

  /**
   * Get publisher's order statistics
   */
  static async getPublisherOrderStats(publisherId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
  }> {
    try {
      // Get order counts
      const orderStats = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
          pendingOrders: sql<number>`COUNT(*) FILTER (WHERE publisher_status IN ('pending', 'notified', 'accepted', 'in_progress'))`,
          completedOrders: sql<number>`COUNT(*) FILTER (WHERE publisher_status = 'completed')`
        })
        .from(orderLineItems)
        .where(eq(orderLineItems.publisherId, publisherId));

      // Get earnings stats
      const earningsStats = await db
        .select({
          totalEarnings: sql<number>`COALESCE(SUM(net_amount), 0)`,
          pendingEarnings: sql<number>`COALESCE(SUM(net_amount) FILTER (WHERE status IN ('pending', 'confirmed')), 0)`,
          paidEarnings: sql<number>`COALESCE(SUM(net_amount) FILTER (WHERE status = 'paid'), 0)`
        })
        .from(publisherEarnings)
        .where(eq(publisherEarnings.publisherId, publisherId));

      return {
        totalOrders: orderStats[0]?.totalOrders || 0,
        pendingOrders: orderStats[0]?.pendingOrders || 0,
        completedOrders: orderStats[0]?.completedOrders || 0,
        totalEarnings: earningsStats[0]?.totalEarnings || 0,
        pendingEarnings: earningsStats[0]?.pendingEarnings || 0,
        paidEarnings: earningsStats[0]?.paidEarnings || 0
      };
    } catch (error) {
      console.error('Error getting publisher stats:', error);
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0
      };
    }
  }
}