/**
 * Task Service
 * Aggregates deadline-driven work from multiple sources into a unified task interface
 */

import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { workflows } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { users } from '@/lib/db/schema';
import { eq, and, or, sql, isNull, inArray, gte, lte, desc, asc } from 'drizzle-orm';
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
      : ['order', 'workflow', 'line_item'] as TaskType[];
    
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
        assignedUser: users
      })
      .from(workflows)
      .leftJoin(clients, eq(workflows.clientId, clients.id))
      .leftJoin(users, eq(workflows.assignedUserId, users.id));

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

    return results.map(row => ({
      id: `workflow-${row.workflow.id}`,
      type: 'workflow' as const,
      workflowId: row.workflow.id,
      workflowTitle: row.workflow.title || 'Untitled Workflow',
      title: row.workflow.title || 'Untitled Workflow',
      description: null, // Field doesn't exist in current schema
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
      publishDeadline: null, // Field doesn't exist in current schema
      publisher: row.workflow.publisherEmail,
      createdAt: row.workflow.createdAt,
      updatedAt: row.workflow.updatedAt,
      action: `/workflows/${row.workflow.id}`
    }));
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
      conditions.push(inArray(orderLineItems.status, filters.statuses as any));
    }

    if (filters?.clients?.length) {
      conditions.push(inArray(orderLineItems.clientId, filters.clients));
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
        line_item: 0
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

      // Type counts
      stats.byType[task.type]++;
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
    entityType: 'order' | 'workflow' | 'line_item',
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
    entityType: 'order' | 'workflow' | 'line_item',
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