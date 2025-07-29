import { db } from '@/lib/db/connection';
import { 
  orders, 
  orderItems, 
  orderShareTokens, 
  orderStatusHistory,
  domainSuggestions,
  advertiserOrderAccess,
  pricingRules,
  type Order,
  type OrderItem,
  type NewOrder,
  type NewOrderItem,
  type PricingRule
} from '@/lib/db/orderSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { workflows } from '@/lib/db/schema';
import { eq, and, gte, lte, or, sql, desc, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface CreateOrderInput {
  clientId: string;
  advertiserEmail: string;
  advertiserName: string;
  advertiserCompany?: string;
  advertiserId?: string;
  createdBy: string;
  assignedTo?: string;
  internalNotes?: string;
  includesClientReview?: boolean;
  rushDelivery?: boolean;
}

export interface AddOrderItemInput {
  orderId: string;
  domainId: string;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & {
    domain?: any;
    workflow?: any;
  })[];
  client?: any;
  advertiser?: any;
  createdByUser?: any;
  assignedToUser?: any;
}

export class OrderService {
  /**
   * Create a new order
   */
  static async createOrder(input: CreateOrderInput): Promise<Order> {
    const orderId = uuidv4();
    const now = new Date();

    const [order] = await db.insert(orders).values({
      id: orderId,
      clientId: input.clientId,
      advertiserId: input.advertiserId || null,
      advertiserEmail: input.advertiserEmail,
      advertiserName: input.advertiserName,
      advertiserCompany: input.advertiserCompany || null,
      status: 'draft',
      createdBy: input.createdBy,
      assignedTo: input.assignedTo || null,
      internalNotes: input.internalNotes || null,
      includesClientReview: input.includesClientReview || false,
      clientReviewFee: input.includesClientReview ? 50000 : 0, // $500 in cents
      rushDelivery: input.rushDelivery || false,
      rushFee: input.rushDelivery ? 100000 : 0, // $1000 in cents
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Log status change
    await this.logStatusChange(orderId, null, 'draft', input.createdBy);

    return order;
  }

  /**
   * Get order by ID with all related data
   */
  static async getOrderById(orderId: string): Promise<OrderWithItems | null> {
    const result = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: {
          with: {
            domain: true,
            workflow: true,
          },
        },
        client: true,
        advertiser: true,
        createdByUser: true,
        assignedToUser: true,
      },
    });

