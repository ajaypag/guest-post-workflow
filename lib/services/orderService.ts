import { db } from '@/lib/db/connection';
import { 
  orders, 
  orderItems, 
  orderShareTokens, 
  orderStatusHistory,
  domainSuggestions,
  pricingRules,
  type Order,
  type OrderItem,
  type NewOrder,
  type NewOrderItem,
  type PricingRule
} from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { workflows } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and, gte, lte, or, sql, desc, isNull, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import EnhancedOrderPricingService from './enhancedOrderPricingService';

export interface CreateOrderInput {
  accountId: string;
  createdBy: string;
  assignedTo?: string;
  internalNotes?: string;
  includesClientReview?: boolean;
  rushDelivery?: boolean;
}

export interface AddOrderItemInput {
  orderId: string;
  domainId: string;
  targetPageId?: string;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & {
    domain?: any;
    workflow?: any;
  })[];
  account?: any;
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
      accountId: input.accountId,
      status: 'draft',
      createdBy: input.createdBy,
      assignedTo: input.assignedTo || null,
      internalNotes: input.internalNotes || null,
      includesClientReview: input.includesClientReview || false,
      clientReviewFee: input.includesClientReview ? 50000 : 0, // $500 in cents
      rushDelivery: input.rushDelivery || false,
      rushFee: input.rushDelivery ? 100000 : 0, // $1000 in cents
      expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Log status change
    await this.logStatusChange(orderId, null, 'draft', input.createdBy);

    return order;
  }

  /**
   * Update order delivery deadline
   */
  static async updateOrderDeadline(
    orderId: string, 
    newDeadline: Date, 
    cascadeToLineItems: boolean = false,
    updatedBy: string
  ): Promise<void> {
    const now = new Date();
    
    // Update the order
    await db.update(orders)
      .set({ 
        expectedDeliveryDate: newDeadline,
        updatedAt: now 
      })
      .where(eq(orders.id, orderId));

    // Optionally cascade to line items
    if (cascadeToLineItems) {
      await db.update(orderLineItems)
        .set({ 
          modifiedAt: now,
          modifiedBy: updatedBy
        })
        .where(eq(orderLineItems.orderId, orderId));
    }
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
        account: true,
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

    // Get website details
    const website = await db.query.websites.findFirst({
      where: or(
        eq(websites.domain, domain.domain),
        eq(websites.domain, `www.${domain.domain}`),
        eq(websites.domain, domain.domain.replace('www.', ''))
      ),
    });

    // Get pricing using enhanced pricing service
    const pricing = await EnhancedOrderPricingService.getWebsitePrice(
      website?.id || null,
      domain.domain,
      {
        quantity: 1 // Single item for now
        // accountId would come from order, not input
      }
    );

    const retailPrice = pricing.retailPrice;
    const wholesalePrice = pricing.wholesalePrice;

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
      targetPageId: input.targetPageId || null,
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
    // TODO: After migration, get clientId from order_groups
    const discount = await this.getApplicableDiscount(null, items.length);
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
      const workflowTitle = `${order.account?.companyName || order.account?.contactName || 'Account'} - ${item.domain}`;

      // Create workflow
      const workflowId = uuidv4();
      const now = new Date();

      await db.insert(workflows).values({
        id: workflowId,
        userId: createdBy,
        // TODO: After migration, get clientId from order_groups
        clientId: null, // Will be set from order_groups
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
   * Get orders for account with order groups
   */
  static async getAccountOrders(accountId: string): Promise<any[]> {
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    
    const accountOrders = await db.query.orders.findMany({
      where: eq(orders.accountId, accountId),
      orderBy: desc(orders.createdAt),
      with: {
        account: true
      }
    });

    // Fetch line items and order groups for each order
    const ordersWithDetails = await Promise.all(
      accountOrders.map(async (order) => {
        // Get line items count (excluding cancelled and refunded)
        const lineItems = await db.query.orderLineItems.findMany({
          where: and(
            eq(orderLineItems.orderId, order.id),
            sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
            sql`${orderLineItems.cancelledAt} IS NULL`
          ),
        });
        
        const activeLineItems = lineItems.filter(item => 
          !['cancelled', 'refunded'].includes(item.status)
        );
        
        // Count completed line items
        const completedLineItems = lineItems.filter(item => 
          ['delivered', 'completed', 'published'].includes(item.status)
        );
        
        // Get order groups for backward compatibility
        const groups = await this.getOrderGroups(order.id);
        
        // Count old items if no line items exist
        let oldItemCount = 0;
        if (activeLineItems.length === 0 && groups.length === 0) {
          const items = await db.query.orderItems.findMany({
            where: eq(orderItems.orderId, order.id),
          });
          oldItemCount = items.length;
        }
        
        // Use line item count if available, otherwise fall back to old items or order groups
        const totalLinks = activeLineItems.length || oldItemCount || groups.reduce((sum, g) => sum + g.linkCount, 0) || 0;
        const completedCount = completedLineItems.length;
        
        // Get unique client names from line items for the "Clients" column
        let clientNames: string[] = [];
        try {
          const { clients } = await import('@/lib/db/schema');
          const orderClients = await db
            .selectDistinct({
              clientName: clients.name
            })
            .from(orderLineItems)
            .innerJoin(clients, eq(orderLineItems.clientId, clients.id))
            .where(
              and(
                eq(orderLineItems.orderId, order.id),
                sql`${orderLineItems.status} not in ('cancelled', 'refunded')`
              )
            );
          
          clientNames = orderClients.map(c => c.clientName);
          
          // If no line items, fallback to order groups client names
          if (clientNames.length === 0 && groups.length > 0) {
            clientNames = groups.map(g => g.clientName).filter(name => name && name !== 'Unknown Client');
          }
        } catch (error) {
          console.error('Error fetching client names for order', order.id, error);
        }
        
        return {
          ...order,
          account: order.account,
          totalLinks,
          itemCount: totalLinks, // For backwards compatibility
          completedCount,
          orderGroups: groups,
          clientNames // Add the client names for display
        };
      })
    );

    return ordersWithDetails;
  }

  /**
   * Get orders by status with order groups
   */
  static async getOrdersByStatus(status: string): Promise<any[]> {
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    
    const statusOrders = await db.query.orders.findMany({
      where: eq(orders.status, status),
      orderBy: desc(orders.createdAt),
      with: {
        account: true
      }
    });

    // Fetch line items and order groups for each order
    const ordersWithDetails = await Promise.all(
      statusOrders.map(async (order) => {
        // Get line items count (excluding cancelled and refunded)
        const lineItems = await db.query.orderLineItems.findMany({
          where: and(
            eq(orderLineItems.orderId, order.id),
            sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
            sql`${orderLineItems.cancelledAt} IS NULL`
          ),
        });
        
        const activeLineItems = lineItems.filter(item => 
          !['cancelled', 'refunded'].includes(item.status)
        );
        
        // Count completed line items
        const completedLineItems = lineItems.filter(item => 
          ['delivered', 'completed', 'published'].includes(item.status)
        );
        
        // Get order groups for backward compatibility
        const groups = await this.getOrderGroups(order.id);
        
        // Count old items if no line items exist
        let oldItemCount = 0;
        if (activeLineItems.length === 0 && groups.length === 0) {
          const items = await db.query.orderItems.findMany({
            where: eq(orderItems.orderId, order.id),
          });
          oldItemCount = items.length;
        }
        
        // Use line item count if available, otherwise fall back to old items or order groups
        const totalLinks = activeLineItems.length || oldItemCount || groups.reduce((sum, g) => sum + g.linkCount, 0) || 0;
        const completedCount = completedLineItems.length;
        
        // Get unique client names from line items for the "Clients" column
        let clientNames: string[] = [];
        try {
          const { clients } = await import('@/lib/db/schema');
          const orderClients = await db
            .selectDistinct({
              clientName: clients.name
            })
            .from(orderLineItems)
            .innerJoin(clients, eq(orderLineItems.clientId, clients.id))
            .where(
              and(
                eq(orderLineItems.orderId, order.id),
                sql`${orderLineItems.status} not in ('cancelled', 'refunded')`
              )
            );
          
          clientNames = orderClients.map(c => c.clientName);
          
          // If no line items, fallback to order groups client names
          if (clientNames.length === 0 && groups.length > 0) {
            clientNames = groups.map(g => g.clientName).filter(name => name && name !== 'Unknown Client');
          }
        } catch (error) {
          console.error('Error fetching client names for order', order.id, error);
        }
        
        return {
          ...order,
          account: order.account,
          totalLinks,
          itemCount: totalLinks, // For backwards compatibility
          completedCount,
          orderGroups: groups,
          clientNames // Add the client names for display
        };
      })
    );

    return ordersWithDetails;
  }

  /**
   * Get orders for a client by status with order groups
   */
  static async getClientOrdersByStatus(clientId: string, status: string): Promise<any[]> {
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    
    // For draft orders, we want to show ALL draft orders that could accept items for this client
    // This includes:
    // 1. Orders that already have line items for this client
    // 2. Empty draft orders that could accept new line items
    // 3. Draft orders with unassigned line items for this client
    
    // Get all orders with the specified status
    const allOrders = await db
      .select({
        order: orders,
        account: accounts
      })
      .from(orders)
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
      .where(eq(orders.status, status));

    // Transform and fetch additional data
    const ordersWithDetails = await Promise.all(
      allOrders.map(async ({ order, account }) => {
        // Get ALL active line items for the order (exclude cancelled)
        const allLineItems = await db.query.orderLineItems.findMany({
          where: and(
            eq(orderLineItems.orderId, order.id),
            sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
            sql`${orderLineItems.cancelledAt} IS NULL`
          ),
        });

        // Get line items specifically for this client
        const clientLineItems = allLineItems.filter(item => 
          item.clientId === clientId
        );

        // Get unassigned line items that could be assigned to domains from this client
        const unassignedLineItems = allLineItems.filter(item => 
          item.clientId === clientId && 
          !item.assignedDomainId &&
          !['cancelled', 'refunded'].includes(item.status)
        );
        
        // Count active items
        const activeLineItems = allLineItems.filter(item => 
          !['cancelled', 'refunded'].includes(item.status)
        );
        
        return {
          ...order,
          account: account,
          totalLinks: activeLineItems.length,
          itemCount: activeLineItems.length,
          clientItemCount: clientLineItems.length,
          unassignedItemCount: unassignedLineItems.length,
          lineItems: allLineItems, // Include all line items
          hasCapacityForClient: unassignedLineItems.length > 0 || status === 'draft' // Draft orders can always accept new items
        };
      })
    );

    // For draft status, return all draft orders (they can all potentially accept new line items)
    // For other statuses, only return orders that have items for this client
    if (status === 'draft') {
      return ordersWithDetails.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      return ordersWithDetails
        .filter(order => order.clientItemCount > 0)
        .sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }

  /**
   * Get orders associated with a project
   */
  static async getOrdersForProject(projectId: string): Promise<{
    associatedOrders: any[];
    draftOrders: any[];
    defaultOrderId: string | null;
  }> {
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    
    // Get all orders that have line items with this project assigned
    // Look for bulkAnalysisProjectId in the metadata field
    const lineItemsWithOrders = await db
      .select({
        order: orders,
        lineItem: orderLineItems,
        account: accounts
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orderLineItems.orderId, orders.id))
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
      .where(sql`${orderLineItems.metadata}->>'bulkAnalysisProjectId' = ${projectId}`);

    // Get unique orders (since multiple line items can belong to same order)
    const uniqueOrdersMap = new Map();
    lineItemsWithOrders.forEach(({ order, account }) => {
      if (!uniqueOrdersMap.has(order.id)) {
        uniqueOrdersMap.set(order.id, { order, account });
      }
    });

    // Filter orders based on status - exclude completed and cancelled orders
    const activeOrders = Array.from(uniqueOrdersMap.values()).filter(({ order }) => {
      return order.status !== 'completed' && order.status !== 'cancelled';
    });

    // Get line item counts for each order (exclude cancelled and refunded items)
    const orderIds = activeOrders.map(({ order }) => order.id);
    let lineItemCounts: any[] = [];
    
    if (orderIds.length > 0) {
      lineItemCounts = await db
        .select({
          orderId: orderLineItems.orderId,
          count: sql<number>`cast(count(case when ${orderLineItems.status} not in ('cancelled', 'refunded') then 1 end) as int)`
        })
        .from(orderLineItems)
        .where(inArray(orderLineItems.orderId, orderIds))
        .groupBy(orderLineItems.orderId);
    }

    const countsMap = new Map(lineItemCounts.map(item => [item.orderId, item.count]));

    // Transform the data for the frontend
    const associatedOrders = activeOrders.map(({ order, account }) => ({
      id: order.id,
      orderId: order.id, // Add orderId for compatibility
      account: account ? {
        id: account.id,
        email: account.email,
        contactName: account.contactName,
        companyName: account.companyName
      } : null,
      accountName: account?.contactName || account?.companyName || account?.email || 'Unknown',
      accountEmail: account?.email || 'Unknown',
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      itemCount: countsMap.get(order.id) || 0,
      totalRetail: order.totalRetail
    }));

    // Get the client ID from the first line item if available
    const clientId = lineItemsWithOrders[0]?.lineItem.clientId;
    let draftOrders: any[] = [];
    
    if (clientId) {
      // Get all draft orders for this client that aren't already associated
      const associatedOrderIds = activeOrders.map(({ order }) => order.id);
      
      // Get draft orders that have line items for this client
      const clientDraftOrders = await db
        .selectDistinct({
          order: orders,
          account: accounts
        })
        .from(orders)
        .innerJoin(orderLineItems, eq(orderLineItems.orderId, orders.id))
        .leftJoin(accounts, eq(orders.accountId, accounts.id))
        .where(
          and(
            eq(orderLineItems.clientId, clientId),
            eq(orders.status, 'draft'),
            associatedOrderIds.length > 0 
              ? sql`${orders.id} NOT IN (${sql.join(associatedOrderIds.map(id => sql`${id}`), sql`, `)})`
              : sql`true`
          )
        );

      // Get line item counts for draft orders
      const draftOrderIds = clientDraftOrders.map(({ order }) => order.id);
      let draftCounts: any[] = [];
      
      if (draftOrderIds.length > 0) {
        draftCounts = await db
          .select({
            orderId: orderLineItems.orderId,
            count: sql<number>`cast(count(case when ${orderLineItems.status} not in ('cancelled', 'refunded') then 1 end) as int)`
          })
          .from(orderLineItems)
          .where(inArray(orderLineItems.orderId, draftOrderIds))
          .groupBy(orderLineItems.orderId);
      }

      const draftCountsMap = new Map(draftCounts.map(item => [item.orderId, item.count]));

      draftOrders = clientDraftOrders.map(({ order, account }) => ({
        id: order.id,
        account: account ? {
          id: account.id,
          email: account.email,
          contactName: account.contactName,
          companyName: account.companyName
        } : null,
        accountName: account?.contactName || account?.companyName || account?.email || 'Unknown',
        accountEmail: account?.email || 'Unknown',
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        itemCount: draftCountsMap.get(order.id) || 0,
        totalRetail: order.totalRetail
      }));
    }

    return {
      associatedOrders,
      draftOrders,
      defaultOrderId: associatedOrders.length > 0 ? associatedOrders[0].id : null
    };
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
   * Get orders with item counts and order groups
   */
  static async getOrdersWithItemCounts(): Promise<any[]> {
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    const { and, sql } = await import('drizzle-orm');
    
    // First get all orders with line item counts and account info
    // Count non-cancelled/refunded line items
    const ordersWithCounts = await db
      .select({
        id: orders.id,
        accountId: orders.accountId,
        status: orders.status,
        state: orders.state,
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
        requiresClientReview: orders.requiresClientReview,
        reviewCompletedAt: orders.reviewCompletedAt,
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
        accountNotes: orders.accountNotes,
        cancellationReason: orders.cancellationReason,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        // Count active line items (exclude cancelled and refunded)
        lineItemCount: sql<number>`cast(count(case when ${orderLineItems.status} not in ('cancelled', 'refunded') then 1 end) as int)`,
        // Also count old orderItems for backward compatibility
        oldItemCount: sql<number>`cast(count(${orderItems.id}) as int)`,
        // Account data - select individual fields
        accountEmail: accounts.email,
        accountContactName: accounts.contactName,
        accountCompanyName: accounts.companyName,
      })
      .from(orders)
      .leftJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
      .groupBy(
        orders.id, 
        orders.accountId,
        orders.status,
        orders.state,
        orders.subtotalRetail,
        orders.discountPercent,
        orders.discountAmount,
        orders.totalRetail,
        orders.totalWholesale,
        orders.profitMargin,
        orders.includesClientReview,
        orders.clientReviewFee,
        orders.rushDelivery,
        orders.rushFee,
        orders.requiresClientReview,
        orders.reviewCompletedAt,
        orders.shareToken,
        orders.shareExpiresAt,
        orders.approvedAt,
        orders.invoicedAt,
        orders.paidAt,
        orders.completedAt,
        orders.cancelledAt,
        orders.createdBy,
        orders.assignedTo,
        orders.internalNotes,
        orders.accountNotes,
        orders.cancellationReason,
        orders.createdAt,
        orders.updatedAt,
        accounts.id, 
        accounts.email, 
        accounts.contactName, 
        accounts.companyName
      )
      .orderBy(desc(orders.createdAt));

    // Now fetch additional details for each order
    const ordersWithDetails = await Promise.all(
      ordersWithCounts.map(async (order) => {
        // Get order groups for backward compatibility
        const groups = await this.getOrderGroups(order.id);
        
        // Get unique client names from line items for the "Clients" column
        let clientNames: string[] = [];
        try {
          const { clients } = await import('@/lib/db/schema');
          const orderClients = await db
            .selectDistinct({
              clientName: clients.name
            })
            .from(orderLineItems)
            .innerJoin(clients, eq(orderLineItems.clientId, clients.id))
            .where(
              and(
                eq(orderLineItems.orderId, order.id),
                sql`${orderLineItems.status} not in ('cancelled', 'refunded')`
              )
            );
          
          clientNames = orderClients.map(c => c.clientName);
          
          // If no line items, fallback to order groups client names
          if (clientNames.length === 0 && groups.length > 0) {
            clientNames = groups.map(g => g.clientName).filter(name => name && name !== 'Unknown Client');
          }
        } catch (error) {
          console.error('Error fetching client names for order', order.id, error);
        }
        
        // Reconstruct account object from individual fields
        const account = order.accountEmail ? {
          id: order.accountId,
          email: order.accountEmail,
          contactName: order.accountContactName,
          companyName: order.accountCompanyName
        } : null;
        
        // Remove the individual account fields and add the account object
        const { accountEmail, accountContactName, accountCompanyName, lineItemCount, oldItemCount, ...orderData } = order;
        
        // Use line item count if available, otherwise fall back to old items or order groups
        const totalLinks = lineItemCount || oldItemCount || groups.reduce((sum, g) => sum + g.linkCount, 0) || 0;
        
        // Count completed line items
        const completedLineItems = await db.query.orderLineItems.findMany({
          where: and(
            eq(orderLineItems.orderId, order.id),
            sql`${orderLineItems.status} in ('delivered', 'completed', 'published')`
          ),
        });
        const completedCount = completedLineItems.length;
        
        return {
          ...orderData,
          account,
          totalLinks,
          itemCount: totalLinks, // For backward compatibility
          completedCount,
          orderGroups: groups,
          clientNames // Add the client names for display
        };
      })
    );

    return ordersWithDetails;
  }

  /**
   * Get order groups with client info and site selections
   * NOTE: This is being phased out - returns empty array during migration
   */
  static async getOrderGroups(orderId: string): Promise<any[]> {
    // During migration, return empty array to force lineItems usage
    // Temporarily enabled to get client names for legacy orders
    if (false) { // Force migration mode - disabled to get client names
      return [];
    }
    
    try {
      const { orderGroups } = await import('@/lib/db/orderGroupSchema');
      const { clients } = await import('@/lib/db/schema');
      const { orderSiteSelections } = await import('@/lib/db/orderGroupSchema');
      
      // Use the same approach as the individual order API
      const orderGroupsData = await db
        .select({
          orderGroup: orderGroups,
          client: clients
        })
        .from(orderGroups)
        .leftJoin(clients, eq(orderGroups.clientId, clients.id))
        .where(eq(orderGroups.orderId, orderId));
      
      
      return orderGroupsData.map(({ orderGroup, client }) => ({
        id: orderGroup.id,
        clientId: orderGroup.clientId,
        clientName: client?.name || 'Unknown Client',
        clientWebsite: client?.website,
        linkCount: orderGroup.linkCount,
        targetPages: orderGroup.targetPages?.map(tp => tp.url) || [],
        bulkAnalysisProjectId: orderGroup.bulkAnalysisProjectId,
        groupStatus: orderGroup.groupStatus || 'pending',
        siteSelections: {
          approved: 0, // We're not fetching site selections for the list view
          pending: 0,
          total: 0
        }
      }));
    } catch (error) {
      console.error(`Error in getOrderGroups for ${orderId}:`, error);
      return [];
    }
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