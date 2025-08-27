/**
 * Task Service
 * Aggregates deadline-driven work from multiple sources into a unified task interface
 */

import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { workflows, clientBrandIntelligence } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { users } from '@/lib/db/schema';
import { vettedSitesRequests } from '@/lib/db/vettedSitesRequestSchema';
import { eq, and, or, sql, isNull, inArray, gte, lte, desc, asc, aliasedTable } from 'drizzle-orm';
import {
  type TaskFilters,
  type UnifiedTask,
  type OrderTask,
  type WorkflowTask,
  type LineItemTask,
  type TaskStats,
  type GroupedTasks,
  type TasksResponse,
  type TaskUser,
  type TaskClient,
  type TaskStatus,
  type TaskType,
  isOverdue,
  isDueToday,
  isDueThisWeek,
  sortTasksByDeadline
} from '@/lib/types/tasks';

export class TaskService {
  /**
   * Get tasks with optional filtering
   */
  async getTasks(filters?: TaskFilters): Promise<TasksResponse> {
    const tasks: UnifiedTask[] = [];
    
    // Determine which task types to fetch based on type filter
    const typesToFetch = filters?.types && filters.types.length > 0 
      ? filters.types 
      : ['order', 'line_item', 'workflow', 'vetted_sites_request', 'brand_intelligence'] as TaskType[];
    
    // Only fetch the task types that are requested
    const fetchPromises: Promise<UnifiedTask[]>[] = [];
    
    if (typesToFetch.includes('order')) {
      fetchPromises.push(this.getOrderTasks(filters));
    }
    
    if (typesToFetch.includes('workflow')) {
      fetchPromises.push(this.getWorkflowTasks(filters));
    }
    
    if (typesToFetch.includes('line_item') && filters?.showLineItems) {
      fetchPromises.push(this.getLineItemTasks(filters));
    }
    
    if (typesToFetch.includes('vetted_sites_request')) {
      fetchPromises.push(this.getVettedSitesRequestTasks(filters));
    }
    
    if (typesToFetch.includes('brand_intelligence')) {
      fetchPromises.push(this.getBrandIntelligenceTasks(filters));
    }

    // Execute fetches in parallel
    const results = await Promise.all(fetchPromises);
    
    // Flatten results into tasks array
    for (const result of results) {
      tasks.push(...result);
    }

    // Apply search filter if provided
    const filteredTasks = filters?.searchQuery 
      ? this.filterBySearch(tasks, filters.searchQuery)
      : tasks;

    // Sort by deadline
    const sortedTasks = sortTasksByDeadline(filteredTasks);

    // Calculate stats (before pagination, to show total counts)
    const stats = this.calculateStats(sortedTasks);

    // Apply pagination if requested
    let paginatedTasks = sortedTasks;
    let paginationInfo = undefined;
    
    if (filters?.page && filters?.limit) {
      const page = filters.page;
      const limit = filters.limit;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      paginatedTasks = sortedTasks.slice(start, end);
      
      paginationInfo = {
        page,
        limit,
        total: sortedTasks.length,
        totalPages: Math.ceil(sortedTasks.length / limit),
        hasNext: end < sortedTasks.length,
        hasPrevious: page > 1
      };
    }

    // Group tasks if needed (using paginated results)
    const groupedTasks = this.groupTasksByDeadline(paginatedTasks);

    return {
      tasks: paginatedTasks,
      stats,
      groupedTasks,
      pagination: paginationInfo
    };
  }

  /**
   * Get tasks for a specific user
   */
  async getUserTasks(userId: string, filters?: TaskFilters): Promise<TasksResponse> {
    const userFilters: TaskFilters = {
      ...filters,
      assignedTo: [userId]
    };
    return this.getTasks(userFilters);
  }