    return result || null;
  }

  /**
   * Add item to order
   */
  static async addOrderItem(input: AddOrderItemInput): Promise<OrderItem> {
    // Get domain details
    const domain = await db.query.bulkAnalysisDomains.findFirst({
      where: eq(bulkAnalysisDomains.id, input.domainId),
    });

    if (!domain) {
      throw new Error('Domain not found');
    }

    // Get pricing from websites table
    const website = await db.query.websites.findFirst({
      where: or(
        eq(websites.domain, domain.domain),
        eq(websites.domain, `www.${domain.domain}`),
        eq(websites.domain, domain.domain.replace('www.', ''))
      ),
    });

    const retailPrice = website?.guestPostCost ? parseFloat(website.guestPostCost) : 0;
    const wholesalePrice = Math.floor(retailPrice * 0.6); // 40% margin

    const [item] = await db.insert(orderItems).values({
      id: uuidv4(),
      orderId: input.orderId,
      domainId: input.domainId,
      domain: domain.domain,
      domainRating: website?.domainRating || null,
      traffic: website?.totalTraffic || null,
      retailPrice: Math.floor(retailPrice * 100), // Convert to cents
      wholesalePrice: Math.floor(wholesalePrice * 100),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Update order totals
    await this.recalculateOrderTotals(input.orderId);

    return item;
  }

  /**
   * Remove item from order
   */
  static async removeOrderItem(orderId: string, itemId: string): Promise<void> {
    await db.delete(orderItems).where(
      and(
        eq(orderItems.id, itemId),
        eq(orderItems.orderId, orderId)
      )
    );

    // Update order totals
    await this.recalculateOrderTotals(orderId);
  }

  /**
   * Recalculate order totals with discounts
   */
  static async recalculateOrderTotals(orderId: string): Promise<void> {
    // Get all items
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    // Get order details
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) return;

    // Calculate subtotals
    const subtotalRetail = items.reduce((sum, item) => sum + item.retailPrice, 0);
    const subtotalWholesale = items.reduce((sum, item) => sum + item.wholesalePrice, 0);

    // Get applicable discount
    const discount = await this.getApplicableDiscount(order.clientId, items.length);
    const discountAmount = Math.floor(subtotalRetail * (parseFloat(discount.discountPercent) / 100));

    // Add fees
    const totalRetail = subtotalRetail - discountAmount + 
      (order.clientReviewFee || 0) + 
      (order.rushFee || 0);
    const totalWholesale = subtotalWholesale;
    const profitMargin = totalRetail - totalWholesale;

    // Update order
    await db.update(orders)
      .set({
        subtotalRetail,
        discountPercent: discount.discountPercent.toString(),
        discountAmount,
        totalRetail,
        totalWholesale,
        profitMargin,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  }

  /**
   * Get applicable discount based on quantity
   */
  static async getApplicableDiscount(
    clientId: string | null, 
    quantity: number
  ): Promise<PricingRule> {
    // First check for client-specific rules
    if (clientId) {
      const clientRule = await db.query.pricingRules.findFirst({
        where: and(
          eq(pricingRules.clientId, clientId),
          lte(pricingRules.minQuantity, quantity),
          or(
            isNull(pricingRules.maxQuantity),
            gte(pricingRules.maxQuantity, quantity)
          )
        ),
      });

      if (clientRule) return clientRule;
    }

    // Fall back to global rules
    const globalRule = await db.query.pricingRules.findFirst({
      where: and(
        isNull(pricingRules.clientId),
        lte(pricingRules.minQuantity, quantity),
        or(
          isNull(pricingRules.maxQuantity),
          gte(pricingRules.maxQuantity, quantity)
        )
      ),
    });

    // Default no discount
    return globalRule || {
      id: '',
      clientId: null,
      name: 'No Discount',
      minQuantity: 0,
      maxQuantity: null,
      discountPercent: '0',
      validFrom: new Date(),
      validUntil: null,
      createdBy: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Generate share token for order
   */
  static async generateShareToken(
    orderId: string, 
    expiresInDays: number = 7
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create token record
    await db.insert(orderShareTokens).values({
      token,
      orderId,
      permissions: ['view', 'approve'],
      expiresAt,
      createdAt: new Date(),
    });

    // Update order with token
    await db.update(orders)
      .set({
        shareToken: token,
        shareExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return token;
  }

  /**
   * Validate and use share token
   */
  static async validateShareToken(token: string, ip?: string): Promise<Order | null> {
    // Get token record
    const tokenRecord = await db.query.orderShareTokens.findFirst({
      where: eq(orderShareTokens.token, token),
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return null;
    }

    // Update usage
    await db.update(orderShareTokens)
      .set({
        usedAt: new Date(),
        usedByIp: ip || null,
        useCount: sql`${orderShareTokens.useCount} + 1`,
      })
      .where(eq(orderShareTokens.token, token));

    // Get order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, tokenRecord.orderId),
    });

    return order || null;
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string, 
    newStatus: string, 
    changedBy: string,
    notes?: string
  ): Promise<void> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) throw new Error('Order not found');

    const oldStatus = order.status;

    // Update order
    const updates: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Set timestamp fields based on status
    if (newStatus === 'approved' && !order.approvedAt) {
      updates.approvedAt = new Date();
    } else if (newStatus === 'invoiced' && !order.invoicedAt) {
      updates.invoicedAt = new Date();
    } else if (newStatus === 'paid' && !order.paidAt) {
      updates.paidAt = new Date();
    } else if (newStatus === 'completed' && !order.completedAt) {
      updates.completedAt = new Date();
    } else if (newStatus === 'cancelled' && !order.cancelledAt) {
      updates.cancelledAt = new Date();
    }

    await db.update(orders)
      .set(updates)
      .where(eq(orders.id, orderId));

    // Log status change
    await this.logStatusChange(orderId, oldStatus, newStatus, changedBy, notes);
  }

  /**
   * Log status change
   */
  static async logStatusChange(
    orderId: string,
    oldStatus: string | null,
    newStatus: string,
    changedBy: string,
    notes?: string
  ): Promise<void> {
    await db.insert(orderStatusHistory).values({
      id: uuidv4(),
      orderId,
      oldStatus,
      newStatus,
      changedBy,
      changedAt: new Date(),
      notes: notes || null,
    });
  }

  /**
   * Create workflows for paid order
   */
  static async createWorkflowsForOrder(orderId: string, createdBy: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order || order.status !== 'paid') {
      throw new Error('Order must be paid before creating workflows');
    }

    for (const item of order.items) {
      if (item.workflowId) continue; // Already has workflow

      // Create workflow title
      const workflowTitle = `${order.advertiserCompany || order.advertiserName} - ${item.domain}`;

      // Create workflow
      const workflowId = uuidv4();
      const now = new Date();

      await db.insert(workflows).values({
        id: workflowId,
        userId: createdBy,
        clientId: order.clientId,
        title: workflowTitle,
        status: 'active',
        orderItemId: item.id,
        content: {}, // Will be populated later
        targetPages: [],
        createdAt: now,
        updatedAt: now,
      });

      // Update order item
      await db.update(orderItems)
        .set({
          workflowId,
          workflowStatus: 'created',
          workflowCreatedAt: now,
          status: 'workflow_created',
          updatedAt: now,
        })
        .where(eq(orderItems.id, item.id));
    }

    // Update order status
    await this.updateOrderStatus(orderId, 'in_progress', createdBy, 'Workflows created');
  }

  /**
   * Get orders for advertiser
   */
  static async getAdvertiserOrders(advertiserId: string): Promise<Order[]> {
    const result = await db.query.orders.findMany({
      where: eq(orders.advertiserId, advertiserId),
      orderBy: desc(orders.createdAt),
    });

    return result;
  }

  /**
   * Get orders by status
   */
  static async getOrdersByStatus(status: string): Promise<Order[]> {
    const result = await db.query.orders.findMany({
      where: eq(orders.status, status),
      orderBy: desc(orders.createdAt),
    });

    return result;
  }

  /**
   * Get all orders with pagination
   */
  static async getAllOrders(limit: number = 50, offset: number = 0): Promise<Order[]> {
    const result = await db.query.orders.findMany({
      orderBy: desc(orders.createdAt),
      limit,
      offset,
    });

    return result;
  }

  /**
   * Get orders with item counts
   */
  static async getOrdersWithItemCounts(): Promise<(Order & { itemCount: number })[]> {
    const result = await db
      .select({
        id: orders.id,
        clientId: orders.clientId,
        advertiserId: orders.advertiserId,
        advertiserEmail: orders.advertiserEmail,
        advertiserName: orders.advertiserName,
        advertiserCompany: orders.advertiserCompany,
        status: orders.status,
        subtotalRetail: orders.subtotalRetail,
        discountPercent: orders.discountPercent,
        discountAmount: orders.discountAmount,
        totalRetail: orders.totalRetail,
        totalWholesale: orders.totalWholesale,
        profitMargin: orders.profitMargin,
        includesClientReview: orders.includesClientReview,
        clientReviewFee: orders.clientReviewFee,
        rushDelivery: orders.rushDelivery,
        rushFee: orders.rushFee,
        shareToken: orders.shareToken,
        shareExpiresAt: orders.shareExpiresAt,
        approvedAt: orders.approvedAt,
        invoicedAt: orders.invoicedAt,
        paidAt: orders.paidAt,
        completedAt: orders.completedAt,
        cancelledAt: orders.cancelledAt,
        createdBy: orders.createdBy,
        assignedTo: orders.assignedTo,
        internalNotes: orders.internalNotes,
        advertiserNotes: orders.advertiserNotes,
        cancellationReason: orders.cancellationReason,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        itemCount: sql<number>`cast(count(${orderItems.id}) as int)`,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt));

    return result;
  }

  /**
   * Get order by share token
   */
  static async getOrderByShareToken(token: string): Promise<Order | null> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.shareToken, token),
    });

    return order || null;
  }

  /**
   * Track share token usage
   */
  static async trackShareTokenUsage(token: string, ip?: string): Promise<void> {
    const tokenRecord = await db.query.orderShareTokens.findFirst({
      where: eq(orderShareTokens.token, token),
    });

    if (tokenRecord) {
      await db.update(orderShareTokens)
        .set({
          usedAt: new Date(),
          usedByIp: ip || null,
          useCount: sql`${orderShareTokens.useCount} + 1`,
        })
        .where(eq(orderShareTokens.token, token));
    }
  }

  /**
   * Invalidate share token after use
   */
  static async invalidateShareToken(orderId: string): Promise<void> {
    await db.update(orders)
      .set({
        shareToken: null,
        shareExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  }
}