  /**
   * Get order tasks
   */
  private async getOrderTasks(filters?: TaskFilters): Promise<OrderTask[]> {
    const query = db
      .select({
        order: orders,
        account: accounts,
        assignedUser: users,
        lineItemCount: sql<number>`COUNT(DISTINCT ${orderLineItems.id})`.as('line_item_count'),
        completedLineItems: sql<number>`COUNT(DISTINCT CASE WHEN ${orderLineItems.status} = 'completed' THEN ${orderLineItems.id} END)`.as('completed_items')
      })
      .from(orders)
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
      .leftJoin(users, eq(orders.assignedTo, users.id))
      .leftJoin(orderLineItems, eq(orderLineItems.orderId, orders.id))
      .groupBy(orders.id, accounts.id, users.id);

    // Apply filters
    const conditions = [];

    if (filters?.assignedTo?.length) {
      if (filters.assignedTo.includes('unassigned')) {
        conditions.push(isNull(orders.assignedTo));
      } else {
        conditions.push(inArray(orders.assignedTo, filters.assignedTo));
      }
    }

    if (filters?.statuses?.length) {
      // Map task statuses back to order statuses
      const orderStatuses = this.getOrderStatusesForTaskStatuses(filters.statuses);
      if (orderStatuses.length > 0) {
        conditions.push(inArray(orders.status, orderStatuses as any));
      }
    }

    if (filters?.clients?.length) {
      // Map client IDs to account IDs if needed
      conditions.push(inArray(orders.accountId, filters.clients));
    }

    if (filters?.accounts?.length) {
      // Filter by account IDs
      conditions.push(inArray(orders.accountId, filters.accounts));
    }

    if (filters?.dateRange) {
      if (filters.dateRange.start) {
        conditions.push(gte(orders.expectedDeliveryDate, filters.dateRange.start));
      }
      if (filters.dateRange.end) {
        conditions.push(lte(orders.expectedDeliveryDate, filters.dateRange.end));
      }
    }

    // Filter out completed/cancelled orders unless specifically requested
    if (!filters?.statuses || filters.statuses.length === 0) {
      conditions.push(
        and(
          sql`${orders.status} NOT IN ('completed', 'cancelled', 'refunded')`,
          sql`${orders.status} IS NOT NULL`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await (whereClause ? query.where(whereClause) : query);

    return results.map(row => ({
      id: `order-${row.order.id}`,
      type: 'order' as const,
      orderId: row.order.id,
      orderNumber: `#${row.order.id.slice(0, 8)}`,
      title: `Order #${row.order.id.slice(0, 8)}`,
      description: row.order.internalNotes,
      deadline: row.order.expectedDeliveryDate,
      assignedTo: row.assignedUser ? {
        id: row.assignedUser.id,
        name: row.assignedUser.name,
        email: row.assignedUser.email
      } : null,
      client: row.account ? {
        id: row.account.id,
        name: row.account.companyName || row.account.contactName,
        companyName: row.account.companyName
      } : null,
      status: this.mapOrderStatus(row.order.status),
      state: row.order.state,
      priority: row.order.rushDelivery ? 'high' : 'normal',
      lineItemCount: Number(row.lineItemCount) || 0,
      completedLineItems: Number(row.completedLineItems) || 0,
      totalValue: row.order.totalRetail,
      expectedDeliveryDate: row.order.expectedDeliveryDate,
      createdAt: row.order.createdAt,
      updatedAt: row.order.updatedAt,
      action: `/orders/${row.order.id}`
    }));
  }

  /**
   * Get workflow tasks
   */
  private async getWorkflowTasks(filters?: TaskFilters): Promise<WorkflowTask[]> {
    const query = db
      .select({
        workflow: workflows,
        client: clients,
        assignedUser: users,
        lineItem: orderLineItems,
        order: orders,
        account: accounts
      })
      .from(workflows)
      .leftJoin(clients, eq(workflows.clientId, clients.id))
      .leftJoin(users, eq(workflows.assignedUserId, users.id))
      .leftJoin(orderLineItems, eq(orderLineItems.workflowId, workflows.id))
      .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
      .leftJoin(accounts, eq(orders.accountId, accounts.id));

    // Apply filters
    const conditions = [];

    if (filters?.assignedTo?.length) {
      if (filters.assignedTo.includes('unassigned')) {
        conditions.push(isNull(workflows.assignedUserId));
      } else {
        conditions.push(inArray(workflows.assignedUserId, filters.assignedTo));
      }
    }

    if (filters?.statuses?.length) {
      // Map task statuses back to workflow statuses
      const workflowStatuses = this.getWorkflowStatusesForTaskStatuses(filters.statuses);
      if (workflowStatuses.length > 0) {
        conditions.push(inArray(workflows.status, workflowStatuses as any));
      }
    }

    if (filters?.clients?.length) {
      conditions.push(inArray(workflows.clientId, filters.clients));
    }

    if (filters?.accounts?.length) {
      // Filter by account IDs via client relationship
      conditions.push(inArray(clients.accountId, filters.accounts));
    }

    if (filters?.dateRange) {
      // Use estimatedCompletionDate for workflows
      if (filters.dateRange.start || filters.dateRange.end) {
        const deadlineConditions = [];
        
        if (filters.dateRange.start) {
          deadlineConditions.push(
            gte(workflows.estimatedCompletionDate, filters.dateRange.start)
          );
        }
        
        if (filters.dateRange.end) {
          deadlineConditions.push(
            lte(workflows.estimatedCompletionDate, filters.dateRange.end)
          );
        }
        
        conditions.push(...deadlineConditions);
      }
    }

    // Filter out completed workflows unless specifically requested
    if (!filters?.statuses || filters.statuses.length === 0) {
      conditions.push(
        sql`${workflows.status} NOT IN ('published', 'archived')`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await (whereClause ? query.where(whereClause) : query);

    return results.map((row, index) => {
      // Parse workflow content to extract rich data
      const workflowContent = row.workflow.content as any;
      
      
      // Extract rich data from workflow content based on ACTUAL API response structure
      const steps = workflowContent?.steps || [];
      
      // Extract guest post site from domain-selection step (step 0)
      let guestPostSite = null;
      const domainSelectionStep = steps.find((step: any) => step.id === 'domain-selection');
      if (domainSelectionStep?.outputs?.domain) {
        guestPostSite = domainSelectionStep.outputs.domain;
      }
      
      // Extract client info from root workflow content (already working)
      const clientSite = (workflowContent?.clientUrl && workflowContent.clientUrl.trim()) || null;
      const clientName = (workflowContent?.clientName && workflowContent.clientName.trim()) || null;
      
      // Extract article title from topic-generation step (step 2)
      let articleTitle = null;
      const topicGenerationStep = steps.find((step: any) => step.id === 'topic-generation');
      if (topicGenerationStep?.outputs?.postTitle) {
        articleTitle = topicGenerationStep.outputs.postTitle;
      }
      
      // Try to find published article URL from final steps
      let publishedArticleUrl = null;
      const contentAuditStep = steps.find((step: any) => step.id === 'content-audit');
      if (contentAuditStep?.outputs?.publishedUrl) {
        publishedArticleUrl = contentAuditStep.outputs.publishedUrl;
      }
      
      // Find Google URL from steps if available
      let googleUrl = null;
      for (const step of steps) {
        if (step.outputs?.googleUrl) {
          googleUrl = step.outputs.googleUrl;
          break;
          // For now, skip this complexity
        }
      }
      
      return {
        id: `workflow-${row.workflow.id}`,
        type: 'workflow' as const,
        workflowId: row.workflow.id,
        workflowTitle: row.workflow.title || 'Untitled Workflow',
        title: row.workflow.title || 'Untitled Workflow',
        description: articleTitle || null,
        deadline: row.workflow.estimatedCompletionDate,
        assignedTo: row.assignedUser ? {
          id: row.assignedUser.id,
          name: row.assignedUser.name,
          email: row.assignedUser.email
        } : null,
        client: row.client ? {
          id: row.client.id,
          name: row.client.name
        } : null,
        status: this.mapWorkflowStatus(row.workflow.status),
        priority: 'normal' as const,
        completionPercentage: Number(row.workflow.completionPercentage) || 0,
        estimatedCompletionDate: row.workflow.estimatedCompletionDate,
        publishDeadline: null,
        publisher: row.workflow.publisherEmail,
        // Enhanced workflow-specific fields
        guestPostSite: guestPostSite,
        clientSite: clientSite,
        clientName: clientName,
        articleTitle: articleTitle,
        publishedArticleUrl: publishedArticleUrl,
        workflowContent: workflowContent, // Include full content for additional data
        
        // Order metadata for proper grouping
        metadata: row.order ? {
          orderId: row.order.id,
          orderNumber: `#${row.order.id.slice(0, 8)}`,
          lineItemId: row.lineItem?.id,
          accountName: row.account?.companyName || row.account?.contactName || 'Unknown Account',
          clientName: row.client?.name || 'Unknown Client'
        } : null,
        
        createdAt: row.workflow.createdAt,
        updatedAt: row.workflow.updatedAt,
        action: `/workflow/${row.workflow.id}`
      };
    });
  }

  /**
   * Get order line item tasks
   */
  private async getLineItemTasks(filters?: TaskFilters): Promise<LineItemTask[]> {
    const query = db
      .select({
        lineItem: orderLineItems,
        order: orders,
        client: clients,
        assignedUser: users,
        workflow: workflows
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orderLineItems.orderId, orders.id))
      .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
      .leftJoin(users, eq(orderLineItems.assignedTo, users.id))
      .leftJoin(workflows, eq(orderLineItems.workflowId, workflows.id));

    // Apply filters
    const conditions = [];
    

    if (filters?.assignedTo?.length) {
      if (filters.assignedTo.includes('unassigned')) {
        conditions.push(isNull(orderLineItems.assignedTo));
      } else {
        conditions.push(inArray(orderLineItems.assignedTo, filters.assignedTo));
      }
    }

    if (filters?.statuses?.length) {
      // Map task statuses to line item statuses
      const lineItemStatuses = this.getLineItemStatusesForTaskStatuses(filters.statuses);
      if (lineItemStatuses.length > 0) {
        conditions.push(inArray(orderLineItems.status, lineItemStatuses as any));
      }
    }

    if (filters?.clients?.length) {
      conditions.push(inArray(orderLineItems.clientId, filters.clients));
    }

    if (filters?.accounts?.length) {
      // Filter by account IDs via client relationship
      conditions.push(inArray(clients.accountId, filters.accounts));
    }

    if (filters?.orders?.length) {
      conditions.push(inArray(orderLineItems.orderId, filters.orders));
    }

    if (filters?.dateRange) {
      // Line items inherit deadline from parent order
      if (filters.dateRange.start) {
        conditions.push(gte(orders.expectedDeliveryDate, filters.dateRange.start));
      }
      if (filters.dateRange.end) {
        conditions.push(lte(orders.expectedDeliveryDate, filters.dateRange.end));
      }
    }

    // Filter out completed line items unless specifically requested
    if (!filters?.statuses || filters.statuses.length === 0) {
      conditions.push(
        sql`${orderLineItems.status} NOT IN ('completed', 'cancelled', 'refunded')`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await (whereClause ? query.where(whereClause) : query);

    return results.map(row => ({
      id: `lineitem-${row.lineItem.id}`,
      type: 'line_item' as const,
      lineItemId: row.lineItem.id,
      parentOrderId: row.order.id,
      parentOrderNumber: `#${row.order.id.slice(0, 8)}`,
      title: `${row.lineItem.assignedDomain || 'Unassigned'} - ${row.client?.name || 'Unknown Client'}`,
      description: row.lineItem.anchorText || row.lineItem.targetPageUrl,
      deadline: row.order.expectedDeliveryDate, // Inherit from order
      assignedTo: row.assignedUser ? {
        id: row.assignedUser.id,
        name: row.assignedUser.name,
        email: row.assignedUser.email
      } : null,
      client: row.client ? {
        id: row.client.id,
        name: row.client.name
      } : null,
      status: this.mapLineItemStatus(row.lineItem.status),
      priority: row.order.rushDelivery ? 'high' : 'normal',
      targetUrl: row.lineItem.targetPageUrl,
      assignedDomain: row.lineItem.assignedDomain,
      anchorText: row.lineItem.anchorText,
      workflowStatus: row.workflow?.status,
      workflowId: row.lineItem.workflowId,
      publishedUrl: row.lineItem.publishedUrl,
      createdAt: row.lineItem.addedAt,
      updatedAt: row.lineItem.modifiedAt,
      action: `/orders/${row.order.id}/line-items/${row.lineItem.id}`
    }));
  }

  private async getVettedSitesRequestTasks(filters?: TaskFilters): Promise<UnifiedTask[]> {
    // Import the schema at the top if not already imported
    const { vettedSitesRequests } = await import('@/lib/db/vettedSitesRequestSchema');
    
    // Use aliases for multiple joins on same table
    const assignedUser = aliasedTable(users, 'assigned_user');
    const creatorUser = aliasedTable(users, 'creator_user');
    
    const query = db
      .select({
        request: vettedSitesRequests,
        assignedUser: assignedUser,
        creatorUser: {
          id: creatorUser.id,
          name: creatorUser.name,
          email: creatorUser.email
        }
      })
      .from(vettedSitesRequests)
      .leftJoin(assignedUser, eq(vettedSitesRequests.fulfilledBy, assignedUser.id))
      .leftJoin(creatorUser, eq(vettedSitesRequests.createdByUser, creatorUser.id));

    // Apply filters
    const conditions = [];
    
    if (filters?.assignedTo?.length) {
      if (filters.assignedTo.includes('unassigned')) {
        conditions.push(isNull(vettedSitesRequests.fulfilledBy));
      } else {
        conditions.push(inArray(vettedSitesRequests.fulfilledBy, filters.assignedTo));
      }
    }

    if (filters?.statuses?.length) {
      const requestStatuses = this.getVettedSitesStatusesForTaskStatuses(filters.statuses);
      if (requestStatuses.length > 0) {
        conditions.push(inArray(vettedSitesRequests.status, requestStatuses as any));
      }
    }

    // Only show approved requests that need fulfillment
    if (!filters?.statuses || filters.statuses.length === 0) {
      conditions.push(eq(vettedSitesRequests.status, 'approved'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await (whereClause ? query.where(whereClause) : query);

    return results.map(row => ({
      id: `vetted_request-${row.request.id}`,
      type: 'vetted_sites_request' as const,
      requestId: row.request.id,
      title: `Vetted Sites Request - ${row.request.targetUrls?.length || 0} URLs`,
      description: row.request.notes || `Request for ${row.request.targetUrls?.length || 0} target URLs`,
      deadline: row.request.reviewedAt ? new Date(new Date(row.request.reviewedAt).getTime() + (7 * 24 * 60 * 60 * 1000)) : new Date(), // 7 days from approval
      assignedTo: row.assignedUser ? {
        id: row.assignedUser.id,
        name: row.assignedUser.name,
        email: row.assignedUser.email
      } : null,
      client: null, // Vetted sites requests may not have a specific client
      status: this.mapVettedSitesStatus(row.request.status),
      priority: 'normal',
      targetUrls: row.request.targetUrls,
      requestStatus: row.request.status,
      submittedAt: row.request.createdAt,
      reviewedAt: row.request.reviewedAt,
      createdAt: row.request.createdAt,
      updatedAt: row.request.updatedAt,
      createdByUserName: row.creatorUser?.name || null,
      createdByUserEmail: row.creatorUser?.email || null,
      action: `/internal/vetted-sites/requests/${row.request.id}`
    }));
  }

  private async getBrandIntelligenceTasks(filters?: TaskFilters): Promise<UnifiedTask[]> {
    // Import the schema at the top if not already imported  
    const { clientBrandIntelligence } = await import('@/lib/db/schema');
    
    const query = db
      .select({
        intelligence: clientBrandIntelligence,
        client: clients,
        assignedUser: users
      })
      .from(clientBrandIntelligence)
      .innerJoin(clients, eq(clientBrandIntelligence.clientId, clients.id))
      .leftJoin(users, eq(clientBrandIntelligence.assignedTo, users.id));

    // Apply filters
    const conditions = [];
    
    if (filters?.assignedTo?.length) {
      if (filters.assignedTo.includes('unassigned')) {
        conditions.push(isNull(clientBrandIntelligence.assignedTo));
      } else {
        conditions.push(inArray(clientBrandIntelligence.assignedTo, filters.assignedTo));
      }
    }

    if (filters?.statuses?.length) {
      const intelligenceStatuses = this.getBrandIntelligenceStatusesForTaskStatuses(filters.statuses);
      if (intelligenceStatuses.length > 0) {
        conditions.push(
          or(
            inArray(clientBrandIntelligence.researchStatus, intelligenceStatuses as any),
            inArray(clientBrandIntelligence.briefStatus, intelligenceStatuses as any)
          )
        );
      }
    }

    if (filters?.clients?.length) {
      conditions.push(inArray(clientBrandIntelligence.clientId, filters.clients));
    }

    // Only show non-completed brand intelligence
    if (!filters?.statuses || filters.statuses.length === 0) {
      conditions.push(
        or(
          sql`${clientBrandIntelligence.researchStatus} != 'completed'`,
          sql`${clientBrandIntelligence.briefStatus} != 'completed'`,
          and(
            eq(clientBrandIntelligence.researchStatus, 'completed'),
            isNull(clientBrandIntelligence.clientInput)
          )
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await (whereClause ? query.where(whereClause) : query);

    return results.map(row => ({
      id: `brand_intelligence-${row.intelligence.id}`,
      type: 'brand_intelligence' as const,
      intelligenceId: row.intelligence.id,
      title: `Brand Intelligence - ${row.client.name}`,
      description: this.getBrandIntelligenceDescription(row.intelligence),
      deadline: this.getBrandIntelligenceDeadline(row.intelligence),
      assignedTo: row.assignedUser ? {
        id: row.assignedUser.id,
        name: row.assignedUser.name,
        email: row.assignedUser.email
      } : null,
      client: {
        id: row.client.id,
        name: row.client.name
      },
      status: this.mapBrandIntelligenceStatus(row.intelligence),
      priority: 'normal',
      researchStatus: row.intelligence.researchStatus,
      briefStatus: row.intelligence.briefStatus,
      hasClientInput: !!row.intelligence.clientInput,
      createdAt: row.intelligence.createdAt,
      updatedAt: row.intelligence.updatedAt,
      action: `/clients/${row.client.id}/brand-intelligence`
    }));
  }

  /**
   * Get workflow statuses that map to given task statuses
   */
  private getWorkflowStatusesForTaskStatuses(taskStatuses: TaskStatus[]): string[] {
    const reverseMap: Record<TaskStatus, string[]> = {
      'pending': ['draft'],
      'in_progress': ['active', 'in_progress', 'review', 'approved'],
      'completed': ['published', 'completed'],
      'blocked': ['rejected'],
      'cancelled': ['cancelled', 'deleted']
    };
    
    const workflowStatuses = new Set<string>();
    for (const taskStatus of taskStatuses) {
      const mapped = reverseMap[taskStatus] || [];
      mapped.forEach(s => workflowStatuses.add(s));
    }
    
    return Array.from(workflowStatuses);
  }

  /**
   * Get order statuses that map to given task statuses
   */
  private getOrderStatusesForTaskStatuses(taskStatuses: TaskStatus[]): string[] {
    const reverseMap: Record<TaskStatus, string[]> = {
      'pending': ['draft', 'pending'],
      'in_progress': ['confirmed', 'paid', 'processing', 'partially_fulfilled'],
      'completed': ['fulfilled', 'completed'],
      'blocked': ['on_hold'],
      'cancelled': ['cancelled', 'refunded']
    };
    
    const orderStatuses = new Set<string>();
    for (const taskStatus of taskStatuses) {
      const mapped = reverseMap[taskStatus] || [];
      mapped.forEach(s => orderStatuses.add(s));
    }
    
    return Array.from(orderStatuses);
  }

  /**
   * Map order status to task status
   */
  private mapOrderStatus(orderStatus: string | null): TaskStatus {
    if (!orderStatus) return 'pending';
    
    const statusMap: Record<string, TaskStatus> = {
      'draft': 'pending',
      'pending': 'pending',
      'confirmed': 'in_progress',
      'paid': 'in_progress',
      'processing': 'in_progress',
      'partially_fulfilled': 'in_progress',
      'fulfilled': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'on_hold': 'blocked'
    };
    
    return statusMap[orderStatus] || 'pending';
  }

  /**
   * Map workflow status to task status
   */
  private mapWorkflowStatus(workflowStatus: string | null): TaskStatus {
    if (!workflowStatus) return 'pending';
    
    const statusMap: Record<string, TaskStatus> = {
      'draft': 'pending',
      'active': 'in_progress',
      'in_progress': 'in_progress',
      'review': 'in_progress',
      'approved': 'in_progress',
      'published': 'completed',
      'archived': 'completed',
      'paused': 'blocked'
    };
    
    return statusMap[workflowStatus] || 'pending';
  }

  /**
   * Get line item statuses that map to given task statuses
   */
  private getLineItemStatusesForTaskStatuses(taskStatuses: TaskStatus[]): string[] {
    const reverseMap: Record<TaskStatus, string[]> = {
      'pending': ['draft', 'pending', 'pending_selection', 'selected'],
      'in_progress': ['assigned', 'invoiced', 'approved', 'in_progress'],
      'completed': ['delivered', 'completed'],
      'blocked': ['disputed'],
      'cancelled': ['cancelled', 'refunded']
    };
    
    const lineItemStatuses = new Set<string>();
    for (const taskStatus of taskStatuses) {
      const mapped = reverseMap[taskStatus] || [];
      mapped.forEach(s => lineItemStatuses.add(s));
    }
    
    return Array.from(lineItemStatuses);
  }

  /**
   * Map line item status to task status
   */
  private mapLineItemStatus(lineItemStatus: string | null): TaskStatus {
    if (!lineItemStatus) return 'pending';
    
    const statusMap: Record<string, TaskStatus> = {
      'draft': 'pending',
      'pending': 'pending',
      'pending_selection': 'pending',
      'selected': 'pending',
      'assigned': 'in_progress',
      'invoiced': 'in_progress',
      'approved': 'in_progress',
      'in_progress': 'in_progress',
      'delivered': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'disputed': 'blocked'
    };
    
    return statusMap[lineItemStatus] || 'pending';
  }

  /**
   * Get vetted sites request statuses that map to given task statuses
   */
  private getVettedSitesStatusesForTaskStatuses(taskStatuses: TaskStatus[]): string[] {
    const reverseMap: Record<TaskStatus, string[]> = {
      'pending': ['submitted', 'under_review'],
      'in_progress': ['approved'],
      'completed': ['fulfilled'],
      'blocked': ['rejected'],
      'cancelled': ['expired']
    };
    
    const requestStatuses = new Set<string>();
    for (const taskStatus of taskStatuses) {
      const mapped = reverseMap[taskStatus] || [];
      mapped.forEach(s => requestStatuses.add(s));
    }
    
    return Array.from(requestStatuses);
  }

  /**
   * Map vetted sites request status to task status
   */
  private mapVettedSitesStatus(requestStatus: string | null): TaskStatus {
    if (!requestStatus) return 'pending';
    
    const statusMap: Record<string, TaskStatus> = {
      'submitted': 'pending',
      'under_review': 'pending',
      'approved': 'in_progress',
      'fulfilled': 'completed',
      'rejected': 'blocked',
      'expired': 'cancelled'
    };
    
    return statusMap[requestStatus] || 'pending';
  }

  /**
   * Get brand intelligence statuses that map to given task statuses
   */
  private getBrandIntelligenceStatusesForTaskStatuses(taskStatuses: TaskStatus[]): string[] {
    const statusesToCheck = new Set<string>();
    
    for (const taskStatus of taskStatuses) {
      switch (taskStatus) {
        case 'pending':
          statusesToCheck.add('idle');
          statusesToCheck.add('queued');
          break;
        case 'in_progress':
          statusesToCheck.add('in_progress');
          break;
        case 'completed':
          statusesToCheck.add('completed');
          break;
        case 'blocked':
          statusesToCheck.add('error');
          break;
      }
    }
    
    return Array.from(statusesToCheck);
  }

  /**
   * Map brand intelligence status to task status based on workflow phase
   */
  private mapBrandIntelligenceStatus(intelligence: any): TaskStatus {
    // Handle research phase
    if (intelligence.researchStatus === 'error' || intelligence.briefStatus === 'error') {
      return 'blocked';
    }
    
    if (intelligence.researchStatus === 'in_progress') {
      return 'in_progress';
    }
    
    // Research completed, waiting for client input
    if (intelligence.researchStatus === 'completed' && !intelligence.clientInput) {
      return 'pending';
    }
    
    // Client input received, brief generation in progress
    if (intelligence.clientInput && intelligence.briefStatus === 'in_progress') {
      return 'in_progress';
    }
    
    // Brief completed
    if (intelligence.briefStatus === 'completed') {
      return 'completed';
    }
    
    // Default: initial state
    return 'pending';
  }

  /**
   * Get brand intelligence description based on current phase
   */
  private getBrandIntelligenceDescription(intelligence: any): string {
    if (intelligence.researchStatus === 'error') {
      return 'Research phase failed - needs attention';
    }
    
    if (intelligence.researchStatus === 'in_progress') {
      return 'AI research in progress...';
    }
    
    if (intelligence.researchStatus === 'completed' && !intelligence.clientInput) {
      return 'Waiting for client input on research findings';
    }
    
    if (intelligence.clientInput && intelligence.briefStatus !== 'completed') {
      return 'Client input received - generating final brief';
    }
    
    if (intelligence.briefStatus === 'completed') {
      return 'Brand intelligence brief completed';
    }
    
    if (intelligence.briefStatus === 'error') {
      return 'Brief generation failed - needs attention';
    }
    
    return 'Brand intelligence workflow starting';
  }

  /**
   * Get brand intelligence deadline based on current phase
   */
  private getBrandIntelligenceDeadline(intelligence: any): Date {
    const now = new Date();
    
    // If research is in progress, deadline is 1 day from start
    if (intelligence.researchStatus === 'in_progress' && intelligence.researchStartedAt) {
      return new Date(new Date(intelligence.researchStartedAt).getTime() + (1 * 24 * 60 * 60 * 1000));
    }
    
    // If waiting for client input, deadline is 7 days from research completion
    if (intelligence.researchStatus === 'completed' && !intelligence.clientInput && intelligence.researchCompletedAt) {
      return new Date(new Date(intelligence.researchCompletedAt).getTime() + (7 * 24 * 60 * 60 * 1000));
    }
    
    // If client input received and brief generation in progress, deadline is 1 day from input
    if (intelligence.clientInput && intelligence.briefStatus !== 'completed' && intelligence.clientInputAt) {
      return new Date(new Date(intelligence.clientInputAt).getTime() + (1 * 24 * 60 * 60 * 1000));
    }
    
    // Default: 3 days from creation
    return new Date(new Date(intelligence.createdAt).getTime() + (3 * 24 * 60 * 60 * 1000));
  }

  /**
   * Filter tasks by search query
   */
  private filterBySearch(tasks: UnifiedTask[], searchQuery: string): UnifiedTask[] {
    const query = searchQuery.toLowerCase();
    
    return tasks.filter(task => {
      // Search in title and description
      if (task.title.toLowerCase().includes(query)) return true;
      if (task.description?.toLowerCase().includes(query)) return true;
      
      // Search in client name
      if (task.type === 'order' || task.type === 'workflow' || task.type === 'line_item') {
        const clientTask = task as OrderTask | WorkflowTask | LineItemTask;
        if (clientTask.client?.name?.toLowerCase().includes(query)) return true;
        if (clientTask.client?.companyName?.toLowerCase().includes(query)) return true;
      }
      
      // Search in specific fields
      if (task.type === 'order') {
        const orderTask = task as OrderTask;
        if (orderTask.orderNumber?.toLowerCase().includes(query)) return true;
      }
      
      if (task.type === 'workflow') {
        const workflowTask = task as WorkflowTask;
        if (workflowTask.workflowTitle.toLowerCase().includes(query)) return true;
        if (workflowTask.publisher?.toLowerCase().includes(query)) return true;
      }
      
      if (task.type === 'line_item') {
        const lineItemTask = task as LineItemTask;
        if (lineItemTask.targetUrl?.toLowerCase().includes(query)) return true;
        if (lineItemTask.assignedDomain?.toLowerCase().includes(query)) return true;
        if (lineItemTask.anchorText?.toLowerCase().includes(query)) return true;
        // Also search by parent order ID
        if (lineItemTask.parentOrderId?.toLowerCase().includes(query)) return true;
        if (lineItemTask.parentOrderNumber?.toLowerCase().includes(query)) return true;
      }
      
      return false;
    });
  }

  /**
   * Calculate task statistics
   */
  private calculateStats(tasks: UnifiedTask[]): TaskStats {
    const now = new Date();
    
    const stats: TaskStats = {
      total: tasks.length,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      upcoming: 0,
      noDueDate: 0,
      byStatus: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        blocked: 0,
        cancelled: 0
      },
      byType: {
        order: 0,
        workflow: 0,
        line_item: 0,
        vetted_sites_request: 0,
        brand_intelligence: 0
      }
    };

    tasks.forEach(task => {
      // Deadline categories
      if (!task.deadline) {
        stats.noDueDate++;
      } else if (isOverdue(task.deadline)) {
        stats.overdue++;
      } else if (isDueToday(task.deadline)) {
        stats.dueToday++;
      } else if (isDueThisWeek(task.deadline)) {
        stats.dueThisWeek++;
      } else {
        stats.upcoming++;
      }

      // Status counts
      stats.byStatus[task.status]++;

      // Type counts - safely increment with fallback
      if (stats.byType.hasOwnProperty(task.type)) {
        stats.byType[task.type]++;
      } else {
        // Handle any new task types that might not be in the initial stats object
        (stats.byType as any)[task.type] = ((stats.byType as any)[task.type] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Group tasks by deadline
   */
  private groupTasksByDeadline(tasks: UnifiedTask[]): GroupedTasks {
    const grouped: GroupedTasks = {
      overdue: [],
      dueToday: [],
      dueThisWeek: [],
      upcoming: [],
      noDueDate: []
    };

    tasks.forEach(task => {
      if (!task.deadline) {
        grouped.noDueDate.push(task);
      } else if (isOverdue(task.deadline)) {
        grouped.overdue.push(task);
      } else if (isDueToday(task.deadline)) {
        grouped.dueToday.push(task);
      } else if (isDueThisWeek(task.deadline)) {
        grouped.dueThisWeek.push(task);
      } else {
        grouped.upcoming.push(task);
      }
    });

    return grouped;
  }

  /**
   * Assign a task to a user
   */
  async assignTask(
    entityType: 'order' | 'workflow' | 'line_item' | 'vetted_sites_request' | 'brand_intelligence',
    entityId: string,
    userId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      switch (entityType) {
        case 'order':
          await db
            .update(orders)
            .set({ 
              assignedTo: userId,
              internalNotes: notes ? sql`COALESCE(${orders.internalNotes}, '') || E'\n' || ${notes}` : undefined,
              updatedAt: new Date()
            })
            .where(eq(orders.id, entityId));
          break;

        case 'workflow':
          await db
            .update(workflows)
            .set({ 
              assignedUserId: userId,
              updatedAt: new Date()
            })
            .where(eq(workflows.id, entityId));
          break;

        case 'line_item':
          await db
            .update(orderLineItems)
            .set({ 
              assignedTo: userId,
              assignedAt: new Date(),
              assignmentNotes: notes,
              modifiedAt: new Date()
            })
            .where(eq(orderLineItems.id, entityId));
          break;

        case 'vetted_sites_request':
          await db
            .update(vettedSitesRequests)
            .set({
              fulfilledBy: userId,
              updatedAt: new Date()
            })
            .where(eq(vettedSitesRequests.id, entityId));
          break;

        case 'brand_intelligence':
          await db
            .update(clientBrandIntelligence)
            .set({
              assignedTo: userId,
              assignedAt: new Date(),
              assignmentNotes: notes,
              updatedAt: new Date()
            })
            .where(eq(clientBrandIntelligence.id, entityId));
          break;
      }

      return true;
    } catch (error) {
      console.error('Error assigning task:', error);
      return false;
    }
  }

  /**
   * Bulk assign tasks
   */
  async bulkAssignTasks(
    entityType: 'order' | 'workflow' | 'line_item' | 'vetted_sites_request' | 'brand_intelligence',
    entityIds: string[],
    userId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      switch (entityType) {
        case 'order':
          await db
            .update(orders)
            .set({ 
              assignedTo: userId,
              internalNotes: notes ? sql`COALESCE(${orders.internalNotes}, '') || E'\n' || ${notes}` : undefined,
              updatedAt: new Date()
            })
            .where(inArray(orders.id, entityIds));
          break;

        case 'workflow':
          await db
            .update(workflows)
            .set({ 
              assignedUserId: userId,
              updatedAt: new Date()
            })
            .where(inArray(workflows.id, entityIds));
          break;

        case 'line_item':
          await db
            .update(orderLineItems)
            .set({ 
              assignedTo: userId,
              assignedAt: new Date(),
              assignmentNotes: notes,
              modifiedAt: new Date()
            })
            .where(inArray(orderLineItems.id, entityIds));
          break;

        case 'vetted_sites_request':
          await db
            .update(vettedSitesRequests)
            .set({
              fulfilledBy: userId,
              updatedAt: new Date()
            })
            .where(inArray(vettedSitesRequests.id, entityIds));
          break;

        case 'brand_intelligence':
          await db
            .update(clientBrandIntelligence)
            .set({
              assignedTo: userId,
              assignedAt: new Date(),
              assignmentNotes: notes,
              updatedAt: new Date()
            })
            .where(inArray(clientBrandIntelligence.id, entityIds));
          break;
      }

      return true;
    } catch (error) {
      console.error('Error bulk assigning tasks:', error);
      return false;
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();